import logging
from datetime import date, datetime
from typing import Optional, Dict, Any, Set

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.drivers_license import DriverLicense
from app.models.verifiable_information import VerifiableInformation
from app.schemas.booking_eligibility_schemas import calculate_age
from app.schemas.user_schemas import PersonalProfileUpdateSchema
from app.services.audit_log_services import record_personal_data_access
from app.services.booking_eligibility_services import validate_user_age_18_plus
from app.utils.cloudinary_helper import (
    validate_kyc_image,
    upload_kyc_image_to_cloudinary,
    upload_avatar_to_cloudinary,
    build_viewable_kyc_url,
    delete_cloudinary_image_by_public_id,
    delete_cloudinary_image_by_url,
)

logger = logging.getLogger("uvicorn.error")

VALID_LICENSE_CLASSES = {"A", "A1", "B1", "C"}
_CHECKED_ENGINES: Set[int] = set()


def ensure_kyc_schema_columns(db: Session) -> None:
    """
    Đảm bảo bảng `driver's_license` trên MySQL/TiDB đã có cột `img_license_front`
    và `img_license_back` ngay cả khi chưa chạy lệnh `alembic upgrade head`.
    Sử dụng trực tiếp session hiện hành để tránh khoá kết nối trên SQLite StaticPool.
    """
    bind = db.get_bind()
    engine_id = id(bind)
    if engine_id in _CHECKED_ENGINES:
        return

    _CHECKED_ENGINES.add(engine_id)
    if bind.dialect.name != "mysql":
        return

    try:
        user_rows = db.execute(text("SHOW COLUMNS FROM `users`")).fetchall()
        user_cols = {row[0] for row in user_rows}
        if "avatar_url" not in user_cols:
            db.execute(text("ALTER TABLE `users` ADD COLUMN `avatar_url` VARCHAR(255) NULL"))
        if "gender" not in user_cols:
            db.execute(text("ALTER TABLE `users` ADD COLUMN `gender` VARCHAR(20) NULL"))

        rows = db.execute(text("SHOW COLUMNS FROM `driver's_license`")).fetchall()
        existing_cols = {row[0] for row in rows}
        for col in ("img_license_front", "img_license_back"):
            if col not in existing_cols:
                db.execute(text(f"ALTER TABLE `driver's_license` ADD COLUMN `{col}` VARCHAR(255) NULL"))

        vi_rows = db.execute(text("SHOW COLUMNS FROM `verifiable_information`")).fetchall()
        for row in vi_rows:
            col_name = row[0]
            is_nullable = str(row[2]).upper() == "YES" if len(row) > 2 else True
            if col_name in ("img_id_card_before", "img_id_card_after") and not is_nullable:
                db.execute(text(f"ALTER TABLE `verifiable_information` MODIFY COLUMN `{col_name}` VARCHAR(255) NULL"))
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Auto-check KYC columns skipped: %s", exc)


def _clean_public_license_number(raw_num: Optional[str]) -> Optional[str]:
    if not raw_num:
        return None
    if str(raw_num).startswith("PENDING-"):
        return ""
    return raw_num


def serialize_user_profile(
    user: User,
    id_card: Optional[VerifiableInformation],
    lic: Optional[DriverLicense],
    include_sensitive_docs: bool = True,
) -> Dict[str, Any]:
    """
    Trả về hồ sơ người dùng. Khi `include_sensitive_docs=True` (chính chủ hoặc Admin/Nhân viên),
    hệ thống trả về đầy đủ URL xem ảnh CCCD & GPLX để người dùng xem được
    ảnh của chính mình ngay sau khi lưu cũng như những lần truy cập sau.
    """
    id_card_payload = None
    if include_sensitive_docs and id_card:
        id_card_payload = {
            "information_id": id_card.information_id,
            "img_id_card_before": build_viewable_kyc_url(id_card.img_id_card_before),
            "img_id_card_after": build_viewable_kyc_url(id_card.img_id_card_after),
            "status": id_card.status,
            "rejected_reason": id_card.rejected_reason,
            "verified_at": id_card.verified_at.isoformat() if id_card.verified_at else None,
        }

    license_payload = None
    if include_sensitive_docs and lic:
        license_payload = {
            "drivers_license_id": lic.drivers_license_id,
            "license_number": _clean_public_license_number(lic.license_number),
            "license_class": lic.license_class,
            "issue_date": lic.issue_date.isoformat() if lic.issue_date else None,
            "expiry_date": lic.expiry_date.isoformat() if lic.expiry_date else None,
            "img_license_front": build_viewable_kyc_url(lic.img_license_front),
            "img_license_back": build_viewable_kyc_url(lic.img_license_back),
            "verification_status": lic.verification_status,
            "rejected_reason": lic.rejected_reason,
            "verified_at": lic.verified_at.isoformat() if lic.verified_at else None,
        }

    return {
        "user_id": user.user_id,
        "fullname": user.fullname,
        "email": user.email,
        "phone_number": user.phone_number,
        "date_of_birth": user.date_of_birth.isoformat() if user.date_of_birth else None,
        "age": calculate_age(user.date_of_birth) if user.date_of_birth else None,
        "address": user.address,
        "gender": getattr(user, "gender", None),
        "avatar_url": getattr(user, "avatar_url", None),
        "status": user.status,
        "id_card": id_card_payload,
        "driver_license": license_payload,
    }


def get_personal_profile(
    db: Session,
    user_id: int,
    include_sensitive_docs: bool = True,
) -> Dict[str, Any]:
    """Lấy đầy đủ thông tin hồ sơ cá nhân, ảnh CCCD và GPLX của người dùng."""
    ensure_kyc_schema_columns(db)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID {user_id}.",
        )

    id_card = db.query(VerifiableInformation).filter(VerifiableInformation.information_id == user_id).first()
    lic = db.query(DriverLicense).filter(DriverLicense.user_id == user_id).first()
    return serialize_user_profile(user, id_card, lic, include_sensitive_docs=include_sensitive_docs)


def update_personal_profile(
    db: Session,
    user_id: int,
    profile_data: PersonalProfileUpdateSchema,
    accessor_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Cập nhật họ tên, ngày sinh (>= 18 tuổi), địa chỉ và số điện thoại của người dùng,
    đồng thời vẫn trả về đầy đủ ảnh CCCD & GPLX có chữ ký để người dùng tiếp tục xem ảnh của mình.
    """
    ensure_kyc_schema_columns(db)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID {user_id}.",
        )

    validate_user_age_18_plus(profile_data.date_of_birth)

    if profile_data.phone_number:
        duplicate_phone = (
            db.query(User)
            .filter(User.phone_number == profile_data.phone_number, User.user_id != user_id)
            .first()
        )
        if duplicate_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số điện thoại này đã được sử dụng bởi tài khoản khác.",
            )

    user.fullname = profile_data.fullname
    user.date_of_birth = profile_data.date_of_birth
    user.address = profile_data.address
    if profile_data.phone_number is not None:
        user.phone_number = profile_data.phone_number
    if profile_data.gender is not None:
        user.gender = profile_data.gender

    if profile_data.license_number:
        duplicate_lic = (
            db.query(DriverLicense)
            .filter(DriverLicense.license_number == profile_data.license_number, DriverLicense.user_id != user_id)
            .first()
        )
        if duplicate_lic:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số giấy phép lái xe này đã được đăng ký cho tài khoản khác.",
            )
        lic_record = db.query(DriverLicense).filter(DriverLicense.user_id == user_id).first()
        eff_class = profile_data.license_class or (lic_record.license_class if lic_record and lic_record.license_class else "A1")
        if lic_record:
            changed = (
                lic_record.license_number != profile_data.license_number
                or lic_record.license_class != eff_class
            )
            lic_record.license_number = profile_data.license_number
            lic_record.license_class = eff_class
            if changed:
                lic_record.verification_status = "Đang chờ"
                lic_record.rejected_reason = None
                lic_record.verified_at = None
                lic_record.verified_by = None
        else:
            lic_record = DriverLicense(
                user_id=user_id,
                license_number=profile_data.license_number,
                license_class=eff_class,
                issue_date=datetime(2022, 1, 1),
                expiry_date=datetime(2032, 1, 1),
                verification_status="Đang chờ",
            )
            db.add(lic_record)

    try:
        db.commit()
        db.refresh(user)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể cập nhật hồ sơ cá nhân: {str(exc)}",
        ) from exc

    try:
        record_personal_data_access(
            db=db,
            accessor_id=accessor_id or user_id,
            target_user_id=user_id,
            data_type="USER_PROFILE",
            action="UPDATE",
            reason="Người dùng cập nhật họ tên, ngày sinh, địa chỉ hồ sơ cá nhân",
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as log_exc:
        logger.warning("Could not write audit log for profile update: %s", log_exc)

    id_card = db.query(VerifiableInformation).filter(VerifiableInformation.information_id == user_id).first()
    lic = db.query(DriverLicense).filter(DriverLicense.user_id == user_id).first()
    return serialize_user_profile(user, id_card, lic, include_sensitive_docs=True)


async def upload_id_card_images(
    db: Session,
    user_id: int,
    front_image: Optional[UploadFile] = None,
    back_image: Optional[UploadFile] = None,
    accessor_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Xác thực nhị phân ảnh CCCD (mặt trước và/hoặc mặt sau), tải an toàn lên Cloudinary (`type="private"`),
    lưu URL gốc vào `verifiable_information`, và trả về ngay URL xem ảnh có chữ ký cho chính chủ.
    """
    ensure_kyc_schema_columns(db)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID {user_id}.",
        )

    has_front = front_image is not None and bool(front_image.filename)
    has_back = back_image is not None and bool(back_image.filename)
    if not has_front and not has_back:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng tải lên ít nhất một mặt ảnh CCCD.",
        )

    record = db.query(VerifiableInformation).filter(VerifiableInformation.information_id == user_id).first()

    front_validated = await validate_kyc_image(front_image, "Ảnh CCCD mặt trước") if has_front else None
    back_validated = await validate_kyc_image(back_image, "Ảnh CCCD mặt sau") if has_back else None

    uploaded_public_ids = []
    front_upload = None
    back_upload = None
    try:
        if front_validated is not None:
            front_bytes, front_name, front_mime = front_validated
            front_upload = upload_kyc_image_to_cloudinary(
                content=front_bytes,
                filename=front_name,
                content_type=front_mime,
                user_id=user_id,
                doc_tag="cccd_front",
            )
            uploaded_public_ids.append(front_upload["public_id"])

        if back_validated is not None:
            back_bytes, back_name, back_mime = back_validated
            back_upload = upload_kyc_image_to_cloudinary(
                content=back_bytes,
                filename=back_name,
                content_type=back_mime,
                user_id=user_id,
                doc_tag="cccd_back",
            )
            uploaded_public_ids.append(back_upload["public_id"])
    except Exception:
        for pid in uploaded_public_ids:
            delete_cloudinary_image_by_public_id(pid)
        raise

    old_urls = []
    if record:
        if front_upload:
            old_urls.append(record.img_id_card_before)
            record.img_id_card_before = front_upload["secure_url"]
        if back_upload:
            old_urls.append(record.img_id_card_after)
            record.img_id_card_after = back_upload["secure_url"]
        record.status = "Đang chờ"
        record.rejected_reason = None
        record.verified_at = None
        record.verified_by = None
    else:
        record = VerifiableInformation(
            information_id=user_id,
            img_id_card_before=front_upload["secure_url"] if front_upload else None,
            img_id_card_after=back_upload["secure_url"] if back_upload else None,
            status="Đang chờ",
        )
        db.add(record)

    try:
        db.commit()
        db.refresh(record)
    except Exception as exc:
        db.rollback()
        for pid in uploaded_public_ids:
            delete_cloudinary_image_by_public_id(pid)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể lưu thông tin ảnh CCCD vào cơ sở dữ liệu: {str(exc)}",
        ) from exc

    current_urls = {record.img_id_card_before, record.img_id_card_after}
    for old_url in old_urls:
        if old_url and old_url not in current_urls:
            delete_cloudinary_image_by_url(old_url)

    try:
        record_personal_data_access(
            db=db,
            accessor_id=accessor_id or user_id,
            target_user_id=user_id,
            data_type="ID_CARD_DOCUMENT",
            action="UPDATE",
            reason="Người dùng tải ảnh CCCD lên Cloudinary",
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as log_exc:
        logger.warning("Could not write audit log for ID card upload: %s", log_exc)

    return {
        "information_id": record.information_id,
        "img_id_card_before": build_viewable_kyc_url(record.img_id_card_before),
        "img_id_card_after": build_viewable_kyc_url(record.img_id_card_after),
        "status": record.status,
        "rejected_reason": record.rejected_reason,
        "verified_at": record.verified_at.isoformat() if record.verified_at else None,
    }


async def upload_driver_license_images(
    db: Session,
    user_id: int,
    license_number: Optional[str] = None,
    license_class: Optional[str] = "A1",
    front_image: Optional[UploadFile] = None,
    back_image: Optional[UploadFile] = None,
    issue_date: Optional[date] = None,
    expiry_date: Optional[date] = None,
    accessor_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Xác thực thông tin & ảnh Giấy phép lái xe, tải an toàn lên Cloudinary (`kyc/u_{user_id}`),
    lưu vào `driver's_license`, và trả về ngay URL xem ảnh cho chính chủ.
    Hỗ trợ cả tải ảnh ngay khi chọn file lẫn lưu đồng thời số GPLX + ảnh.
    """
    ensure_kyc_schema_columns(db)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID {user_id}.",
        )

    if user.date_of_birth is not None:
        validate_user_age_18_plus(user.date_of_birth)

    lic_record = db.query(DriverLicense).filter(DriverLicense.user_id == user_id).first()

    has_front = front_image is not None and bool(front_image.filename)
    has_back = back_image is not None and bool(back_image.filename)

    cleaned_number = (license_number or "").strip()
    if not cleaned_number:
        if lic_record and lic_record.license_number:
            cleaned_number = lic_record.license_number
        elif has_front or has_back:
            cleaned_number = f"PENDING-{user_id}"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số giấy phép lái xe không được để trống.",
            )

    raw_class = (license_class or "").strip().upper()
    cleaned_class = raw_class if raw_class else (lic_record.license_class if lic_record and lic_record.license_class else "A1")
    if cleaned_class not in VALID_LICENSE_CLASSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hạng giấy phép lái xe không hợp lệ. Chỉ chấp nhận: {', '.join(sorted(VALID_LICENSE_CLASSES))}.",
        )

    eff_issue = (
        datetime.combine(issue_date, datetime.min.time())
        if issue_date
        else (lic_record.issue_date if lic_record and lic_record.issue_date else datetime(2022, 1, 1))
    )
    eff_expiry = (
        datetime.combine(expiry_date, datetime.min.time())
        if expiry_date
        else (lic_record.expiry_date if lic_record and lic_record.expiry_date else datetime(2032, 1, 1))
    )
    if eff_expiry <= eff_issue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn GPLX phải lớn hơn ngày cấp.",
        )

    if not cleaned_number.startswith("PENDING-"):
        duplicate_lic = (
            db.query(DriverLicense)
            .filter(DriverLicense.license_number == cleaned_number, DriverLicense.user_id != user_id)
            .first()
        )
        if duplicate_lic:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số giấy phép lái xe này đã được đăng ký cho tài khoản khác.",
            )

    if not has_front and not has_back and lic_record is None and cleaned_number.startswith("PENDING-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng tải lên ảnh mặt trước giấy phép lái xe.",
        )

    front_validated = await validate_kyc_image(front_image, "Ảnh giấy phép lái xe mặt trước") if has_front else None
    back_validated = await validate_kyc_image(back_image, "Ảnh giấy phép lái xe mặt sau") if has_back else None

    uploaded_public_ids = []
    front_upload = None
    back_upload = None
    try:
        if front_validated is not None:
            front_bytes, front_name, front_mime = front_validated
            front_upload = upload_kyc_image_to_cloudinary(
                content=front_bytes,
                filename=front_name,
                content_type=front_mime,
                user_id=user_id,
                doc_tag="gplx_front",
            )
            uploaded_public_ids.append(front_upload["public_id"])

        if back_validated is not None:
            back_bytes, back_name, back_mime = back_validated
            back_upload = upload_kyc_image_to_cloudinary(
                content=back_bytes,
                filename=back_name,
                content_type=back_mime,
                user_id=user_id,
                doc_tag="gplx_back",
            )
            uploaded_public_ids.append(back_upload["public_id"])
    except Exception:
        for pid in uploaded_public_ids:
            delete_cloudinary_image_by_public_id(pid)
        raise

    old_urls = []
    if lic_record:
        if front_upload is not None:
            old_urls.append(lic_record.img_license_front)
            lic_record.img_license_front = front_upload["secure_url"]
        if back_upload is not None:
            old_urls.append(lic_record.img_license_back)
            lic_record.img_license_back = back_upload["secure_url"]

        lic_record.license_number = cleaned_number
        lic_record.license_class = cleaned_class
        lic_record.issue_date = eff_issue
        lic_record.expiry_date = eff_expiry
        lic_record.verification_status = "Đang chờ"
        lic_record.rejected_reason = None
        lic_record.verified_at = None
        lic_record.verified_by = None
    else:
        lic_record = DriverLicense(
            user_id=user_id,
            license_number=cleaned_number,
            license_class=cleaned_class,
            issue_date=eff_issue,
            expiry_date=eff_expiry,
            img_license_front=front_upload["secure_url"] if front_upload else None,
            img_license_back=back_upload["secure_url"] if back_upload else None,
            verification_status="Đang chờ",
        )
        db.add(lic_record)

    try:
        db.commit()
        db.refresh(lic_record)
    except Exception as exc:
        db.rollback()
        for pid in uploaded_public_ids:
            delete_cloudinary_image_by_public_id(pid)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể lưu thông tin giấy phép lái xe: {str(exc)}",
        ) from exc

    new_urls = {lic_record.img_license_front, lic_record.img_license_back}
    for old_url in old_urls:
        if old_url and old_url not in new_urls:
            delete_cloudinary_image_by_url(old_url)

    try:
        record_personal_data_access(
            db=db,
            accessor_id=accessor_id or user_id,
            target_user_id=user_id,
            data_type="DRIVER_LICENSE_DOCUMENT",
            action="UPDATE",
            reason="Người dùng tải ảnh và thông tin giấy phép lái xe lên Cloudinary",
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as log_exc:
        logger.warning("Could not write audit log for driver license upload: %s", log_exc)

    return {
        "drivers_license_id": lic_record.drivers_license_id,
        "user_id": lic_record.user_id,
        "license_number": _clean_public_license_number(lic_record.license_number),
        "license_class": lic_record.license_class,
        "issue_date": lic_record.issue_date.isoformat() if lic_record.issue_date else None,
        "expiry_date": lic_record.expiry_date.isoformat() if lic_record.expiry_date else None,
        "img_license_front": build_viewable_kyc_url(lic_record.img_license_front),
        "img_license_back": build_viewable_kyc_url(lic_record.img_license_back),
        "verification_status": lic_record.verification_status,
        "rejected_reason": lic_record.rejected_reason,
    }


async def upload_user_avatar(
    db: Session,
    user_id: int,
    avatar_file: UploadFile,
    accessor_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Xác thực ảnh đại diện, tải lên Cloudinary và lưu `avatar_url` vào bảng `users`.
    """
    ensure_kyc_schema_columns(db)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID {user_id}.",
        )

    img_bytes, img_name, img_mime = await validate_kyc_image(avatar_file, "Ảnh đại diện")
    upload_res = upload_avatar_to_cloudinary(
        content=img_bytes,
        filename=img_name,
        content_type=img_mime,
        user_id=user_id,
    )

    old_avatar = getattr(user, "avatar_url", None)
    user.avatar_url = upload_res["secure_url"]

    try:
        db.commit()
        db.refresh(user)
    except Exception as exc:
        db.rollback()
        delete_cloudinary_image_by_public_id(upload_res["public_id"], delivery_type="upload")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể lưu ảnh đại diện: {str(exc)}",
        ) from exc

    if old_avatar and old_avatar != user.avatar_url:
        delete_cloudinary_image_by_url(old_avatar)

    return {
        "user_id": user.user_id,
        "avatar_url": user.avatar_url,
    }
