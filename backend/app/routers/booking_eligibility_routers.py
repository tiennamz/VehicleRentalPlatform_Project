from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.models.drivers_license import DriverLicense
from app.schemas.booking_eligibility_schemas import (
    calculate_age,
    UserProfileUpdateSchema,
    DriverLicenseSubmitSchema,
    OrderCreateSchema,
)
from app.services.booking_eligibility_services import (
    update_user_profile,
    submit_driver_license,
    search_vehicles,
    create_rental_order,
)
from app.routers.user_routers import _get_optional_user
from app.schemas.user_schemas import PersonalProfileUpdateSchema
from app.services.user_services import get_personal_profile, update_personal_profile
from app.utils.response import create_response
from dependencies.middleware import RoleID

router = APIRouter(tags=["Booking Eligibility & Vehicle Search (TF13D97)"])


@router.get("/users/{user_id}/profile", status_code=status.HTTP_200_OK)
def get_profile_endpoint(
    request: Request,
    user_id: int,
    current_user: Optional[User] = Depends(_get_optional_user),
    db: Session = Depends(get_db),
):
    can_view_docs = False
    if current_user is not None:
        is_Privileged = any(
            getattr(ur, "role_id", None) in {RoleID.ADMIN, RoleID.STAFF, RoleID.STORE_OWNER}
            for ur in current_user.user_roles
        )
        if current_user.user_id == user_id or is_Privileged:
            can_view_docs = True
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem hồ sơ của người dùng khác.",
            )
    data = get_personal_profile(db=db, user_id=user_id, include_sensitive_docs=can_view_docs)
    return create_response(request, status.HTTP_200_OK, "Lấy thông tin hồ sơ cá nhân thành công", data)


@router.put("/users/{user_id}/profile", status_code=status.HTTP_200_OK)
def update_profile_endpoint(
    request: Request,
    user_id: int,
    profile_data: PersonalProfileUpdateSchema,
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    data = update_personal_profile(
        db=db,
        user_id=user_id,
        profile_data=profile_data,
        accessor_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return create_response(request, status.HTTP_200_OK, "Cập nhật hồ sơ cá nhân thành công", data)


@router.post("/users/{user_id}/licenses", status_code=status.HTTP_201_CREATED)
def submit_license_endpoint(
    request: Request,
    user_id: int,
    license_data: DriverLicenseSubmitSchema,
    db: Session = Depends(get_db),
):
    lic = submit_driver_license(db, user_id=user_id, license_data=license_data)
    data = {
        "drivers_license_id": lic.drivers_license_id,
        "user_id": lic.user_id,
        "license_number": lic.license_number,
        "license_class": lic.license_class,
        "issue_date": lic.issue_date.isoformat() if lic.issue_date else None,
        "expiry_date": lic.expiry_date.isoformat() if lic.expiry_date else None,
        "verification_status": lic.verification_status,
    }
    return create_response(request, status.HTTP_201_CREATED, "Nộp hồ sơ giấy phép lái xe thành công", data)


@router.get("/vehicles", status_code=status.HTTP_200_OK)
def search_vehicles_endpoint(
    request: Request,
    vehicle_type: Optional[str] = Query(None, description="Loại xe: Xe tay ga, Xe số, Ô tô 4 chỗ..."),
    brand: Optional[str] = Query(None, description="Thương hiệu xe"),
    status_filter: Optional[str] = Query("Available", alias="status"),
    user_id: Optional[int] = Query(None, description="ID người dùng tìm xe (tài khoản chưa duyệt GPLX vẫn tìm xe được)"),
    db: Session = Depends(get_db),
):
    vehicles = search_vehicles(
        db=db,
        vehicle_type=vehicle_type,
        brand=brand,
        status_filter=status_filter,
        user_id=user_id,
    )
    data = [
        {
            "vehicle_id": v.vehicle_id,
            "store_id": v.store_id,
            "brand": v.brand,
            "license_plate": v.license_plate,
            "type": v.type,
            "status": v.status,
        }
        for v in vehicles
    ]
    return create_response(request, status.HTTP_200_OK, "Tìm kiếm phương tiện thành công", data)


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order_endpoint(
    request: Request,
    order_data: OrderCreateSchema,
    db: Session = Depends(get_db),
):
    order = create_rental_order(db=db, order_data=order_data)
    data = {
        "order_id": order.order_id,
        "renter_id": order.renter_id,
        "vehicle_id": order.vehicle_id,
        "price_id": order.price_id,
        "start_time": order.start_time.isoformat() if order.start_time else None,
        "end_time": order.end_time.isoformat() if order.end_time else None,
        "delivery_method": order.delivery_method,
        "delivery_address": order.delivery_address,
        "delivery_distance_km": float(order.delivery_distance_km) if order.delivery_distance_km is not None else 0.0,
        "delivery_fee": float(order.delivery_fee) if order.delivery_fee is not None else 0.0,
        "total_amount": float(order.total_amount) if order.total_amount is not None else 0.0,
        "order_status": order.order_status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }
    return create_response(request, status.HTTP_201_CREATED, "Tạo đơn đặt xe thành công", data)
