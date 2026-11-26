import hashlib
import logging
import re
import time
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from urllib.parse import urlencode
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from app.core.config import (
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
)

logger = logging.getLogger("uvicorn.error")

MAX_KYC_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
SIGNED_VIEW_TTL_SECONDS = 3600  # URL xem ảnh dành cho chính chủ có hiệu lực 60 phút

ALLOWED_IMAGE_SIGNATURES: Dict[str, Tuple[str, bytes]] = {
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
    ".webp": ("image/webp", b"RIFF"),
}


def _matches_magic_bytes(extension: str, content: bytes) -> bool:
    _, signature = ALLOWED_IMAGE_SIGNATURES[extension]
    if extension == ".webp":
        return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return content.startswith(signature)


async def validate_kyc_image(file: Optional[UploadFile], field_label: str = "Ảnh giấy tờ") -> Tuple[bytes, str, str]:
    """
    Kiểm tra nghiêm ngặt file ảnh giấy tờ định danh (CCCD / GPLX):
    - Phần mở rộng hợp lệ (.jpg, .jpeg, .png, .webp)
    - MIME type khớp định dạng ảnh
    - Magic bytes thực tế của file khớp chữ ký nhị phân (chống giả mạo đuôi file)
    - Dung lượng > 0 và <= 5MB
    """
    if file is None or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_label} không được để trống.",
        )

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_IMAGE_SIGNATURES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_label}: Chỉ chấp nhận định dạng ảnh JPG, JPEG, PNG hoặc WEBP.",
        )

    expected_mime, _ = ALLOWED_IMAGE_SIGNATURES[extension]
    if file.content_type and file.content_type.lower() not in {expected_mime, "application/octet-stream"}:
        if not (expected_mime == "image/jpeg" and file.content_type.lower() == "image/jpg"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_label}: Content-Type '{file.content_type}' không khớp định dạng ảnh.",
            )

    if hasattr(file.file, "getvalue") or getattr(file, "_in_memory", False):
        content = file.file.read()
    else:
        content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_label} rỗng hoặc không hợp lệ.",
        )

    if len(content) > MAX_KYC_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_label} vượt quá dung lượng tối đa 5MB.",
        )

    if not _matches_magic_bytes(extension, content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_label}: Nội dung nhị phân không phải file ảnh hợp lệ.",
        )

    safe_filename = f"{uuid4().hex}{extension}"
    return content, safe_filename, expected_mime


def generate_cloudinary_signature(params: Dict[str, Any], api_secret: str) -> str:
    """
    Tạo chữ ký SHA-1 chuẩn của Cloudinary cho Signed Upload / Private Download / Destroy.
    Chỉ ký phía server, tuyệt đối không lộ CLOUDINARY_API_SECRET ra client.
    """
    filtered = {
        k: ("true" if v is True else ("false" if v is False else str(v)))
        for k, v in params.items()
        if v is not None and v != ""
    }
    to_sign = "&".join(f"{k}={filtered[k]}" for k in sorted(filtered.keys()))
    return hashlib.sha1((to_sign + api_secret).encode("utf-8")).hexdigest()


def upload_kyc_image_to_cloudinary(
    content: bytes,
    filename: str,
    content_type: str,
    user_id: int,
    doc_tag: str,
) -> Dict[str, str]:
    """
    Tải ảnh giấy tờ định danh (CCCD / GPLX) lên Cloudinary qua HTTPS Signed Upload:
    - Lưu tách biệt trong thư mục `kyc/u_{user_id}` trên Cloudinary Media Library
    - Tên file ngẫu nhiên 128-bit (`{doc_tag}_{uuid}`) không thể đoán mò, ký SHA-1 bằng CLOUDINARY_API_SECRET phía server
    - Đảm bảo hiển thị trực tiếp ổn định lâu dài cho chính chủ khi quay lại Hồ sơ (và Admin duyệt KYC)
    """
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chưa cấu hình thông tin kết nối Cloudinary trên máy chủ.",
        )

    timestamp = int(time.time())
    folder = f"kyc/u_{user_id}"
    public_id = f"{doc_tag}_{uuid4().hex}"

    sign_params = {
        "folder": folder,
        "invalidate": "true",
        "overwrite": "true",
        "public_id": public_id,
        "timestamp": str(timestamp),
        "type": "private",
    }
    signature = generate_cloudinary_signature(sign_params, CLOUDINARY_API_SECRET)

    upload_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
    form_data = {
        **sign_params,
        "api_key": CLOUDINARY_API_KEY,
        "signature": signature,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                upload_url,
                data=form_data,
                files={"file": (filename, content, content_type)},
            )
    except httpx.RequestError as exc:
        logger.error("Cloudinary connection error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không thể kết nối tới dịch vụ lưu trữ ảnh Cloudinary.",
        ) from exc

    if response.status_code >= 400:
        err_msg = "Tải ảnh lên Cloudinary thất bại."
        try:
            err_payload = response.json()
            if isinstance(err_payload, dict) and isinstance(err_payload.get("error"), dict):
                err_msg = f"Cloudinary từ chối tải ảnh: {err_payload['error'].get('message', err_msg)}"
        except Exception:
            pass
        logger.warning("Cloudinary upload failed (%s): %s", response.status_code, response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=err_msg,
        )

    payload = response.json()
    secure_url = payload.get("secure_url") or ""
    returned_public_id = payload.get("public_id") or f"{folder}/{public_id}"
    img_format = payload.get("format") or Path(filename).suffix.lstrip(".").lower() or "jpg"

    if not secure_url.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary không trả về đường dẫn HTTPS an toàn.",
        )

    return {
        "secure_url": secure_url,
        "public_id": returned_public_id,
        "format": img_format,
        "view_url": build_viewable_kyc_url(secure_url),
    }


def upload_avatar_to_cloudinary(
    content: bytes,
    filename: str,
    content_type: str,
    user_id: int,
) -> Dict[str, str]:
    """
    Tải ảnh đại diện (avatar) người dùng lên Cloudinary qua HTTPS Signed Upload (`type="upload"`)
    để hiển thị trực tiếp trên thanh điều hướng và trang Hồ sơ của tôi.
    """
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chưa cấu hình thông tin kết nối Cloudinary trên máy chủ.",
        )

    timestamp = int(time.time())
    folder = f"avatars/u_{user_id}"
    public_id = f"avatar_{uuid4().hex[:16]}"

    sign_params = {
        "folder": folder,
        "invalidate": "true",
        "overwrite": "true",
        "public_id": public_id,
        "timestamp": str(timestamp),
    }
    signature = generate_cloudinary_signature(sign_params, CLOUDINARY_API_SECRET)

    upload_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
    form_data = {
        **sign_params,
        "api_key": CLOUDINARY_API_KEY,
        "signature": signature,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                upload_url,
                data=form_data,
                files={"file": (filename, content, content_type)},
            )
    except httpx.RequestError as exc:
        logger.error("Cloudinary avatar connection error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không thể kết nối tới dịch vụ lưu trữ ảnh Cloudinary.",
        ) from exc

    if response.status_code >= 400:
        err_msg = "Tải ảnh đại diện lên Cloudinary thất bại."
        try:
            err_payload = response.json()
            if isinstance(err_payload, dict) and isinstance(err_payload.get("error"), dict):
                err_msg = f"Cloudinary từ chối tải ảnh: {err_payload['error'].get('message', err_msg)}"
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=err_msg,
        )

    payload = response.json()
    secure_url = payload.get("secure_url") or ""
    returned_public_id = payload.get("public_id") or f"{folder}/{public_id}"

    if not secure_url.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary không trả về đường dẫn HTTPS an toàn.",
        )

    return {
        "secure_url": secure_url,
        "public_id": returned_public_id,
    }


def upload_vehicle_image_to_cloudinary(
    content: bytes,
    filename: str,
    content_type: str,
    store_id: int,
) -> Dict[str, str]:
    """Upload a publicly viewable vehicle photo to the store's Cloudinary folder."""
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chưa cấu hình thông tin kết nối Cloudinary trên máy chủ.",
        )

    timestamp = int(time.time())
    folder = f"vehicles/store_{store_id}"
    public_id = f"{uuid4().hex}"
    sign_params = {
        "folder": folder,
        "invalidate": "true",
        "overwrite": "true",
        "public_id": public_id,
        "timestamp": str(timestamp),
    }
    signature = generate_cloudinary_signature(sign_params, CLOUDINARY_API_SECRET)
    upload_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                upload_url,
                data={
                    **sign_params,
                    "api_key": CLOUDINARY_API_KEY,
                    "signature": signature,
                },
                files={"file": (filename, content, content_type)},
            )
    except httpx.RequestError as exc:
        logger.error("Cloudinary vehicle image connection error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Không thể kết nối tới dịch vụ lưu trữ ảnh Cloudinary.",
        ) from exc

    if response.status_code >= 400:
        err_msg = "Tải ảnh xe lên Cloudinary thất bại."
        try:
            err_payload = response.json()
            if isinstance(err_payload, dict) and isinstance(err_payload.get("error"), dict):
                err_msg = f"Cloudinary từ chối tải ảnh: {err_payload['error'].get('message', err_msg)}"
        except Exception:
            pass
        logger.warning("Cloudinary vehicle upload failed (%s): %s", response.status_code, response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=err_msg,
        )

    payload = response.json()
    secure_url = payload.get("secure_url") or ""
    returned_public_id = payload.get("public_id") or f"{folder}/{public_id}"
    if not secure_url.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloudinary không trả về đường dẫn HTTPS an toàn.",
        )

    return {
        "secure_url": secure_url,
        "public_id": returned_public_id,
    }


def parse_cloudinary_url(url: Optional[str]) -> Optional[Dict[str, str]]:
    """Tách delivery_type, public_id và format từ URL Cloudinary đã lưu trong DB."""
    if not url or "res.cloudinary.com/" not in url:
        return None
    match = re.search(
        r"/image/(upload|authenticated|private)/(?:s--[^/]+--/)?(?:v\d+/)?(.+?)(?:\.([a-zA-Z0-9]+))?$",
        url,
    )
    if not match:
        return None
    return {
        "delivery_type": match.group(1),
        "public_id": match.group(2),
        "format": (match.group(3) or "jpg").lower(),
    }


def extract_cloudinary_public_id(url: Optional[str]) -> Optional[str]:
    parsed = parse_cloudinary_url(url)
    return parsed["public_id"] if parsed else None


def build_viewable_kyc_url(stored_url: Optional[str], ttl_seconds: int = SIGNED_VIEW_TTL_SECONDS) -> Optional[str]:
    """
    Tạo đường dẫn HTTPS có chữ ký tạm thời (Signed Private Download URL) để
    CHÍNH NGƯỜI DÙNG ĐÓ (hoặc Admin duyệt hồ sơ) xem trực tiếp ảnh của mình trên trình duyệt,
    trong khi ảnh gốc trên Cloudinary vẫn ở chế độ `private` an toàn tuyệt đối.
    """
    if not stored_url:
        return None

    parsed = parse_cloudinary_url(stored_url)
    if not parsed:
        return stored_url

    # Nếu ảnh cũ lưu dạng public upload thì trả nguyên URL HTTPS
    if parsed["delivery_type"] == "upload":
        return stored_url

    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        return stored_url

    now_ts = int(time.time())
    expires_at = now_ts + max(60, ttl_seconds)
    sign_params = {
        "expires_at": str(expires_at),
        "format": parsed["format"],
        "public_id": parsed["public_id"],
        "timestamp": str(now_ts),
        "type": parsed["delivery_type"],
    }
    signature = generate_cloudinary_signature(sign_params, CLOUDINARY_API_SECRET)
    query_params = {
        **sign_params,
        "api_key": CLOUDINARY_API_KEY,
        "signature": signature,
    }
    return f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/download?{urlencode(query_params)}"


def delete_cloudinary_image_by_public_id(public_id: Optional[str], delivery_type: str = "upload") -> None:
    """Xoá ảnh giấy tờ cũ/dư thừa trên Cloudinary (best-effort)."""
    if not public_id or not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        return

    timestamp = int(time.time())
    sign_params = {
        "invalidate": "true",
        "public_id": public_id,
        "timestamp": str(timestamp),
        "type": delivery_type,
    }
    signature = generate_cloudinary_signature(sign_params, CLOUDINARY_API_SECRET)
    destroy_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/destroy"

    try:
        with httpx.Client(timeout=10.0) as client:
            client.post(
                destroy_url,
                data={
                    **sign_params,
                    "api_key": CLOUDINARY_API_KEY,
                    "signature": signature,
                },
            )
    except Exception as exc:
        logger.warning("Could not delete old Cloudinary image %s: %s", public_id, exc)


def delete_cloudinary_image_by_url(url: Optional[str]) -> None:
    parsed = parse_cloudinary_url(url)
    if parsed:
        delete_cloudinary_image_by_public_id(parsed["public_id"], delivery_type=parsed["delivery_type"])
