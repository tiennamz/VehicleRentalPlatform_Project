"""
Nghiệp vụ xác nhận bàn giao nhận xe 2 chiều (Task TF148C7):
- Cả KHÁCH HÀNG và NHÂN VIÊN CỬA HÀNG đều phải xác nhận bàn giao (handover_in_out = 'OUT')
  thì đơn thuê mới được chuyển từ trạng thái 'Đã xác nhận' sang 'Đang thuê'.
- Nếu chỉ mới 1 bên xác nhận, đơn giữ nguyên 'Đã xác nhận' và báo rõ đang chờ bên còn lại.
- Khi cả 2 bên đã xác nhận: cập nhật order_status = 'Đang thuê', vehicle.status = 'Đang thuê'
  và ghi nhận mốc thời gian bàn giao handover_at.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.handover_record import HandoverRecord
from app.models.order import Order
from app.models.store import Store
from app.models.user import User
from app.models.vehicle import Vehicle

STATUS_CONFIRMED = "Đã xác nhận"
STATUS_ACTIVE_RENTAL = "Đang thuê"
HANDOVER_DIRECTION_OUT = "OUT"
STAFF_ALLOWED_ROLES = {"Staff", "Store", "Admin", "Nhân viên", "Chủ cửa hàng", "Vận hành viên"}


def _now_utc_naive() -> datetime:
    """Lấy thời điểm hiện tại theo UTC dạng naive datetime để lưu đồng nhất vào DB."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_order_or_404(db: Session, order_id: int) -> Order:
    """Tìm đơn thuê theo ID, trả về 404 nếu không tồn tại."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn thuê với ID {order_id}.",
        )
    return order


def _get_or_create_pickup_handover(db: Session, order: Order) -> HandoverRecord:
    """
    Lấy biên bản bàn giao nhận xe (OUT) hiện có của đơn thuê;
    nếu chưa có thì khởi tạo mới với trạng thái cả 2 bên đều chưa xác nhận.
    """
    record = (
        db.query(HandoverRecord)
        .filter(
            HandoverRecord.order_id == order.order_id,
            HandoverRecord.handover_in_out == HANDOVER_DIRECTION_OUT,
        )
        .first()
    )
    if not record:
        record = HandoverRecord(
            order_id=order.order_id,
            handover_type="Bàn giao nhận xe",
            handover_in_out=HANDOVER_DIRECTION_OUT,
            staff_confirmed=False,
            customer_confirmed=False,
        )
        db.add(record)
        db.flush()
    return record


def _verify_staff_permission(db: Session, order: Order, staff_id: Optional[int]) -> None:
    """
    Kiểm tra quyền xác nhận phía nhân viên / cửa hàng:
    - Cấm khách thuê tự xác nhận thay nhân viên (403).
    - Cho phép chủ cửa hàng sở hữu xe hoặc tài khoản có vai trò nhân viên/quản trị.
    """
    if staff_id is None:
        return

    if staff_id == order.renter_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Khách thuê không có quyền thực hiện xác nhận bàn giao của nhân viên.",
        )

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == order.vehicle_id).first()
    store = db.query(Store).filter(Store.store_id == vehicle.store_id).first() if vehicle else None
    if store and store.owner_id == staff_id:
        return

    user = db.query(User).filter(User.user_id == staff_id).first()
    if user:
        role_names = {ur.role.role_name for ur in (user.user_roles or []) if ur.role and ur.role.role_name}
        if role_names & STAFF_ALLOWED_ROLES:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền xác nhận bàn giao xe cho cửa hàng này.",
    )


def _merge_condition_note(existing: Optional[str], prefix: str, new_note: Optional[str]) -> Optional[str]:
    """Gộp ghi chú tình trạng xe từ cả nhân viên và khách hàng, giới hạn tối đa 255 ký tự."""
    if not new_note or not new_note.strip():
        return existing
    entry = f"{prefix}: {new_note.strip()}"
    if not existing:
        return entry[:255]
    combined = f"{existing} | {entry}"
    return combined[:255]


def _serialize_handover_state(order: Order, record: Optional[HandoverRecord]) -> Dict[str, Any]:
    """Chuyển trạng thái xác nhận bàn giao 2 chiều thành dict trả về cho API."""
    staff_ok = bool(record.staff_confirmed) if record else False
    customer_ok = bool(record.customer_confirmed) if record else False
    both_ok = staff_ok and customer_ok

    if both_ok:
        waiting_for = None
    elif staff_ok and not customer_ok:
        waiting_for = "customer"
    elif customer_ok and not staff_ok:
        waiting_for = "staff"
    else:
        waiting_for = "both"

    return {
        "order_id": order.order_id,
        "order_status": order.order_status,
        "handover_id": record.handover_id if record else None,
        "staff_id": record.staff_id if record else None,
        "staff_confirmed": staff_ok,
        "staff_confirmed_at": record.staff_confirmed_at.isoformat() if (record and record.staff_confirmed_at) else None,
        "customer_confirmed": customer_ok,
        "customer_confirmed_at": record.customer_confirmed_at.isoformat() if (record and record.customer_confirmed_at) else None,
        "both_confirmed": both_ok,
        "waiting_for": waiting_for,
        "handover_at": record.handover_at.isoformat() if (record and record.handover_at) else None,
        "condition_note": record.condition_note if record else None,
    }


def _apply_active_rental_if_both_confirmed(
    db: Session,
    order: Order,
    record: HandoverRecord,
    now: datetime,
) -> None:
    """
    Chỉ chuyển đơn thuê và phương tiện sang trạng thái 'Đang thuê' khi
    CẢ nhân viên VÀ khách hàng đã hoàn tất xác nhận bàn giao.
    """
    if record.staff_confirmed and record.customer_confirmed:
        order.order_status = STATUS_ACTIVE_RENTAL
        record.handover_at = now
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == order.vehicle_id).first()
        if vehicle:
            vehicle.status = STATUS_ACTIVE_RENTAL


def get_handover_status(db: Session, order_id: int) -> Dict[str, Any]:
    """Lấy tiến độ xác nhận bàn giao 2 chiều hiện tại của một đơn thuê."""
    order = _get_order_or_404(db, order_id)
    record = (
        db.query(HandoverRecord)
        .filter(
            HandoverRecord.order_id == order.order_id,
            HandoverRecord.handover_in_out == HANDOVER_DIRECTION_OUT,
        )
        .first()
    )
    return _serialize_handover_state(order, record)


def staff_confirm_handover(
    db: Session,
    order_id: int,
    staff_id: Optional[int] = None,
    condition_note: Optional[str] = None,
    now_utc: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Nhân viên / chủ cửa hàng xác nhận đã giao xe cho khách:
    - Chỉ cho phép khi đơn đang ở trạng thái 'Đã xác nhận'.
    - Nếu khách chưa xác nhận -> giữ nguyên 'Đã xác nhận', chờ khách xác nhận.
    - Nếu khách đã xác nhận trước đó -> tự động chuyển đơn & xe sang 'Đang thuê'.
    """
    order = _get_order_or_404(db, order_id)
    _verify_staff_permission(db, order, staff_id)

    if order.order_status != STATUS_CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Chỉ có thể xác nhận bàn giao khi đơn ở trạng thái '{STATUS_CONFIRMED}' (hiện tại: '{order.order_status}').",
        )

    now = now_utc or _now_utc_naive()
    record = _get_or_create_pickup_handover(db, order)
    record.staff_id = staff_id if staff_id is not None else record.staff_id
    record.staff_confirmed = True
    record.staff_confirmed_at = record.staff_confirmed_at or now
    record.condition_note = _merge_condition_note(record.condition_note, "NV", condition_note)

    _apply_active_rental_if_both_confirmed(db, order, record, now)
    db.commit()
    db.refresh(order)
    db.refresh(record)
    return _serialize_handover_state(order, record)


def customer_confirm_handover(
    db: Session,
    order_id: int,
    renter_id: Optional[int] = None,
    condition_note: Optional[str] = None,
    now_utc: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Khách hàng xác nhận đã kiểm tra và nhận xe:
    - Kiểm tra đúng chủ đơn (renter_id), nếu khác trả 403.
    - Chỉ cho phép khi đơn đang ở trạng thái 'Đã xác nhận'.
    - Nếu nhân viên chưa xác nhận -> giữ nguyên 'Đã xác nhận', chờ nhân viên xác nhận.
    - Nếu nhân viên đã xác nhận trước đó -> tự động chuyển đơn & xe sang 'Đang thuê'.
    """
    order = _get_order_or_404(db, order_id)
    if renter_id is not None and order.renter_id != renter_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xác nhận nhận xe cho đơn thuê của khách hàng khác.",
        )

    if order.order_status != STATUS_CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Chỉ có thể xác nhận nhận xe khi đơn ở trạng thái '{STATUS_CONFIRMED}' (hiện tại: '{order.order_status}').",
        )

    now = now_utc or _now_utc_naive()
    record = _get_or_create_pickup_handover(db, order)
    record.customer_confirmed = True
    record.customer_confirmed_at = record.customer_confirmed_at or now
    record.condition_note = _merge_condition_note(record.condition_note, "Khách", condition_note)

    _apply_active_rental_if_both_confirmed(db, order, record, now)
    db.commit()
    db.refresh(order)
    db.refresh(record)
    return _serialize_handover_state(order, record)
