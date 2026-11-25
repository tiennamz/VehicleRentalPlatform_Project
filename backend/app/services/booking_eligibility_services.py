from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import math
from typing import Optional, List, Sequence, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.drivers_license import DriverLicense
from app.models.vehicle import Vehicle
from app.models.price_table import PriceTable
from app.models.order import Order
from app.models.system_config import SystemConfig
from app.schemas.booking_eligibility_schemas import (
    calculate_age,
    UserProfileUpdateSchema,
    DriverLicenseSubmitSchema,
    OrderCalculateRequestSchema,
    OrderCreateSchema,
)
from app.schemas.vehicle_search_schemas import VehicleSearchItem
from app.services.delivery_services import calculate_and_validate_delivery_fee
from app.services.vehicle_search_services import search_and_sort_vehicles

DEPOSIT_RATE_DEFAULT = Decimal("30")
DEPOSIT_MIN_VND = Decimal("200000.00")
DEPOSIT_MAX_VND = Decimal("1000000.00")
INACTIVE_ORDER_STATUSES = {
    "Đã hủy",
    "Hoàn thành",
    "Cửa hàng từ chối",
    "Từ chối",
    "Cancelled",
    "Completed",
    "Rejected",
}
AVAILABLE_VEHICLE_STATUSES = {"Sẵn sàng", "Available"}


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
    vehicle_type: Optional[Sequence[str] | str] = None,
    brand: Optional[Sequence[str] | str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    delivery_method: Optional[Sequence[str] | str] = None,
    min_rating: Optional[float] = None,
    city: Optional[str] = None,
    city_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_distance_km: Optional[float] = None,
    sort_by: Optional[str] = "default",
    sort_order: Optional[str] = None,
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
) -> List[VehicleSearchItem]:
    """
    Tìm kiếm danh sách phương tiện.
    Theo đặc tả TF13D97 (TC33): Tài khoản chưa nộp hoặc chưa duyệt GPLX
    vẫn được phép tìm kiếm và xem danh sách xe bình thường.
    """
    return search_and_sort_vehicles(
        db=db,
        vehicle_type=vehicle_type,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        delivery_method=delivery_method,
        min_rating=min_rating,
        city=city,
        city_id=city_id,
        start_time=start_time,
        end_time=end_time,
        user_lat=user_lat,
        user_lng=user_lng,
        max_distance_km=max_distance_km,
        sort_by=sort_by,
        sort_order=sort_order,
        status_filter=status_filter,
        user_id=user_id,
    )


def _get_deposit_rate(db: Session) -> Decimal:
    row = db.query(SystemConfig).filter(SystemConfig.config_key == "deposit_rate").first()
    if row and row.config_value:
        try:
            rate = Decimal(str(row.config_value).strip())
            if Decimal("0") < rate <= Decimal("100"):
                return rate
        except Exception:
            pass
    return DEPOSIT_RATE_DEFAULT


def calculate_deposit_br03(db: Session, total_amount: Decimal) -> Dict[str, Any]:
    """
    Tính tiền cọc theo quy tắc BR-03:
    - Mặc định 30% tổng tiền đơn thuê (hoặc theo cấu hình deposit_rate).
    - Tối thiểu 200.000đ, tối đa 1.000.000đ/đơn.
    - Trường hợp tổng tiền < 200.000đ: cọc bằng tổng tiền để số tiền còn lại không âm.
    """
    total = Decimal(str(total_amount)).quantize(Decimal("0.01"))
    if total <= Decimal("0.00"):
        return {
            "deposit_rate": _get_deposit_rate(db),
            "deposit_min": DEPOSIT_MIN_VND,
            "deposit_max": DEPOSIT_MAX_VND,
            "deposit_amount": Decimal("0.00"),
            "remaining_amount": Decimal("0.00"),
            "deposit_rule_note": "Không phát sinh tiền cọc",
        }

    rate = _get_deposit_rate(db)
    raw_deposit = (total * rate / Decimal("100")).quantize(Decimal("0.01"))

    if total < DEPOSIT_MIN_VND:
        deposit = total
        rule_note = "Tổng đơn nhỏ hơn mức cọc tối thiểu 200.000đ — thanh toán 100% đơn"
    elif raw_deposit < DEPOSIT_MIN_VND:
        deposit = DEPOSIT_MIN_VND
        rule_note = f"{rate}% tổng đơn — áp dụng mức cọc tối thiểu 200.000đ (BR-03)"
    elif raw_deposit > DEPOSIT_MAX_VND:
        deposit = DEPOSIT_MAX_VND
        rule_note = f"{rate}% tổng đơn — áp dụng mức cọc tối đa 1.000.000đ (BR-03)"
    else:
        deposit = raw_deposit
        rule_note = f"{rate}% tổng tiền đơn thuê (BR-03)"

    remaining = (total - deposit).quantize(Decimal("0.01"))
    return {
        "deposit_rate": rate,
        "deposit_min": DEPOSIT_MIN_VND,
        "deposit_max": DEPOSIT_MAX_VND,
        "deposit_amount": deposit,
        "remaining_amount": remaining,
        "deposit_rule_note": rule_note,
    }


def calculate_order_pricing(
    db: Session,
    calc_req: OrderCalculateRequestSchema,
) -> Dict[str, Any]:
    """
    Tính trước đầy đủ chi phí đơn thuê: tiền thuê, phí giao nhận, tổng tiền,
    tiền cọc theo BR-03 và số tiền trả khi nhận xe.
    """
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == calc_req.vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phương tiện với ID {calc_req.vehicle_id}",
        )

    delivery_info = calculate_and_validate_delivery_fee(
        db=db,
        delivery_method=calc_req.delivery_method,
        delivery_distance_km=calc_req.delivery_distance_km,
        delivery_address=calc_req.delivery_address,
    )

    price_record = None
    if calc_req.price_id:
        price_record = db.query(PriceTable).filter(PriceTable.price_id == calc_req.price_id).first()
    if not price_record:
        price_record = (
            db.query(PriceTable)
            .filter(PriceTable.vehicle_id == vehicle.vehicle_id)
            .order_by(PriceTable.price_id.desc())
            .first()
        )

    start_naive = calc_req.start_time.replace(tzinfo=None)
    end_naive = calc_req.end_time.replace(tzinfo=None)
    elapsed_seconds = round((end_naive - start_naive).total_seconds())
    duration_hours = max(1, math.ceil(elapsed_seconds / 3600))
    duration_days = max(1, math.ceil(elapsed_seconds / 86400))

    unit_amount = Decimal(str(price_record.amount)) if (price_record and price_record.amount) else Decimal("0.00")
    rental_amount = (unit_amount * Decimal(duration_hours)).quantize(Decimal("0.01"))
    delivery_fee = delivery_info["delivery_fee"]
    total_amount = (rental_amount + delivery_fee).quantize(Decimal("0.01"))
    br03 = calculate_deposit_br03(db, total_amount)

    return {
        "vehicle_id": vehicle.vehicle_id,
        "price_id": price_record.price_id if price_record else calc_req.price_id,
        "duration_hours": duration_hours,
        "duration_days": duration_days,
        "unit_price": unit_amount.quantize(Decimal("0.01")),
        "rental_amount": rental_amount,
        "delivery_method": delivery_info["delivery_method"],
        "delivery_address": delivery_info["delivery_address"],
        "delivery_distance_km": delivery_info["delivery_distance_km"],
        "delivery_fee": delivery_fee,
        "total_amount": total_amount,
        "deposit_rate": br03["deposit_rate"],
        "deposit_amount": br03["deposit_amount"],
        "remaining_amount": br03["remaining_amount"],
        "deposit_rule_note": br03["deposit_rule_note"],
    }


def get_order_by_id(db: Session, order_id: int) -> Order:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn thuê với ID {order_id}",
        )
    return order


def create_rental_order(
    db: Session,
    order_data: OrderCreateSchema,
) -> Order:
    """
    Tạo đơn đặt xe (TF13D97 + Cấu hình giao nhận & tính phí giao xe + BR-03):
    1. Kiểm tra khách hàng tồn tại và đủ 18 tuổi trở lên.
    2. Kiểm tra khách hàng đã có GPLX và GPLX phải ở trạng thái 'Đã xác thực'.
    3. Kiểm tra GPLX còn thời hạn sử dụng & hạng GPLX phù hợp với loại xe.
    4. Kiểm tra trùng lịch đặt xe.
    5. Kiểm tra phương thức giao nhận, tính tiền thuê, phí giao, tiền cọc BR-03 và số tiền trả khi nhận xe.
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

    # 3b. Kiểm tra trạng thái vật lý của xe (chặn nếu xe đang thuê, đang bảo trì hoặc đã xóa)
    if vehicle.status is not None and vehicle.status not in AVAILABLE_VEHICLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Phương tiện hiện ở trạng thái '{vehicle.status}', không thể tạo đơn thuê.",
        )

    # 4. Kiểm tra trùng lịch đặt xe
    start_naive = order_data.start_time.replace(tzinfo=None)
    end_naive = order_data.end_time.replace(tzinfo=None)
    conflict_order = (
        db.query(Order)
        .filter(
            Order.vehicle_id == vehicle.vehicle_id,
            or_(Order.order_status.is_(None), ~Order.order_status.in_(INACTIVE_ORDER_STATUSES)),
            Order.start_time < end_naive,
            Order.end_time > start_naive,
        )
        .first()
    )
    if conflict_order:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Xe đã có đơn đặt trong khoảng thời gian bạn chọn. Vui lòng chọn lịch khác.",
        )

    # 5. Tính tiền thuê, phí giao nhận, tiền cọc BR-03 & số tiền trả khi nhận xe
    pricing = calculate_order_pricing(
        db=db,
        calc_req=OrderCalculateRequestSchema(
            vehicle_id=order_data.vehicle_id,
            price_id=order_data.price_id,
            start_time=start_naive,
            end_time=end_naive,
            delivery_method=order_data.delivery_method,
            delivery_address=order_data.delivery_address,
            delivery_distance_km=order_data.delivery_distance_km,
        ),
    )

    new_order = Order(
        renter_id=order_data.renter_id,
        vehicle_id=order_data.vehicle_id,
        price_id=pricing["price_id"],
        start_time=start_naive,
        end_time=end_naive,
        delivery_method=pricing["delivery_method"],
        delivery_address=pricing["delivery_address"],
        delivery_distance_km=pricing["delivery_distance_km"],
        delivery_fee=pricing["delivery_fee"],
        rental_amount=pricing["rental_amount"],
        deposit_amount=pricing["deposit_amount"],
        remaining_amount=pricing["remaining_amount"],
        total_amount=pricing["total_amount"],
        note=order_data.note,
        order_status="Chờ thanh toán",
        created_at=now_utc,
        confirmation_deadline=now_utc + timedelta(minutes=15),
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
