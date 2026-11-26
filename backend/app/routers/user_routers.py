from datetime import date
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.schemas.user_schemas import PersonalProfileUpdateSchema
from app.services.user_services import (
    get_personal_profile,
    update_personal_profile,
    upload_id_card_images,
    upload_driver_license_images,
    upload_user_avatar,
)
from app.utils.response import create_response
from dependencies.middleware import get_current_user, ensure_owner_or_roles, RoleID

router = APIRouter(prefix="/users", tags=["Personal Profile & KYC Documents"])


def _ensure_owner_or_admin(target_user_id: int, current_user: User) -> int:
    """
    Chỉ cho phép chính chủ tài khoản hoặc Admin (role_id = 1)
    thao tác trên hồ sơ/giấy tờ của `target_user_id`.
    """
    ensure_owner_or_roles(
        current_user=current_user,
        owner_user_id=target_user_id,
        allowed_role_ids={RoleID.ADMIN},
        detail="Bạn không có quyền truy cập hoặc chỉnh sửa hồ sơ của người dùng khác.",
    )
    return current_user.user_id


# =========================================================
# 1. ENDPOINTS THEO PHIÊN ĐĂNG NHẬP (/users/me/...)
# =========================================================

@router.get("/me/profile", status_code=status.HTTP_200_OK)
def get_my_profile_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = get_personal_profile(db=db, user_id=current_user.user_id)
    return create_response(request, status.HTTP_200_OK, "Lấy thông tin hồ sơ cá nhân thành công", data)


@router.put("/me/profile", status_code=status.HTTP_200_OK)
def update_my_profile_endpoint(
    request: Request,
    profile_data: PersonalProfileUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data = update_personal_profile(
        db=db,
        user_id=current_user.user_id,
        profile_data=profile_data,
        accessor_id=current_user.user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Cập nhật hồ sơ cá nhân thành công", data)


@router.post("/me/avatar", status_code=status.HTTP_200_OK)
async def upload_my_avatar_endpoint(
    request: Request,
    avatar: UploadFile = File(..., description="Ảnh đại diện (JPG/PNG/WEBP, tối đa 5MB)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data = await upload_user_avatar(
        db=db,
        user_id=current_user.user_id,
        avatar_file=avatar,
        accessor_id=current_user.user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Cập nhật ảnh đại diện thành công", data)


@router.post("/{user_id}/avatar", status_code=status.HTTP_200_OK)
async def upload_user_avatar_endpoint(
    request: Request,
    user_id: int,
    avatar: UploadFile = File(..., description="Ảnh đại diện (JPG/PNG/WEBP, tối đa 5MB)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accessor_id = _ensure_owner_or_admin(user_id, current_user)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data = await upload_user_avatar(
        db=db,
        user_id=user_id,
        avatar_file=avatar,
        accessor_id=accessor_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Cập nhật ảnh đại diện thành công", data)


@router.post("/me/documents/id-card", status_code=status.HTTP_200_OK)
async def upload_my_id_card_endpoint(
    request: Request,
    front_image: Optional[UploadFile] = File(None, description="Ảnh CCCD mặt trước (JPG/PNG/WEBP, tối đa 5MB)"),
    back_image: Optional[UploadFile] = File(None, description="Ảnh CCCD mặt sau (JPG/PNG/WEBP, tối đa 5MB)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data = await upload_id_card_images(
        db=db,
        user_id=current_user.user_id,
        front_image=front_image,
        back_image=back_image,
        accessor_id=current_user.user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Tải ảnh căn cước công dân lên Cloudinary thành công", data)


@router.post("/me/documents/driver-license", status_code=status.HTTP_200_OK)
async def upload_my_driver_license_endpoint(
    request: Request,
    license_number: Optional[str] = Form(None, description="Số giấy phép lái xe"),
    license_class: Optional[str] = Form("A1", description="Hạng bằng lái: A, A1, B1, C"),
    issue_date: Optional[date] = Form(None, description="Ngày cấp GPLX (YYYY-MM-DD)"),
    expiry_date: Optional[date] = Form(None, description="Ngày hết hạn GPLX (YYYY-MM-DD)"),
    front_image: Optional[UploadFile] = File(None, description="Ảnh mặt trước GPLX (JPG/PNG/WEBP, tối đa 5MB)"),
    back_image: Optional[UploadFile] = File(None, description="Ảnh mặt sau GPLX (tuỳ chọn)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data = await upload_driver_license_images(
        db=db,
        user_id=current_user.user_id,
        license_number=license_number,
        license_class=license_class,
        front_image=front_image,
        back_image=back_image,
        issue_date=issue_date,
        expiry_date=expiry_date,
        accessor_id=current_user.user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Tải ảnh giấy phép lái xe lên Cloudinary thành công", data)


# =========================================================
# 2. ENDPOINTS THEO USER_ID (/users/{user_id}/documents/...)
# =========================================================

@router.post("/{user_id}/documents/id-card", status_code=status.HTTP_200_OK)
async def upload_user_id_card_endpoint(
    request: Request,
    user_id: int,
    front_image: Optional[UploadFile] = File(None, description="Ảnh CCCD mặt trước (JPG/PNG/WEBP, tối đa 5MB)"),
    back_image: Optional[UploadFile] = File(None, description="Ảnh CCCD mặt sau (JPG/PNG/WEBP, tối đa 5MB)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accessor_id = _ensure_owner_or_admin(user_id, current_user)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data = await upload_id_card_images(
        db=db,
        user_id=user_id,
        front_image=front_image,
        back_image=back_image,
        accessor_id=accessor_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Tải ảnh căn cước công dân lên Cloudinary thành công", data)


@router.post("/{user_id}/documents/driver-license", status_code=status.HTTP_200_OK)
async def upload_user_driver_license_endpoint(
    request: Request,
    user_id: int,
    license_number: Optional[str] = Form(None, description="Số giấy phép lái xe"),
    license_class: Optional[str] = Form("A1", description="Hạng bằng lái: A, A1, B1, C"),
    issue_date: Optional[date] = Form(None, description="Ngày cấp GPLX (YYYY-MM-DD)"),
    expiry_date: Optional[date] = Form(None, description="Ngày hết hạn GPLX (YYYY-MM-DD)"),
    front_image: Optional[UploadFile] = File(None, description="Ảnh mặt trước GPLX (JPG/PNG/WEBP, tối đa 5MB)"),
    back_image: Optional[UploadFile] = File(None, description="Ảnh mặt sau GPLX (tuỳ chọn)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accessor_id = _ensure_owner_or_admin(user_id, current_user)
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data = await upload_driver_license_images(
        db=db,
        user_id=user_id,
        license_number=license_number,
        license_class=license_class,
        front_image=front_image,
        back_image=back_image,
        issue_date=issue_date,
        expiry_date=expiry_date,
        accessor_id=accessor_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Tải ảnh giấy phép lái xe lên Cloudinary thành công", data)
