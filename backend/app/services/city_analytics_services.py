"""
Dịch vụ thống kê hoạt động thuê xe theo thành phố (Task TF14D02):
- Số đơn (`total_orders`, kèm phân rã `cancelled_orders`, `rejected_orders`, `completed_orders`)
- Tổng giá trị giao dịch (`total_transaction_value`: tổng `orders.total_amount` loại trừ đơn hủy & bị từ chối)
  kèm `completed_transaction_value` (đơn hoàn thành)
- Tỷ lệ hủy (`cancellation_rate`, %)
- Tỷ lệ khiếu nại (`complaint_rate`, % theo số đơn duy nhất có khiếu nại, kèm `total_complaints`)
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.city import City
from app.models.complaint import Complaint
from app.models.order import Order
from app.models.store import Store
from app.models.vehicle import Vehicle

CANCELLED_ORDER_STATUSES = {"Đã hủy", "Cancelled"}
REJECTED_ORDER_STATUSES = {"Cửa hàng từ chối", "Từ chối", "Rejected"}
COMPLETED_ORDER_STATUSES = {"Hoàn tất", "Hoàn thành", "Completed"}
EXCLUDED_GMV_STATUSES = CANCELLED_ORDER_STATUSES | REJECTED_ORDER_STATUSES


def _calc_rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100.0, 2)


def get_city_analytics_report(
    db: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    city_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Tổng hợp số đơn, tổng giá trị giao dịch, tỷ lệ hủy và tỷ lệ khiếu nại theo từng thành phố
    và tổng toàn hệ thống.
    """
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ngày bắt đầu (from_date) không được lớn hơn ngày kết thúc (to_date).",
        )

    city_query = db.query(City)
    if city_id is not None:
        city_query = city_query.filter(City.city_id == city_id)
    cities = city_query.order_by(City.city_name.asc()).all()

    if city_id is not None and not cities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thành phố với ID {city_id}.",
        )

    # Khởi tạo bucket thống kê cho mọi thành phố (kể cả thành phố chưa có đơn)
    buckets: Dict[int, Dict[str, Any]] = {}
    for c in cities:
        buckets[c.city_id] = {
            "city_id": c.city_id,
            "city_name": c.city_name,
            "total_orders": 0,
            "cancelled_orders": 0,
            "rejected_orders": 0,
            "completed_orders": 0,
            "total_transaction_value": Decimal("0.00"),
            "completed_transaction_value": Decimal("0.00"),
            "complained_orders": 0,
            "total_complaints": 0,
        }

    if not buckets:
        empty_summary = {
            "total_orders": 0,
            "cancelled_orders": 0,
            "rejected_orders": 0,
            "completed_orders": 0,
            "total_transaction_value": 0.0,
            "completed_transaction_value": 0.0,
            "cancellation_rate": 0.0,
            "complained_orders": 0,
            "total_complaints": 0,
            "complaint_rate": 0.0,
        }
        return {
            "filters": {
                "from_date": from_date.isoformat() if from_date else None,
                "to_date": to_date.isoformat() if to_date else None,
                "city_id": city_id,
            },
            "summary": empty_summary,
            "cities": [],
        }

    # Truy vấn các đơn thuộc các thành phố trong phạm vi lọc
    order_query = (
        db.query(Order.order_id, Order.total_amount, Order.order_status, Store.city_id)
        .join(Vehicle, Order.vehicle_id == Vehicle.vehicle_id)
        .join(Store, Vehicle.store_id == Store.store_id)
        .filter(Store.city_id.in_(list(buckets.keys())))
    )
    if from_date is not None:
        order_query = order_query.filter(Order.created_at >= datetime.combine(from_date, time.min))
    if to_date is not None:
        order_query = order_query.filter(Order.created_at <= datetime.combine(to_date, time.max))

    order_rows = order_query.all()
    order_ids = [row.order_id for row in order_rows]

    # Gom số lượt khiếu nại theo order_id cho các đơn trong kỳ lọc
    complaints_by_order: Dict[int, int] = {}
    if order_ids:
        complaint_rows = (
            db.query(Complaint.order_id, func.count(Complaint.complaint_id))
            .filter(Complaint.order_id.in_(order_ids))
            .group_by(Complaint.order_id)
            .all()
        )
        complaints_by_order = {oid: int(cnt) for oid, cnt in complaint_rows}

    for row in order_rows:
        b = buckets[row.city_id]
        b["total_orders"] += 1
        amount = Decimal(str(row.total_amount or 0)).quantize(Decimal("0.01"))
        st = row.order_status or ""

        if st in CANCELLED_ORDER_STATUSES:
            b["cancelled_orders"] += 1
        elif st in REJECTED_ORDER_STATUSES:
            b["rejected_orders"] += 1
        else:
            b["total_transaction_value"] += amount

        if st in COMPLETED_ORDER_STATUSES:
            b["completed_orders"] += 1
            b["completed_transaction_value"] += amount

        c_count = complaints_by_order.get(row.order_id, 0)
        if c_count > 0:
            b["complained_orders"] += 1
            b["total_complaints"] += c_count

    # Tính tỷ lệ và chuẩn hoá kết quả từng thành phố
    city_results: List[Dict[str, Any]] = []
    sum_orders = 0
    sum_cancelled = 0
    sum_rejected = 0
    sum_completed = 0
    sum_gmv = Decimal("0.00")
    sum_completed_gmv = Decimal("0.00")
    sum_complained_orders = 0
    sum_total_complaints = 0

    for b in buckets.values():
        total_orders = b["total_orders"]
        cancelled_orders = b["cancelled_orders"]
        rejected_orders = b["rejected_orders"]
        completed_orders = b["completed_orders"]
        gmv = b["total_transaction_value"].quantize(Decimal("0.01"))
        completed_gmv = b["completed_transaction_value"].quantize(Decimal("0.01"))
        complained_orders = b["complained_orders"]
        total_complaints = b["total_complaints"]

        sum_orders += total_orders
        sum_cancelled += cancelled_orders
        sum_rejected += rejected_orders
        sum_completed += completed_orders
        sum_gmv += gmv
        sum_completed_gmv += completed_gmv
        sum_complained_orders += complained_orders
        sum_total_complaints += total_complaints

        city_results.append({
            "city_id": b["city_id"],
            "city_name": b["city_name"],
            "total_orders": total_orders,
            "cancelled_orders": cancelled_orders,
            "rejected_orders": rejected_orders,
            "completed_orders": completed_orders,
            "total_transaction_value": float(gmv),
            "completed_transaction_value": float(completed_gmv),
            "cancellation_rate": _calc_rate(cancelled_orders, total_orders),
            "complained_orders": complained_orders,
            "total_complaints": total_complaints,
            "complaint_rate": _calc_rate(complained_orders, total_orders),
        })

    city_results.sort(key=lambda item: (-item["total_transaction_value"], item["city_name"]))

    summary = {
        "total_orders": sum_orders,
        "cancelled_orders": sum_cancelled,
        "rejected_orders": sum_rejected,
        "completed_orders": sum_completed,
        "total_transaction_value": float(sum_gmv.quantize(Decimal("0.01"))),
        "completed_transaction_value": float(sum_completed_gmv.quantize(Decimal("0.01"))),
        "cancellation_rate": _calc_rate(sum_cancelled, sum_orders),
        "complained_orders": sum_complained_orders,
        "total_complaints": sum_total_complaints,
        "complaint_rate": _calc_rate(sum_complained_orders, sum_orders),
    }

    return {
        "filters": {
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None,
            "city_id": city_id,
        },
        "summary": summary,
        "cities": city_results,
    }
