from datetime import date, datetime, timezone
from decimal import Decimal
import math
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.drivers_license import DriverLicense
from app.models.vehicle import Vehicle
from app.models.price_table import PriceTable
from app.models.order import Order
from app.schemas.booking_eligibility_schemas import (
    calculate_age,
    UserProfileUpdateSchema,
    DriverLicenseSubmitSchema,
    OrderCreateSchema,
)
from app.services.delivery_services import calculate_and_validate_delivery_fee


MOTORBIKE_TYPES = {"Xe tay ga", "Xe số"}
CAR_TYPES = {"Ô tô 4 chỗ", "Ô tô 7 chỗ", "Ô tô 16 chỗ"}

MOTORBIKE_LICENSES = {"A1", "A"}
CAR_LICENSES = {"B1", "C"}


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def validate_user_age_18_plus(dob: Optional[date]) -> int:
    """
    Kiểm tra người dùng có ngày sinh hợp lệ và từ đủ 18 tuổi trở lên hay không.
    """
    if dob is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chưa cập nhật ngày sinh. Vui lòng cập nhật hồ sơ cá nhân (yêu cầu từ đủ 18 tuổi).",
        )
    today = date.today()
    if dob > today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày sinh không hợp lệ (lớn hơn ngày hiện tại).",
        )
    age = calculate_age(dob, today=today)
    if age < 18:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Người dùng chưa đủ 18 tuổi (hiện tại {age} tuổi), không đủ điều kiện thuê xe.",
        )
    return age


def check_license_compatibility(vehicle_type: Optional[str], license_class: Optional[str]) -> bool:
    """
    Kiểm tra hạng giấy phép lái xe có phù hợp với loại phương tiện hay không.
    - Xe máy (Xe tay ga, Xe số): cần bằng A1 hoặc A.
    - Ô tô (4 chỗ, 7 chỗ, 16 chỗ): cần bằng B1 hoặc C.
    """
    if not vehicle_type or not license_class:
        return False
    if vehicle_type in MOTORBIKE_TYPES:
        return license_class in MOTORBIKE_LICENSES
    if vehicle_type in CAR_TYPES:
        return license_class in CAR_LICENSES
    return True


def update_user_profile(
    db: Session,
    user_id: int,
    profile_data: UserProfileUpdateSchema,
) -> User:
    """
    Cập nhật thông tin hồ sơ cá nhân (Họ tên, ngày sinh >= 18 tuổi, địa chỉ, SĐT).
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID {user_id}",
        )

    validate_user_age_18_plus(profile_data.date_of_birth)

    user.fullname = profile_data.fullname
    user.date_of_birth = profile_data.date_of_birth
    user.address = profile_data.address
    if profile_data.phone_number is not None:
        cleaned_phone = profile_data.phone_number.strip()
        user.phone_number = cleaned_phone if cleaned_phone else None

    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể cập nhật hồ sơ cá nhân: {str(e)}",
        )


def submit_driver_license(
    db: Session,
    user_id: int,
    license_data: DriverLicenseSubmitSchema,
) -> DriverLicense:
    """
    Người dùng nộp hoặc cập nhật hồ sơ Giấy phép lái xe (chuyển sang trạng thái 'Đang chờ').
    Yêu cầu người dùng phải từ đủ 18 tuổi trở lên.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người dùng với ID {user_id}",
        )

    validate_user_age_18_plus(user.date_of_birth)

    license_record = db.query(DriverLicense).filter(DriverLicense.user_id == user_id).first()
    if license_record:
        license_record.license_number = license_data.license_number
        license_record.license_class = license_data.license_class
        license_record.issue_date = license_data.issue_date.replace(tzinfo=None)
        license_record.expiry_date = license_data.expiry_date.replace(tzinfo=None)
        license_record.verification_status = "Đang chờ"
        license_record.rejected_reason = None
        license_record.verified_at = None
        license_record.verified_by = None
    else:
        license_record = DriverLicense(
            user_id=user_id,
            license_number=license_data.license_number,
            license_class=license_data.license_class,
            issue_date=license_data.issue_date.replace(tzinfo=None),
            expiry_date=license_data.expiry_date.replace(tzinfo=None),
            verification_status="Đang chờ",
        )
        db.add(license_record)

    try:
        db.commit()
        db.refresh(license_record)
        return license_record
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể lưu thông tin giấy phép lái xe: {str(e)}",
        )


def search_vehicles(
    db: Session,
    vehicle_type: Optional[str] = None,
    brand: Optional[str] = None,
    status_filter: Optional[str] = "Available",
    user_id: Optional[int] = None,
) -> List[Vehicle]:
    """
    Tìm kiếm danh sách phương tiện.
    Theo đặc tả TF13D97 (TC33): Tài khoản chưa nộp hoặc chưa duyệt GPLX
    vẫn được phép tìm kiếm và xem danh sách xe bình thường.
    """
    query = db.query(Vehicle)

    if vehicle_type:
        query = query.filter(Vehicle.type == vehicle_type)
    if brand:
        query = query.filter(Vehicle.brand.ilike(f"%{brand}%"))
    if status_filter:
        query = query.filter(Vehicle.status == status_filter)

    return query.order_by(Vehicle.vehicle_id.asc()).all()


def create_rental_order(
    db: Session,
    order_data: OrderCreateSchema,
) -> Order:
    """
    Tạo đơn đặt xe (TF13D97 + Cấu hình giao nhận & tính phí giao xe):
    1. Kiểm tra khách hàng tồn tại và đủ 18 tuổi trở lên.
    2. Kiểm tra khách hàng đã có GPLX và GPLX phải ở trạng thái 'Đã xác thực'.
    3. Kiểm tra GPLX còn thời hạn sử dụng & hạng GPLX phù hợp với loại xe.
    4. Kiểm tra phương thức giao nhận (Nhận tại cửa hàng hoặc Giao tận nơi trong bán kính quy định) và tính phí giao xe tương ứng.
    """
    renter = db.query(User).filter(User.user_id == order_data.renter_id).first()
    if not renter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy khách hàng với ID {order_data.renter_id}",
        )

    # 1. Kiểm tra từ đủ 18 tuổi
    validate_user_age_18_plus(renter.date_of_birth)

    # 2. Kiểm tra trạng thái duyệt Giấy phép lái xe
    license_record = db.query(DriverLicense).filter(DriverLicense.user_id == order_data.renter_id).first()
    if not license_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chưa cập nhật giấy phép lái xe, không được phép tạo đơn thuê.",
        )

    if license_record.verification_status != "Đã xác thực":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Giấy phép lái xe chưa được duyệt (trạng thái hiện tại: {license_record.verification_status}), không được phép tạo đơn thuê.",
        )

    now_utc = get_utc_now()
    if license_record.expiry_date and license_record.expiry_date.replace(tzinfo=None) < now_utc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Giấy phép lái xe đã hết hạn, không được phép tạo đơn thuê.",
        )

    # 3. Kiểm tra xe và tính tương thích hạng bằng lái
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == order_data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phương tiện với ID {order_data.vehicle_id}",
        )

    if not check_license_compatibility(vehicle.type, license_record.license_class):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Hạng giấy phép lái xe ({license_record.license_class}) không phù hợp để thuê loại xe '{vehicle.type}'.",
        )

    # 4. Kiểm tra phương thức giao nhận, bán kính giao xe & tính phí giao xe tương ứng
    delivery_info = calculate_and_validate_delivery_fee(
        db=db,
        delivery_method=order_data.delivery_method,
        delivery_distance_km=order_data.delivery_distance_km,
        delivery_address=order_data.delivery_address,
    )

    # 5. Tính tổng tiền đơn thuê (tiền thuê xe + phí giao xe)
    price_record = None
    if order_data.price_id:
        price_record = db.query(PriceTable).filter(PriceTable.price_id == order_data.price_id).first()
    if not price_record:
        price_record = db.query(PriceTable).filter(PriceTable.vehicle_id == vehicle.vehicle_id).first()

    start_naive = order_data.start_time.replace(tzinfo=None)
    end_naive = order_data.end_time.replace(tzinfo=None)
    elapsed_seconds = round((end_naive - start_naive).total_seconds())
    duration_days = max(1, math.ceil(elapsed_seconds / 86400))

    unit_amount = Decimal(str(price_record.amount)) if (price_record and price_record.amount) else Decimal("0.00")
    rental_amount = (unit_amount * Decimal(duration_days)).quantize(Decimal("0.01"))
    delivery_fee = delivery_info["delivery_fee"]
    total_amount = (rental_amount + delivery_fee).quantize(Decimal("0.01"))

    new_order = Order(
        renter_id=order_data.renter_id,
        vehicle_id=order_data.vehicle_id,
        price_id=price_record.price_id if price_record else order_data.price_id,
        start_time=start_naive,
        end_time=end_naive,
        delivery_method=delivery_info["delivery_method"],
        delivery_address=delivery_info["delivery_address"],
        delivery_distance_km=delivery_info["delivery_distance_km"],
        delivery_fee=delivery_fee,
        total_amount=total_amount,
        order_status="Chờ thanh toán",
        created_at=now_utc,
    )

    try:
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        return new_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể tạo đơn đặt xe: {str(e)}",
        )
