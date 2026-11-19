from typing import Optional
from fastapi import APIRouter, Depends, Request, status, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
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
from app.utils.response import create_response

router = APIRouter(tags=["Booking Eligibility & Vehicle Search (TF13D97)"])


@router.put("/users/{user_id}/profile", status_code=status.HTTP_200_OK)
def update_profile_endpoint(
    request: Request,
    user_id: int,
    profile_data: UserProfileUpdateSchema,
    db: Session = Depends(get_db),
):
    user = update_user_profile(db, user_id=user_id, profile_data=profile_data)
    data = {
        "user_id": user.user_id,
        "fullname": user.fullname,
        "email": user.email,
        "phone_number": user.phone_number,
        "date_of_birth": user.date_of_birth.isoformat() if user.date_of_birth else None,
        "age": calculate_age(user.date_of_birth) if user.date_of_birth else None,
        "address": user.address,
    }
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
        "total_amount": float(order.total_amount) if order.total_amount is not None else 0.0,
        "order_status": order.order_status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }
    return create_response(request, status.HTTP_201_CREATED, "Tạo đơn đặt xe thành công", data)
