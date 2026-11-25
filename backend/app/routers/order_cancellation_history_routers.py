"""
Router API cho chức năng hoàn cọc theo BR-04, danh sách đơn và lịch sử thuê xe (Task TF14841).
"""

from typing import Optional
from fastapi import APIRouter, Body, Depends, Header, Query, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.order_cancellation_history_schemas import OrderCancelSchema
from app.services.order_cancellation_history_services import (
    cancel_order_with_br04,
    list_customer_orders,
    preview_order_cancellation,
    serialize_customer_order,
)
from app.utils.response import create_response

router = APIRouter(tags=["Order Refund BR-04 & History (TF14841)"])


def _resolve_renter_id(x_user_id: Optional[int], explicit_renter_id: Optional[int]) -> Optional[int]:
    """Ưu tiên lấy ID khách thuê từ tham số truyền tường minh, fallback sang header X-User-Id."""
    return explicit_renter_id if explicit_renter_id is not None else x_user_id


@router.get("/orders/my", status_code=status.HTTP_200_OK)
def get_my_orders_and_history_endpoint(
    request: Request,
    renter_id: Optional[int] = Query(None, description="ID khách thuê (tùy chọn nếu truyền qua header X-User-Id)"),
    scope: str = Query("all", description="Phạm vi lọc: all (tất cả), active (đơn hiện tại), history (lịch sử)"),
    order_status: Optional[str] = Query(None, description="Lọc chính xác theo trạng thái đơn"),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Lấy danh sách đơn hiện tại, lịch sử thuê xe và thống kê tổng quan của khách hàng."""
    resolved_renter = _resolve_renter_id(x_user_id, renter_id)
    data = list_customer_orders(
        db=db,
        renter_id=resolved_renter,
        scope=scope,
        order_status=order_status,
    )
    return create_response(request, status.HTTP_200_OK, "Lấy danh sách đơn và lịch sử thành công", data)


@router.get("/orders/{order_id}/cancel-preview", status_code=status.HTTP_200_OK)
def preview_cancel_order_br04_endpoint(
    request: Request,
    order_id: int,
    renter_id: Optional[int] = Query(None, description="ID khách thuê"),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Xem trước tỷ lệ và số tiền hoàn cọc theo quy tắc BR-04 trước khi hủy đơn."""
    resolved_renter = _resolve_renter_id(x_user_id, renter_id)
    data = preview_order_cancellation(db=db, order_id=order_id, renter_id=resolved_renter)
    return create_response(request, status.HTTP_200_OK, "Tính thử mức hoàn cọc BR-04 thành công", data)


@router.post("/orders/{order_id}/cancel", status_code=status.HTTP_200_OK)
def cancel_order_br04_endpoint(
    request: Request,
    order_id: int,
    payload: Optional[OrderCancelSchema] = Body(default=None),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Hủy đơn thuê và thực hiện hoàn cọc theo BR-04 (100% >= 24h, 50% từ 6h đến <24h, 0% <6h)."""
    resolved_renter = _resolve_renter_id(x_user_id, payload.renter_id if payload else None)
    order = cancel_order_with_br04(
        db=db,
        order_id=order_id,
        renter_id=resolved_renter,
        cancel_reason=payload.cancel_reason if payload else None,
    )
    return create_response(
        request,
        status.HTTP_200_OK,
        "Hủy đơn và xử lý hoàn cọc theo BR-04 thành công",
        serialize_customer_order(db, order),
    )
