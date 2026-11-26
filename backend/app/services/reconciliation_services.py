"""
Nghiệp vụ tính hoa hồng 12% theo BR-09 và tổng hợp đối soát theo tuần cho từng cửa hàng (Task TF149EA):
- Quy tắc BR-09:
  + Tỷ lệ hoa hồng mặc định 12% (có thể cấu hình qua system_config.commission_rate).
  + CHỈ tính hoa hồng trên tiền thuê xe (rental_amount).
  + KHÔNG tính hoa hồng trên phí giao nhận (delivery_fee).
  + KHÔNG tính hoa hồng cho đơn bị hủy, bị từ chối hoặc tiền cọc hoàn trả.
- Thực nhận cửa hàng = tiền thuê - hoa hồng 12% + 100% phí giao nhận.
- Tổng hợp đối soát theo từng tuần ISO (Thứ 2 -> Chủ Nhật) riêng biệt cho từng cửa hàng.
"""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.store import Store
from app.models.system_config import SystemConfig
from app.models.vehicle import Vehicle
from app.models.weekly_reconciliation import WeeklyReconciliation

COMMISSION_RATE_DEFAULT = Decimal("12.00")

# Các trạng thái đơn đủ điều kiện ghi nhận doanh thu và tính hoa hồng đối soát
RECONCILABLE_ORDER_STATUSES = {"Hoàn tất", "Hoàn thành", "Completed"}


def _now_utc_naive() -> datetime:
    """Lấy thời điểm hiện tại theo UTC dạng naive datetime để lưu đồng nhất vào DB."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_commission_rate(db: Optional[Session] = None) -> Decimal:
    """
    Đọc tỷ lệ hoa hồng nền tảng từ dịch vụ cấu hình hệ thống tập trung (system_config.commission_rate).
    Nếu không cấu hình hoặc không truyền db thì dùng mặc định 12% theo BR-09.
    """
    from app.services.system_config_services import get_system_config

    return get_system_config(db)["commission_rate"]


def calculate_commission_br09(
    rental_amount: Decimal,
    delivery_fee: Decimal = Decimal("0.00"),
    commission_rate: Decimal = COMMISSION_RATE_DEFAULT,
) -> Dict[str, Decimal]:
    """
    Tính hoa hồng nền tảng theo đúng quy tắc BR-09:
    - Chỉ tính trên rental_amount (tiền thuê xe), KHÔNG tính trên delivery_fee (phí giao nhận).
    - Cửa hàng thực nhận (net_payout) = rental_amount - commission_amount + delivery_fee.
    """
    rental = max(Decimal("0.00"), Decimal(str(rental_amount or 0))).quantize(Decimal("0.01"))
    delivery = max(Decimal("0.00"), Decimal(str(delivery_fee or 0))).quantize(Decimal("0.01"))
    rate = Decimal(str(commission_rate)).quantize(Decimal("0.01"))

    commission_amount = (rental * rate / Decimal("100")).quantize(Decimal("0.01"))
    gross_revenue = (rental + delivery).quantize(Decimal("0.01"))
    net_payout = (rental - commission_amount + delivery).quantize(Decimal("0.01"))

    return {
        "rental_amount": rental,
        "delivery_fee": delivery,
        "gross_revenue": gross_revenue,
        "commission_rate": rate,
        "commission_amount": commission_amount,
        "net_payout": net_payout,
    }


def _extract_order_rental_and_delivery(order: Order) -> tuple[Decimal, Decimal]:
    """
    Tách chính xác tiền thuê (rental_amount) và phí giao nhận (delivery_fee) của đơn hàng.
    Tương thích ngược với đơn cũ: nếu rental_amount = 0 nhưng total_amount > 0 thì suy ra
    rental_amount = max(0, total_amount - delivery_fee).
    """
    delivery = max(Decimal("0.00"), Decimal(str(order.delivery_fee or 0))).quantize(Decimal("0.01"))
    rental_raw = Decimal(str(order.rental_amount or 0)).quantize(Decimal("0.01"))
    if rental_raw <= Decimal("0.00") and order.total_amount:
        total = Decimal(str(order.total_amount)).quantize(Decimal("0.01"))
        rental_raw = max(Decimal("0.00"), (total - delivery).quantize(Decimal("0.01")))
    return rental_raw, delivery


def _week_bounds(anchor: date) -> tuple[date, date]:
    """Quy một ngày bất kỳ về cặp (Thứ 2 đầu tuần, Chủ Nhật cuối tuần)."""
    monday = anchor - timedelta(days=anchor.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _compute_store_single_week(
    db: Session,
    store: Store,
    week_monday: date,
    commission_rate: Decimal,
) -> Dict[str, Any]:
    """
    Tổng hợp số liệu đối soát BR-09 trong đúng 1 tuần (Thứ 2 -> Chủ Nhật) cho 1 cửa hàng.
    Chỉ tính các đơn đã hoàn thành (Hoàn tất / Hoàn thành / Completed).
    """
    week_sunday = week_monday + timedelta(days=6)
    start_dt = datetime.combine(week_monday, time.min)
    end_dt = datetime.combine(week_sunday + timedelta(days=1), time.min)

    # Lấy tất cả đơn hoàn thành thuộc xe của cửa hàng trong tuần (dựa trên end_time, fallback created_at)
    rows = (
        db.query(Order, Vehicle)
        .join(Vehicle, Order.vehicle_id == Vehicle.vehicle_id)
        .filter(
            Vehicle.store_id == store.store_id,
            Order.order_status.in_(RECONCILABLE_ORDER_STATUSES),
        )
        .all()
    )

    total_rental = Decimal("0.00")
    total_delivery = Decimal("0.00")
    total_commission = Decimal("0.00")
    total_net = Decimal("0.00")
    order_items: List[Dict[str, Any]] = []

    for order, vehicle in rows:
        ref_dt = order.end_time or order.created_at
        if not ref_dt:
            continue
        ref_naive = ref_dt.replace(tzinfo=None)
        if not (start_dt <= ref_naive < end_dt):
            continue

        rental, delivery = _extract_order_rental_and_delivery(order)
        calc = calculate_commission_br09(rental, delivery, commission_rate)

        total_rental += calc["rental_amount"]
        total_delivery += calc["delivery_fee"]
        total_commission += calc["commission_amount"]
        total_net += calc["net_payout"]

        vehicle_name = " ".join(p for p in [vehicle.brand, vehicle.model] if p).strip() or (vehicle.type or f"Xe #{vehicle.vehicle_id}")
        order_items.append({
            "order_id": order.order_id,
            "order_code": f"ORD-{order.order_id}",
            "vehicle_name": vehicle_name,
            "completed_at": ref_naive.isoformat(),
            "rental_amount": float(calc["rental_amount"]),
            "delivery_fee": float(calc["delivery_fee"]),
            "commission_rate": float(calc["commission_rate"]),
            "commission_amount": float(calc["commission_amount"]),
            "net_payout": float(calc["net_payout"]),
        })

    iso_year, iso_week, _ = week_monday.isocalendar()
    saved_rec = (
        db.query(WeeklyReconciliation)
        .filter(
            WeeklyReconciliation.store_id == store.store_id,
            WeeklyReconciliation.week_start == week_monday,
        )
        .first()
    )

    return {
        "store_id": store.store_id,
        "store_name": store.store_name,
        "week_start": week_monday.isoformat(),
        "week_end": week_sunday.isoformat(),
        "iso_year": iso_year,
        "iso_week": iso_week,
        "week_label": f"Tuần {iso_week} ({week_monday.strftime('%d/%m')}–{week_sunday.strftime('%d/%m/%Y')})",
        "order_count": len(order_items),
        "total_rental_amount": float(total_rental),
        "total_delivery_fee": float(total_delivery),
        "gross_revenue": float(total_rental + total_delivery),
        "commission_rate": float(commission_rate),
        "commission_amount": float(total_commission),
        "net_payout": float(total_net),
        "reconciliation_status": saved_rec.status if saved_rec else "Chưa chốt",
        "reconciliation_id": saved_rec.reconciliation_id if saved_rec else None,
        "orders": order_items,
    }


def get_weekly_reconciliation_report(
    db: Session,
    store_id: Optional[int] = None,
    owner_id: Optional[int] = None,
    week_start: Optional[date] = None,
    weeks: int = 4,
) -> Dict[str, Any]:
    """
    Tổng hợp báo cáo đối soát theo tuần cho từng cửa hàng:
    - Trả về danh sách các cửa hàng, mỗi cửa hàng gồm mảng `weeks` tuần gần nhất tính từ `week_start`.
    - Kèm bảng tổng kết (summary) toàn bộ kỳ: tổng tiền thuê, tổng phí giao nhận (0% HH),
      tổng hoa hồng 12% (BR-09) và tổng thực nhận cửa hàng.
    """
    safe_weeks = max(1, min(int(weeks or 4), 26))
    anchor_monday, _ = _week_bounds(week_start or date.today())
    commission_rate = get_commission_rate(db)

    store_query = db.query(Store)
    if store_id is not None:
        store_query = store_query.filter(Store.store_id == store_id)
    elif owner_id is not None:
        store_query = store_query.filter(Store.owner_id == owner_id)

    stores = store_query.order_by(Store.store_id.asc()).all()
    if store_id is not None and not stores:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy cửa hàng với ID {store_id}.",
        )

    store_reports: List[Dict[str, Any]] = []
    for store in stores:
        week_rows: List[Dict[str, Any]] = []
        for idx in range(safe_weeks):
            target_monday = anchor_monday - timedelta(days=7 * idx)
            week_rows.append(_compute_store_single_week(db, store, target_monday, commission_rate))

        summary = {
            "total_orders": sum(w["order_count"] for w in week_rows),
            "total_rental_amount": round(sum(w["total_rental_amount"] for w in week_rows), 2),
            "total_delivery_fee": round(sum(w["total_delivery_fee"] for w in week_rows), 2),
            "total_gross_revenue": round(sum(w["gross_revenue"] for w in week_rows), 2),
            "commission_rate": float(commission_rate),
            "total_commission_amount": round(sum(w["commission_amount"] for w in week_rows), 2),
            "total_net_payout": round(sum(w["net_payout"] for w in week_rows), 2),
        }

        store_reports.append({
            "store_id": store.store_id,
            "store_name": store.store_name,
            "summary": summary,
            "weeks": week_rows,
        })

    return {
        "commission_rate": float(commission_rate),
        "rule_note": "BR-09: Hoa hồng 12% chỉ tính trên tiền thuê xe, không tính trên phí giao nhận và không tính trên đơn hủy/từ chối.",
        "stores": store_reports,
    }


def generate_weekly_reconciliation(
    db: Session,
    store_id: Optional[int] = None,
    week_start: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Chốt và lưu bản ghi đối soát tuần (Thứ 2 -> Chủ Nhật) vào bảng weekly_reconciliations
    cho 1 cửa hàng hoặc toàn bộ cửa hàng; đồng thời cập nhật commission_rate và
    commission_amount lên từng đơn hàng hoàn thành trong tuần đó.
    """
    anchor_monday, anchor_sunday = _week_bounds(week_start or date.today())
    commission_rate = get_commission_rate(db)
    now = _now_utc_naive()

    store_query = db.query(Store)
    if store_id is not None:
        store_query = store_query.filter(Store.store_id == store_id)
    stores = store_query.order_by(Store.store_id.asc()).all()
    if store_id is not None and not stores:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy cửa hàng với ID {store_id}.",
        )

    saved_records: List[Dict[str, Any]] = []
    for store in stores:
        week_data = _compute_store_single_week(db, store, anchor_monday, commission_rate)

        # Cập nhật commission_rate và commission_amount trực tiếp trên từng đơn thuộc tuần chốt
        for item in week_data["orders"]:
            order_obj = db.query(Order).filter(Order.order_id == item["order_id"]).first()
            if order_obj:
                order_obj.commission_rate = commission_rate
                order_obj.commission_amount = Decimal(str(item["commission_amount"])).quantize(Decimal("0.01"))

        # Tạo mới hoặc cập nhật bản ghi weekly_reconciliations (idempotent theo store_id + week_start)
        rec = (
            db.query(WeeklyReconciliation)
            .filter(
                WeeklyReconciliation.store_id == store.store_id,
                WeeklyReconciliation.week_start == anchor_monday,
            )
            .first()
        )
        if not rec:
            rec = WeeklyReconciliation(
                store_id=store.store_id,
                week_start=anchor_monday,
                week_end=anchor_sunday,
            )
            db.add(rec)

        rec.order_count = week_data["order_count"]
        rec.total_rental_amount = Decimal(str(week_data["total_rental_amount"])).quantize(Decimal("0.01"))
        rec.total_delivery_fee = Decimal(str(week_data["total_delivery_fee"])).quantize(Decimal("0.01"))
        rec.gross_revenue = Decimal(str(week_data["gross_revenue"])).quantize(Decimal("0.01"))
        rec.commission_rate = commission_rate
        rec.commission_amount = Decimal(str(week_data["commission_amount"])).quantize(Decimal("0.01"))
        rec.net_payout = Decimal(str(week_data["net_payout"])).quantize(Decimal("0.01"))
        rec.status = "Đã chốt"
        rec.generated_at = now
        db.flush()

        saved_records.append({
            "reconciliation_id": rec.reconciliation_id,
            "store_id": store.store_id,
            "store_name": store.store_name,
            "week_start": anchor_monday.isoformat(),
            "week_end": anchor_sunday.isoformat(),
            "order_count": rec.order_count,
            "total_rental_amount": float(rec.total_rental_amount),
            "total_delivery_fee": float(rec.total_delivery_fee),
            "gross_revenue": float(rec.gross_revenue),
            "commission_rate": float(rec.commission_rate),
            "commission_amount": float(rec.commission_amount),
            "net_payout": float(rec.net_payout),
            "status": rec.status,
            "generated_at": now.isoformat(),
        })

    db.commit()
    return {
        "week_start": anchor_monday.isoformat(),
        "week_end": anchor_sunday.isoformat(),
        "commission_rate": float(commission_rate),
        "records": saved_records,
    }
