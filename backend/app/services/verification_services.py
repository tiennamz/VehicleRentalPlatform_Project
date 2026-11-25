from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.drivers_license import DriverLicense
from app.models.verifiable_information import VerifiableInformation
from app.schemas.verification_schemas import ReviewKYCRequestSchema, ReviewActionEnum
from app.services.audit_log_services import record_personal_data_access, get_current_utc_time
from app.utils.cloudinary_helper import build_viewable_kyc_url

def get_customer_kyc_details(
    db: Session,
    customer_user_id: int,
    staff_user_id: int,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """
    Lấy toàn bộ thông tin định danh (KYC) của khách hàng
    và tự động ghi nhật ký truy cập dữ liệu cá nhân (VIEW).
    """
    customer = db.query(User).filter(User.user_id == customer_user_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy khách hàng với ID {customer_user_id}"
        )

    license_record = db.query(DriverLicense).filter(DriverLicense.user_id == customer_user_id).first()
    id_card_record = db.query(VerifiableInformation).filter(VerifiableInformation.information_id == customer_user_id).first()

    # Ghi nhật ký truy cập (VIEW)
    record_personal_data_access(
        db=db,
        accessor_id=staff_user_id,
        target_user_id=customer_user_id,
        data_type="KYC_PROFILE",
        action="VIEW",
        reason="Xem hồ sơ KYC của khách hàng",
        ip_address=ip_address,
        user_agent=user_agent
    )

    license_data = None
    if license_record:
        license_data = {
            "drivers_license_id": license_record.drivers_license_id,
            "license_number": license_record.license_number,
            "license_class": license_record.license_class,
            "issue_date": license_record.issue_date.isoformat() if license_record.issue_date else None,
            "expiry_date": license_record.expiry_date.isoformat() if license_record.expiry_date else None,
            "img_license_front": build_viewable_kyc_url(getattr(license_record, "img_license_front", None)),
            "img_license_back": build_viewable_kyc_url(getattr(license_record, "img_license_back", None)),
            "verification_status": license_record.verification_status,
            "rejected_reason": license_record.rejected_reason,
            "verified_at": license_record.verified_at.isoformat() if license_record.verified_at else None,
            "verified_by": license_record.verified_by
        }

    id_card_data = None
    if id_card_record:
        id_card_data = {
            "information_id": id_card_record.information_id,
            "img_id_card_before": build_viewable_kyc_url(id_card_record.img_id_card_before),
            "img_id_card_after": build_viewable_kyc_url(id_card_record.img_id_card_after),
            "status": id_card_record.status,
            "rejected_reason": id_card_record.rejected_reason,
            "verified_at": id_card_record.verified_at.isoformat() if id_card_record.verified_at else None,
            "verified_by": id_card_record.verified_by
        }

    return {
        "user_id": customer.user_id,
        "fullname": customer.fullname,
        "email": customer.email,
        "phone_number": customer.phone_number,
        "driver_license": license_data,
        "id_card": id_card_data
    }

def review_driver_license(
    db: Session,
    license_id: int,
    staff_user_id: int,
    review_data: ReviewKYCRequestSchema,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> DriverLicense:
    """
    Duyệt hoặc từ chối giấy phép lái xe kèm lý do và ghi nhật ký truy cập.
    """
    license_record = db.query(DriverLicense).filter(DriverLicense.drivers_license_id == license_id).first()
    if not license_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy giấy phép lái xe với ID {license_id}"
        )

    now_utc = get_current_utc_time()
    license_record.verified_at = now_utc
    license_record.verified_by = staff_user_id

    if review_data.action == ReviewActionEnum.APPROVE:
        license_record.verification_status = "Đã xác thực"
        license_record.rejected_reason = None
    else:
        license_record.verification_status = "Bị từ chối"
        license_record.rejected_reason = review_data.rejected_reason

    # Ghi nhật ký duyệt/từ chối
    record_personal_data_access(
        db=db,
        accessor_id=staff_user_id,
        target_user_id=license_record.user_id,
        data_type="DRIVERS_LICENSE",
        action=review_data.action.value,
        reason=review_data.rejected_reason or "Duyệt hồ sơ giấy phép lái xe",
        ip_address=ip_address,
        user_agent=user_agent
    )

    try:
        db.commit()
        db.refresh(license_record)
        return license_record
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật trạng thái GPLX: {str(e)}"
        )

def review_id_card(
    db: Session,
    info_id: int,
    staff_user_id: int,
    review_data: ReviewKYCRequestSchema,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> VerifiableInformation:
    """
    Duyệt hoặc từ chối ảnh CCCD/thông tin định danh kèm lý do và ghi nhật ký truy cập.
    """
    id_card_record = db.query(VerifiableInformation).filter(VerifiableInformation.information_id == info_id).first()
    if not id_card_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thông tin CCCD với ID {info_id}"
        )

    now_utc = get_current_utc_time()
    id_card_record.verified_at = now_utc
    id_card_record.verified_by = staff_user_id

    if review_data.action == ReviewActionEnum.APPROVE:
        id_card_record.status = "Đã xác thực"
        id_card_record.rejected_reason = None
    else:
        id_card_record.status = "Bị từ chối"
        id_card_record.rejected_reason = review_data.rejected_reason

    # Ghi nhật ký duyệt/từ chối
    record_personal_data_access(
        db=db,
        accessor_id=staff_user_id,
        target_user_id=id_card_record.information_id,
        data_type="CCCD",
        action=review_data.action.value,
        reason=review_data.rejected_reason or "Duyệt thông tin CCCD",
        ip_address=ip_address,
        user_agent=user_agent
    )

    try:
        db.commit()
        db.refresh(id_card_record)
        return id_card_record
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật trạng thái CCCD: {str(e)}"
        )

