from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.schemas.verification_schemas import ReviewKYCRequestSchema
from app.services.verification_services import (
    get_customer_kyc_details,
    review_driver_license,
    review_id_card,
)
from app.utils.cloudinary_helper import build_viewable_kyc_url
from app.utils.response import create_response
from dependencies.middleware import check_operator

router = APIRouter(prefix="/admin/verification", tags=["Admin Verification"])


@router.get("/customers/{user_id}/kyc", status_code=status.HTTP_200_OK)
def get_customer_kyc(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_operator),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    data = get_customer_kyc_details(
        db=db,
        customer_user_id=user_id,
        staff_user_id=current_user.user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Lấy thông tin KYC thành công", data)


@router.post("/licenses/{license_id}/review", status_code=status.HTTP_200_OK)
def review_license_endpoint(
    request: Request,
    license_id: int,
    review_data: ReviewKYCRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_operator),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = review_driver_license(
        db=db,
        license_id=license_id,
        staff_user_id=current_user.user_id,
        review_data=review_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    response_data = {
        "drivers_license_id": result.drivers_license_id,
        "user_id": result.user_id,
        "license_number": result.license_number,
        "verification_status": result.verification_status,
        "rejected_reason": result.rejected_reason,
        "verified_at": result.verified_at.isoformat() if result.verified_at else None,
        "verified_by": result.verified_by,
    }
    return create_response(request, status.HTTP_200_OK, "Đã cập nhật trạng thái giấy phép lái xe", response_data)


@router.post("/id-cards/{info_id}/review", status_code=status.HTTP_200_OK)
def review_id_card_endpoint(
    request: Request,
    info_id: int,
    review_data: ReviewKYCRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_operator),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    result = review_id_card(
        db=db,
        info_id=info_id,
        staff_user_id=current_user.user_id,
        review_data=review_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    response_data = {
        "information_id": result.information_id,
        "img_id_card_before": build_viewable_kyc_url(result.img_id_card_before),
        "img_id_card_after": build_viewable_kyc_url(result.img_id_card_after),
        "status": result.status,
        "rejected_reason": result.rejected_reason,
        "verified_at": result.verified_at.isoformat() if result.verified_at else None,
        "verified_by": result.verified_by,
    }
    return create_response(request, status.HTTP_200_OK, "Đã cập nhật trạng thái CCCD", response_data)
