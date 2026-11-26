"""
Nghiệp vụ xử lý hạn xác nhận đơn 15 phút của cửa hàng (Task TF14679):
- Cửa hàng có 15 phút để xác nhận hoặc từ chối đơn thuê (kèm lý do bắt buộc).
- Nếu quá hạn 15 phút chưa phản hồi, hệ thống tự động chuyển đơn sang trạng thái
  'Chờ vận hành viên xử lý' và khóa thao tác xác nhận/từ chối của cửa hàng.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.store import Store
from app.models.system_config import SystemConfig
from app.models.user import User
from app.models.vehicle import Vehicle

# Thời hạn mặc định (phút) để cửa hàng xác nhận hoặc từ chối đơn thuê
STORE_CONFIRMATION_TIMEOUT_MINUTES_DEFAULT = 15

# Các hằng số trạng thái đơn thuê phục vụ luồng SLA 15 phút
STATUS_PENDING_CONFIRMATION = "Chờ cửa hàng xác nhận"
PENDING_CONFIRMATION_STATUSES = {
    STATUS_PENDING_CONFIRMATION,
    "Chờ thanh toán",
    "Đã đặt cọc",
}
STATUS_CONFIRMED = "Đã xác nhận"
STATUS_REJECTED = "Cửa hàng từ chối"
STATUS_ESCALATED_OPERATOR = "Chờ vận hành viên xử lý"


def _now_utc_naive() -> datetime:
    """Lấy thời gian hiện tại theo UTC dạng naive datetime để so sánh đồng nhất với DB."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_confirmation_timeout_minutes(db: Session) -> int:
    """
    Đọc cấu hình số phút giữ chỗ / hạn cửa hàng xác nhận đơn từ dịch vụ cấu hình tập trung
    (đồng bộ `hold_time_minutes` và `store_confirmation_timeout_minutes`, mặc định 15 phút).
    """
    from app.services.system_config_services import get_hold_time_minutes

    return get_hold_time_minutes(db)


def get_effective_deadline(order: Order, timeout_minutes: int) -> Optional[datetime]:
    """
    Xác định mốc hết hạn xác nhận của đơn thuê:
    - Ưu tiên dùng cột confirmation_deadline đã lưu trên đơn.
    - Với đơn cũ chưa có confirmation_deadline, tự tính bằng created_at + timeout_minutes.
    """
    if order.confirmation_deadline is not None:
        return order.confirmation_deadline.replace(tzinfo=None)
    if order.created_at is not None:
        return order.created_at.replace(tzinfo=None) + timedelta(minutes=timeout_minutes)
    return None


def serialize_store_order(db: Session, order: Order, now_utc: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Chuyển đối tượng Order thành dict trả về cho API cửa hàng / vận hành viên,
    kèm thông tin khách thuê, xe, cửa hàng và thời gian đếm ngược SLA (remaining_seconds).
    """
    now = now_utc or _now_utc_naive()
    timeout_minutes = get_confirmation_timeout_minutes(db)
    deadline = get_effective_deadline(order, timeout_minutes)

    # Tính số giây còn lại trong hạn 15 phút và cờ quá hạn
    remaining_seconds = 0
    is_overdue = False
    if order.order_status in PENDING_CONFIRMATION_STATUSES and deadline is not None:
        diff = int((deadline - now).total_seconds())
        remaining_seconds = max(0, diff)
        is_overdue = diff <= 0
    elif order.order_status == STATUS_ESCALATED_OPERATOR:
        is_overdue = True

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == order.vehicle_id).first()
    store = db.query(Store).filter(Store.store_id == vehicle.store_id).first() if vehicle else None
    renter = db.query(User).filter(User.user_id == order.renter_id).first()

    # Ghép tên hiển thị của xe từ hãng + dòng xe (fallback sang loại xe nếu thiếu)
    vehicle_name = ""
    if vehicle:
        vehicle_name = " ".join(p for p in [vehicle.brand, vehicle.model] if p).strip() or (vehicle.type or f"Xe #{vehicle.vehicle_id}")

    return {
        "order_id": order.order_id,
        "order_code": f"ORD-{order.order_id}",
        "renter_id": order.renter_id,
        "renter_name": renter.fullname if renter else None,
        "renter_phone": renter.phone_number if renter else None,
        "vehicle_id": order.vehicle_id,
        "vehicle_name": vehicle_name,
        "store_id": store.store_id if store else None,
        "store_name": store.store_name if store else None,
        "start_time": order.start_time.isoformat() if order.start_time else None,
        "end_time": order.end_time.isoformat() if order.end_time else None,
        "delivery_method": order.delivery_method,
        "delivery_address": order.delivery_address,
        "rental_amount": float(order.rental_amount) if order.rental_amount is not None else 0.0,
        "delivery_fee": float(order.delivery_fee) if order.delivery_fee is not None else 0.0,
        "deposit_amount": float(order.deposit_amount) if order.deposit_amount is not None else 0.0,
        "remaining_amount": float(order.remaining_amount) if order.remaining_amount is not None else 0.0,
        "total_amount": float(order.total_amount) if order.total_amount is not None else 0.0,
        "note": order.note,
        "order_status": order.order_status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "confirmation_deadline": deadline.isoformat() if deadline else None,
        "remaining_seconds": remaining_seconds,
        "is_overdue": is_overdue,
        "store_responded_at": order.store_responded_at.isoformat() if order.store_responded_at else None,
        "rejection_reason": order.rejection_reason,
        "escalated_at": order.escalated_at.isoformat() if order.escalated_at else None,
    }


def escalate_overdue_orders(db: Session, now_utc: Optional[datetime] = None) -> List[Order]:
    """
    Quét toàn bộ đơn đang chờ cửa hàng xác nhận nhưng đã quá hạn 15 phút
    và tự động chuyển sang trạng thái 'Chờ vận hành viên xử lý'.
    """
    now = now_utc or _now_utc_naive()
    timeout_minutes = get_confirmation_timeout_minutes(db)

    pending_orders = (
        db.query(Order)
        .filter(Order.order_status.in_(PENDING_CONFIRMATION_STATUSES))
        .all()
    )

    escalated: List[Order] = []
    for order in pending_orders:
        deadline = get_effective_deadline(order, timeout_minutes)
        if deadline is not None and deadline <= now:
            order.order_status = STATUS_ESCALATED_OPERATOR
            order.escalated_at = now
            if order.confirmation_deadline is None:
                order.confirmation_deadline = deadline
            escalated.append(order)

    if escalated:
        db.commit()
        for order in escalated:
            db.refresh(order)

    return escalated


def _load_and_authorize_order(
    db: Session,
    order_id: int,
    owner_id: Optional[int] = None,
) -> Order:
    """
    Tìm đơn thuê theo ID và kiểm tra quyền sở hữu cửa hàng:
    - Trả về 404 nếu đơn không tồn tại.
    - Trả về 403 nếu owner_id không phải chủ cửa hàng sở hữu chiếc xe trong đơn.
    """
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn thuê với ID {order_id}.",
        )

    if owner_id is not None:
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == order.vehicle_id).first()
        store = db.query(Store).filter(Store.store_id == vehicle.store_id).first() if vehicle else None
        if not store or store.owner_id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xác nhận hoặc từ chối đơn thuê của cửa hàng khác.",
            )

    return order


def _ensure_within_sla_or_escalate(db: Session, order: Order, now: datetime) -> None:
    """
    Kiểm tra đơn thuê còn trong hạn 15 phút hay chưa trước khi cho phép xác nhận/từ chối:
    - Nếu đơn đã ở trạng thái chờ vận hành viên hoặc đã xử lý trước đó → báo lỗi 409.
    - Nếu đơn vừa vượt quá mốc 15 phút → tự động chuyển sang 'Chờ vận hành viên xử lý',
      lưu vào DB rồi báo lỗi 409 để cửa hàng biết đơn đã bị chuyển xử lý.
    """
    if order.order_status == STATUS_ESCALATED_OPERATOR:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Đơn thuê đã quá hạn 15 phút xác nhận và đã được chuyển sang trạng thái 'Chờ vận hành viên xử lý'.",
        )

    if order.order_status not in PENDING_CONFIRMATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Đơn thuê hiện ở trạng thái '{order.order_status}', không thể xác nhận hoặc từ chối.",
        )

    timeout_minutes = get_confirmation_timeout_minutes(db)
    deadline = get_effective_deadline(order, timeout_minutes)
    if deadline is not None and deadline <= now:
        order.order_status = STATUS_ESCALATED_OPERATOR
        order.escalated_at = now
        if order.confirmation_deadline is None:
            order.confirmation_deadline = deadline
        db.commit()
        db.refresh(order)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Đơn thuê đã quá hạn 15 phút xác nhận và đã được chuyển sang trạng thái 'Chờ vận hành viên xử lý'.",
        )


def confirm_store_order(
    db: Session,
    order_id: int,
    owner_id: Optional[int] = None,
    now_utc: Optional[datetime] = None,
) -> Order:
    """
    Cửa hàng xác nhận đơn thuê trong hạn 15 phút.
    Cập nhật trạng thái thành 'Đã xác nhận' và ghi nhận thời điểm phản hồi store_responded_at.
    """
    now = now_utc or _now_utc_naive()
    order = _load_and_authorize_order(db, order_id=order_id, owner_id=owner_id)
    _ensure_within_sla_or_escalate(db, order, now)

    order.order_status = STATUS_CONFIRMED
    order.store_responded_at = now
    db.commit()
    db.refresh(order)
    return order


def reject_store_order(
    db: Session,
    order_id: int,
    rejection_reason: str,
    owner_id: Optional[int] = None,
    now_utc: Optional[datetime] = None,
) -> Order:
    """
    Cửa hàng từ chối đơn thuê trong hạn 15 phút kèm lý do bắt buộc (>= 3 ký tự).
    Cập nhật trạng thái thành 'Cửa hàng từ chối', lưu lý do và thời điểm phản hồi.
    """
    cleaned_reason = (rejection_reason or "").strip()
    if len(cleaned_reason) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Lý do từ chối là bắt buộc và phải có ít nhất 3 ký tự.",
        )

    now = now_utc or _now_utc_naive()
    order = _load_and_authorize_order(db, order_id=order_id, owner_id=owner_id)
    _ensure_within_sla_or_escalate(db, order, now)

    order.order_status = STATUS_REJECTED
    order.rejection_reason = cleaned_reason
    order.store_responded_at = now
    db.commit()
    db.refresh(order)
    return order


def list_store_orders(
    db: Session,
    store_id: Optional[int] = None,
    owner_id: Optional[int] = None,
    order_status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Lấy danh sách đơn thuê của cửa hàng (lọc theo store_id, owner_id hoặc trạng thái).
    Tự động quét và chuyển các đơn quá hạn 15 phút trước khi trả dữ liệu.
    """
    now = _now_utc_naive()
    escalate_overdue_orders(db, now_utc=now)

    query = db.query(Order).join(Vehicle, Order.vehicle_id == Vehicle.vehicle_id)
    if store_id is not None:
        query = query.filter(Vehicle.store_id == store_id)
    elif owner_id is not None:
        query = query.join(Store, Vehicle.store_id == Store.store_id).filter(Store.owner_id == owner_id)

    if order_status:
        query = query.filter(Order.order_status == order_status)

    orders = query.order_by(Order.created_at.desc(), Order.order_id.desc()).all()
    return [serialize_store_order(db, o, now_utc=now) for o in orders]


def list_escalated_orders_for_operator(db: Session) -> List[Dict[str, Any]]:
    """
    Lấy danh sách toàn bộ đơn quá hạn 15 phút đang ở trạng thái 'Chờ vận hành viên xử lý',
    sắp xếp ưu tiên các đơn mới bị chuyển gần nhất lên đầu.
    """
    now = _now_utc_naive()
    escalate_overdue_orders(db, now_utc=now)

    orders = (
        db.query(Order)
        .filter(Order.order_status == STATUS_ESCALATED_OPERATOR)
        .order_by(Order.escalated_at.desc(), Order.order_id.desc())
        .all()
    )
    return [serialize_store_order(db, o, now_utc=now) for o in orders]
