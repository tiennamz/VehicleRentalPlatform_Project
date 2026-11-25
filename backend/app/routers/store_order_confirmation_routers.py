from typing import Optional
from fastapi import APIRouter, Body, Depends, Header, Query, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.store_order_confirmation_schemas import (
    StoreOrderConfirmSchema,
    StoreOrderRejectSchema,
)
from app.services.store_order_confirmation_services import (
    confirm_store_order,
    escalate_overdue_orders,
    list_escalated_orders_for_operator,
    list_store_orders,
    reject_store_order,
    serialize_store_order,
)
from app.utils.response import create_response

router = APIRouter(tags=["Store Order Confirmation SLA (TF14679)"])


def _resolve_owner_id(x_user_id: Optional[int], body_owner_id: Optional[int]) -> Optional[int]:
    return x_user_id if x_user_id is not None else body_owner_id


@router.get("/stores/orders", status_code=status.HTTP_200_OK)
def get_store_orders_endpoint(
    request: Request,
    store_id: Optional[int] = Query(None, description="ID cửa hàng"),
    owner_id: Optional[int] = Query(None, description="ID chủ cửa hàng"),
    order_status: Optional[str] = Query(None, description="Lọc theo trạng thái đơn"),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    resolved_owner = owner_id if owner_id is not None else (x_user_id if store_id is None else None)
    data = list_store_orders(
        db=db,
        store_id=store_id,
        owner_id=resolved_owner,
        order_status=order_status,
    )
    return create_response(request, status.HTTP_200_OK, "Lấy danh sách đơn thuê cửa hàng thành công", data)


@router.post("/stores/orders/{order_id}/confirm", status_code=status.HTTP_200_OK)
def confirm_store_order_endpoint(
    request: Request,
    order_id: int,
    payload: Optional[StoreOrderConfirmSchema] = Body(default=None),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    owner_id = _resolve_owner_id(x_user_id, payload.owner_id if payload else None)
    order = confirm_store_order(db=db, order_id=order_id, owner_id=owner_id)
    return create_response(
        request,
        status.HTTP_200_OK,
        "Cửa hàng đã xác nhận đơn thuê thành công",
        serialize_store_order(db, order),
    )


@router.post("/stores/orders/{order_id}/reject", status_code=status.HTTP_200_OK)
def reject_store_order_endpoint(
    request: Request,
    order_id: int,
    payload: StoreOrderRejectSchema,
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    owner_id = _resolve_owner_id(x_user_id, payload.owner_id)
    order = reject_store_order(
        db=db,
        order_id=order_id,
        rejection_reason=payload.rejection_reason,
        owner_id=owner_id,
    )
    return create_response(
        request,
        status.HTTP_200_OK,
        "Cửa hàng đã từ chối đơn thuê kèm lý do",
        serialize_store_order(db, order),
    )


@router.post("/orders/escalate-overdue", status_code=status.HTTP_200_OK)
def escalate_overdue_orders_endpoint(
    request: Request,
    db: Session = Depends(get_db),
):
    escalated = escalate_overdue_orders(db=db)
    data = {
        "escalated_count": len(escalated),
        "orders": [serialize_store_order(db, o) for o in escalated],
    }
    return create_response(
        request,
        status.HTTP_200_OK,
        f"Đã chuyển {len(escalated)} đơn quá hạn 15 phút sang trạng thái chờ vận hành viên xử lý",
        data,
    )


@router.get("/operator/orders/escalated", status_code=status.HTTP_200_OK)
def get_escalated_orders_for_operator_endpoint(
    request: Request,
    db: Session = Depends(get_db),
):
    data = list_escalated_orders_for_operator(db=db)
    return create_response(
        request,
        status.HTTP_200_OK,
        "Lấy danh sách đơn chờ vận hành viên xử lý thành công",
        data,
    )
