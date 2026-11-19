from typing import Optional
from fastapi import APIRouter, Depends, Request, status, Query, Header
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.verification_schemas import ReviewKYCRequestSchema
from app.services.verification_services import (
    get_customer_kyc_details,
    review_driver_license,
    review_id_card,
)
from app.utils.response import create_response

router = APIRouter(prefix="/admin/verification", tags=["Admin Verification"])

def get_accessor_id(
    x_staff_id: Optional[int] = Header(None, alias="X-Staff-Id"),
    staff_id: Optional[int] = Query(None)
) -> int:
    """Lấy ID của nhân viên hoặc admin thực hiện thao tác duyệt/xem hồ sơ."""
    if x_staff_id is not None:
        return x_staff_id
    if staff_id is not None:
        return staff_id
    return 1  # Mặc định Admin hệ thống nếu chưa có JWT context

@router.get("/customers/{user_id}/kyc", status_code=status.HTTP_200_OK)
def get_customer_kyc(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    staff_id: int = Depends(get_accessor_id)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    data = get_customer_kyc_details(
        db=db,
        customer_user_id=user_id,
        staff_user_id=staff_id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    return create_response(request, status.HTTP_200_OK, "Lấy thông tin KYC thành công", data)

@router.post("/licenses/{license_id}/review", status_code=status.HTTP_200_OK)
def review_license_endpoint(
    request: Request,
    license_id: int,
    review_data: ReviewKYCRequestSchema,
    db: Session = Depends(get_db),
    staff_id: int = Depends(get_accessor_id)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = review_driver_license(
        db=db,
        license_id=license_id,
        staff_user_id=staff_id,
        review_data=review_data,
        ip_address=ip_address,
        user_agent=user_agent
    )

    response_data = {
        "drivers_license_id": result.drivers_license_id,
        "user_id": result.user_id,
        "license_number": result.license_number,
        "verification_status": result.verification_status,
        "rejected_reason": result.rejected_reason,
        "verified_at": result.verified_at.isoformat() if result.verified_at else None,
        "verified_by": result.verified_by
    }
    return create_response(request, status.HTTP_200_OK, "Đã cập nhật trạng thái giấy phép lái xe", response_data)

@router.post("/id-cards/{info_id}/review", status_code=status.HTTP_200_OK)
def review_id_card_endpoint(
    request: Request,
    info_id: int,
    review_data: ReviewKYCRequestSchema,
    db: Session = Depends(get_db),
    staff_id: int = Depends(get_accessor_id)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = review_id_card(
        db=db,
        info_id=info_id,
        staff_user_id=staff_id,
        review_data=review_data,
        ip_address=ip_address,
        user_agent=user_agent
    )

    response_data = {
        "information_id": result.information_id,
        "img_id_card_before": result.img_id_card_before,
        "img_id_card_after": result.img_id_card_after,
        "status": result.status,
        "rejected_reason": result.rejected_reason,
        "verified_at": result.verified_at.isoformat() if result.verified_at else None,
        "verified_by": result.verified_by
    }
    return create_response(request, status.HTTP_200_OK, "Đã cập nhật trạng thái CCCD", response_data)

