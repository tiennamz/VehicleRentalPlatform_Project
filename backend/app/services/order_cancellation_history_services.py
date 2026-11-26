"""
Nghiệp vụ hoàn cọc theo BR-04, hủy đơn thuê, danh sách đơn và lịch sử (Task TF14841):
- Quy tắc BR-04:
  + Hủy trước giờ nhận xe từ 24 giờ trở lên (>= 24h): hoàn 100% tiền cọc.
  + Hủy trước giờ nhận xe từ 6 giờ đến dưới 24 giờ (6h <= t < 24h): hoàn 50% tiền cọc.
  + Hủy trước giờ nhận xe dưới 6 giờ (< 6h): hoàn 0% tiền cọc.
- Ghi giao dịch hoàn tiền vào bảng transactions khi số tiền hoàn > 0.
- Cung cấp danh sách đơn hiện tại, lịch sử đơn, thống kê tổng quan và timeline sự kiện.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.city import City
from app.models.order import Order
from app.models.store import Store
from app.models.transaction import Transaction
from app.models.vehicle import Vehicle
from app.services.store_order_confirmation_services import escalate_overdue_orders

# Các nhóm trạng thái để phân tách "Đơn hiện tại" và "Lịch sử đơn"
HISTORY_ORDER_STATUSES = {
    "Hoàn tất",
    "Hoàn thành",
    "Completed",
    "Đã hủy",
    "Cancelled",
    "Cửa hàng từ chối",
    "Từ chối",
    "Rejected",
}

# Các trạng thái KHÔNG được phép khách hàng tự hủy nữa
NON_CANCELLABLE_STATUSES = {
    "Đang thuê",
    "Hoàn tất",
    "Hoàn thành",
    "Completed",
    "Đã hủy",
    "Cancelled",
    "Cửa hàng từ chối",
    "Từ chối",
    "Rejected",
}

UNPAID_DEPOSIT_STATUSES = {"Chờ thanh toán"}


def _now_utc_naive() -> datetime:
    """Lấy thời điểm hiện tại theo UTC dạng naive datetime để so sánh nhất quán với DB."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def calculate_refund_br04(
    start_time: datetime,
    deposit_amount: Decimal,
    cancelled_at: Optional[datetime] = None,
    order_status: Optional[str] = None,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Tính số tiền hoàn cọc theo chính sách hủy đọc từ `system_config` (mặc định BR-04):
    - >= cancel_full_refund_hours (24h): hoàn cancel_full_refund_rate (100%) tiền cọc.
    - Từ cancel_partial_refund_hours (6h) đến < cancel_full_refund_hours: hoàn cancel_partial_refund_rate (50%).
    - Dưới cancel_partial_refund_hours: hoàn cancel_late_refund_rate (0%).
    - Nếu đơn chưa thanh toán cọc (Chờ thanh toán hoặc deposit <= 0): không phát sinh hoàn tiền.
    """
    from app.services.system_config_services import get_system_config

    cfg = get_system_config(db)
    full_hours = float(cfg["cancel_full_refund_hours"])
    full_rate = cfg["cancel_full_refund_rate"]
    partial_hours = float(cfg["cancel_partial_refund_hours"])
    partial_rate = cfg["cancel_partial_refund_rate"]
    late_rate = cfg["cancel_late_refund_rate"]

    now = (cancelled_at or _now_utc_naive()).replace(tzinfo=None)
    pickup = start_time.replace(tzinfo=None)
    hours_before_pickup = round((pickup - now).total_seconds() / 3600.0, 2)
    deposit = Decimal(str(deposit_amount or 0)).quantize(Decimal("0.01"))

    if order_status in UNPAID_DEPOSIT_STATUSES or deposit <= Decimal("0.00"):
        return {
            "hours_before_pickup": hours_before_pickup,
            "deposit_amount": deposit,
            "refund_rate": Decimal("0.00"),
            "refund_amount": Decimal("0.00"),
            "policy_note": "Đơn chưa thanh toán tiền cọc nên không phát sinh khoản hoàn cọc.",
        }

    if hours_before_pickup >= full_hours:
        rate = full_rate
        policy_note = f"Hủy trước giờ nhận xe từ {full_hours:g} giờ trở lên — hoàn {rate:g}% tiền cọc (BR-04)."
    elif hours_before_pickup >= partial_hours:
        rate = partial_rate
        policy_note = f"Hủy trước giờ nhận xe từ {partial_hours:g} đến dưới {full_hours:g} giờ — hoàn {rate:g}% tiền cọc (BR-04)."
    else:
        rate = late_rate
        policy_note = (
            f"Hủy trước giờ nhận xe dưới {partial_hours:g} giờ — hoàn {rate:g}% tiền cọc (BR-04)."
            if rate > Decimal("0.00")
            else f"Hủy trước giờ nhận xe dưới {partial_hours:g} giờ — không hoàn tiền cọc (BR-04)."
        )

    refund_amount = (deposit * rate / Decimal("100")).quantize(Decimal("0.01"))
    return {
        "hours_before_pickup": hours_before_pickup,
        "deposit_amount": deposit,
        "refund_rate": rate,
        "refund_amount": refund_amount,
        "policy_note": policy_note,
    }


def _load_and_verify_renter_order(
    db: Session,
    order_id: int,
    renter_id: Optional[int] = None,
) -> Order:
    """
    Tìm đơn thuê theo ID và xác thực quyền sở hữu của khách thuê:
    - Trả về 404 nếu không tìm thấy đơn.
    - Trả về 403 nếu renter_id không trùng với chủ đơn.
    """
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn thuê với ID {order_id}.",
        )
    if renter_id is not None and order.renter_id != renter_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thao tác trên đơn thuê của khách hàng khác.",
        )
    return order


def _build_order_history_events(order: Order) -> List[Dict[str, Any]]:
    """
    Tạo dòng thời gian (timeline) các mốc sự kiện chính của đơn thuê
    để hiển thị rõ lịch sử xử lý cho khách hàng.
    """
    events: List[Dict[str, Any]] = []
    if order.created_at:
        events.append({
            "event": "Tạo đơn thuê",
            "timestamp": order.created_at.isoformat(),
            "detail": f"Tổng đơn {float(order.total_amount or 0):,.0f}đ · Tiền cọc {float(order.deposit_amount or 0):,.0f}đ",
        })
    if order.store_responded_at:
        if order.order_status in {"Cửa hàng từ chối", "Từ chối"}:
            events.append({
                "event": "Cửa hàng từ chối đơn",
                "timestamp": order.store_responded_at.isoformat(),
                "detail": order.rejection_reason or "Cửa hàng đã từ chối đơn thuê.",
            })
        else:
            events.append({
                "event": "Cửa hàng xác nhận đơn",
                "timestamp": order.store_responded_at.isoformat(),
                "detail": "Cửa hàng đã xác nhận giữ xe cho lịch thuê của bạn.",
            })
    if order.escalated_at:
        events.append({
            "event": "Chuyển vận hành viên xử lý",
            "timestamp": order.escalated_at.isoformat(),
            "detail": "Đơn quá hạn 15 phút xác nhận và được chuyển tới bộ phận vận hành.",
        })
    if order.cancelled_at:
        refund_amt = float(order.refund_amount or 0)
        refund_rate = float(order.refund_rate or 0)
        reason_part = f"Lý do: {order.cancel_reason} · " if order.cancel_reason else ""
        events.append({
            "event": "Hủy đơn & hoàn cọc BR-04",
            "timestamp": order.cancelled_at.isoformat(),
            "detail": f"{reason_part}Hoàn {refund_rate:.0f}% cọc ({refund_amt:,.0f}đ)",
        })
    return events


def serialize_customer_order(db: Session, order: Order, now_utc: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Chuyển đối tượng Order thành dict đầy đủ cho trang danh sách đơn & lịch sử khách hàng,
    kèm cờ can_cancel, ước tính hoàn cọc BR-04 nếu hủy lúc này, và timeline lịch sử sự kiện.
    """
    now = now_utc or _now_utc_naive()
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == order.vehicle_id).first()
    store = db.query(Store).filter(Store.store_id == vehicle.store_id).first() if vehicle else None
    city = db.query(City).filter(City.city_id == store.city_id).first() if (store and store.city_id) else None

    vehicle_name = ""
    if vehicle:
        vehicle_name = " ".join(p for p in [vehicle.brand, vehicle.model] if p).strip() or (vehicle.type or f"Xe #{vehicle.vehicle_id}")

    can_cancel = order.order_status not in NON_CANCELLABLE_STATUSES
    preview = (
        calculate_refund_br04(
            start_time=order.start_time,
            deposit_amount=order.deposit_amount or Decimal("0.00"),
            cancelled_at=now,
            order_status=order.order_status,
            db=db,
        )
        if (can_cancel and order.start_time)
        else None
    )

    return {
        "order_id": order.order_id,
        "order_code": f"DH-{order.order_id:06d}",
        "renter_id": order.renter_id,
        "vehicle_id": order.vehicle_id,
        "vehicle_name": vehicle_name,
        "vehicle_type": vehicle.type if vehicle else None,
        "store_id": store.store_id if store else None,
        "store_name": store.store_name if store else None,
        "city_name": city.city_name if city else None,
        "start_time": order.start_time.isoformat() if order.start_time else None,
        "end_time": order.end_time.isoformat() if order.end_time else None,
        "delivery_method": order.delivery_method,
        "delivery_address": order.delivery_address,
        "rental_amount": float(order.rental_amount or 0),
        "delivery_fee": float(order.delivery_fee or 0),
        "deposit_amount": float(order.deposit_amount or 0),
        "remaining_amount": float(order.remaining_amount or 0),
        "total_amount": float(order.total_amount or 0),
        "note": order.note,
        "order_status": order.order_status,
        "is_history": order.order_status in HISTORY_ORDER_STATUSES,
        "can_cancel": can_cancel,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
        "cancel_reason": order.cancel_reason,
        "rejection_reason": order.rejection_reason,
        "refund_rate": float(order.refund_rate or 0),
        "refund_amount": float(order.refund_amount or 0),
        "cancel_preview": {
            "hours_before_pickup": preview["hours_before_pickup"],
            "refund_rate": float(preview["refund_rate"]),
            "refund_amount": float(preview["refund_amount"]),
            "policy_note": preview["policy_note"],
        } if preview else None,
        "history_events": _build_order_history_events(order),
    }


def preview_order_cancellation(
    db: Session,
    order_id: int,
    renter_id: Optional[int] = None,
    now_utc: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Xem trước số tiền cọc sẽ được hoàn theo BR-04 nếu khách hàng bấm hủy đơn ngay lúc này.
    """
    now = now_utc or _now_utc_naive()
    order = _load_and_verify_renter_order(db, order_id=order_id, renter_id=renter_id)
    if order.order_status in NON_CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Đơn thuê hiện ở trạng thái '{order.order_status}', không thể hủy.",
        )

    br04 = calculate_refund_br04(
        start_time=order.start_time,
        deposit_amount=order.deposit_amount or Decimal("0.00"),
        cancelled_at=now,
        order_status=order.order_status,
        db=db,
    )
    return {
        "order_id": order.order_id,
        "order_status": order.order_status,
        "start_time": order.start_time.isoformat() if order.start_time else None,
        "hours_before_pickup": br04["hours_before_pickup"],
        "deposit_amount": float(br04["deposit_amount"]),
        "refund_rate": float(br04["refund_rate"]),
        "refund_amount": float(br04["refund_amount"]),
        "policy_note": br04["policy_note"],
    }


def cancel_order_with_br04(
    db: Session,
    order_id: int,
    renter_id: Optional[int] = None,
    cancel_reason: Optional[str] = None,
    now_utc: Optional[datetime] = None,
) -> Order:
    """
    Thực hiện hủy đơn thuê của khách hàng và tính hoàn cọc theo BR-04:
    1. Kiểm tra quyền sở hữu đơn (403) và trạng thái còn được phép hủy (409).
    2. Tính tỷ lệ và số tiền hoàn cọc theo quy tắc BR-04.
    3. Cập nhật trạng thái 'Đã hủy', lưu cancelled_at, cancel_reason, refund_rate, refund_amount.
    4. Nếu refund_amount > 0, tự động tạo bản ghi giao dịch hoàn cọc trong bảng transactions.
    """
    now = now_utc or _now_utc_naive()
    order = _load_and_verify_renter_order(db, order_id=order_id, renter_id=renter_id)
    if order.order_status in NON_CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Đơn thuê hiện ở trạng thái '{order.order_status}', không thể hủy.",
        )

    br04 = calculate_refund_br04(
        start_time=order.start_time,
        deposit_amount=order.deposit_amount or Decimal("0.00"),
        cancelled_at=now,
        order_status=order.order_status,
        db=db,
    )

    order.order_status = "Đã hủy"
    order.cancelled_at = now
    order.cancel_reason = (cancel_reason or "").strip() or None
    order.refund_rate = br04["refund_rate"]
    order.refund_amount = br04["refund_amount"]

    if br04["refund_amount"] > Decimal("0.00"):
        refund_tx = Transaction(
            order_id=order.order_id,
            transaction_code=f"RF-{order.order_id}-{int(now.timestamp())}",
            payment_method="Chuyển khoản ngân hàng",
            amount=br04["refund_amount"],
            transaction_type="Hoàn cọc BR-04",
            status="Đã hoàn tiền",
            paid_at=now,
        )
        db.add(refund_tx)

    db.commit()
    db.refresh(order)
    return order


def list_customer_orders(
    db: Session,
    renter_id: Optional[int] = None,
    scope: str = "all",
    order_status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Lấy danh sách đơn và lịch sử thuê xe của khách hàng cùng thống kê tổng quan:
    - scope = 'all': toàn bộ đơn thuê.
    - scope = 'active': các đơn đang xử lý hoặc đang thuê.
    - scope = 'history': lịch sử đơn (Hoàn tất / Hoàn thành / Đã hủy / Cửa hàng từ chối).
    """
    now = _now_utc_naive()
    # Đồng bộ quét đơn quá hạn 15 phút để trạng thái luôn chính xác
    escalate_overdue_orders(db, now_utc=now)

    base_query = db.query(Order)
    if renter_id is not None:
        base_query = base_query.filter(Order.renter_id == renter_id)

    all_orders = base_query.order_by(Order.created_at.desc(), Order.order_id.desc()).all()

    # Tính thống kê tổng quan trên toàn bộ đơn của khách hàng
    summary = {
        "total": len(all_orders),
        "pending_payment": sum(1 for o in all_orders if o.order_status == "Chờ thanh toán"),
        "confirmed": sum(1 for o in all_orders if o.order_status == "Đã xác nhận"),
        "active_rental": sum(1 for o in all_orders if o.order_status == "Đang thuê"),
        "completed": sum(1 for o in all_orders if o.order_status in {"Hoàn tất", "Hoàn thành", "Completed"}),
        "cancelled": sum(1 for o in all_orders if o.order_status in {"Đã hủy", "Cancelled"}),
        "rejected": sum(1 for o in all_orders if o.order_status in {"Cửa hàng từ chối", "Từ chối", "Rejected"}),
        "total_refunded": float(sum((o.refund_amount or Decimal("0.00")) for o in all_orders)),
    }

    # Lọc danh sách theo scope và order_status
    scope_clean = (scope or "all").strip().lower()
    filtered = all_orders
    if scope_clean == "active":
        filtered = [o for o in filtered if o.order_status not in HISTORY_ORDER_STATUSES]
    elif scope_clean == "history":
        filtered = [o for o in filtered if o.order_status in HISTORY_ORDER_STATUSES]

    if order_status:
        filtered = [o for o in filtered if o.order_status == order_status]

    return {
        "summary": summary,
        "orders": [serialize_customer_order(db, o, now_utc=now) for o in filtered],
    }
