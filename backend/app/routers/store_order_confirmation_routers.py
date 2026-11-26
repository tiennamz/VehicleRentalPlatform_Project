"""
Router API cho luồng cửa hàng xác nhận / từ chối đơn thuê trong 15 phút
và chuyển đơn quá hạn sang vận hành viên xử lý (Task TF14679).
"""

from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.store import Store
from app.models.user import User
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
from dependencies.middleware import (
    check_operator,
    check_store_staff_or_admin,
    is_operator,
)

router = APIRouter(tags=["Store Order Confirmation SLA (TF14679)"])


@router.get("/stores/orders", status_code=status.HTTP_200_OK)
def get_store_orders_endpoint(
    request: Request,
    store_id: Optional[int] = Query(None, description="ID cửa hàng"),
    owner_id: Optional[int] = Query(None, description="ID chủ cửa hàng"),
    order_status: Optional[str] = Query(None, description="Lọc theo trạng thái đơn"),
    current_user: User = Depends(check_store_staff_or_admin),
    db: Session = Depends(get_db),
):
    """Lấy danh sách đơn thuê của cửa hàng kèm đồng hồ đếm ngược 15 phút (tự động chuyển đơn quá hạn)."""
    if is_operator(current_user):
        resolved_owner = owner_id
    else:
        if owner_id is not None and owner_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem đơn hàng của chủ cửa hàng khác.",
            )
        if store_id is not None:
            store = db.query(Store).filter(Store.store_id == store_id).first()
            if store and store.owner_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không có quyền xem đơn hàng của cửa hàng khác.",
                )
        resolved_owner = current_user.user_id if store_id is None else None

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
    current_user: User = Depends(check_store_staff_or_admin),
    db: Session = Depends(get_db),
):
    """Cửa hàng xác nhận đơn thuê trong thời hạn 15 phút (quá hạn sẽ tự động chuyển VHV và trả 409)."""
    owner_id = None if is_operator(current_user) else current_user.user_id
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
    current_user: User = Depends(check_store_staff_or_admin),
    db: Session = Depends(get_db),
):
    """Cửa hàng từ chối đơn thuê trong hạn 15 phút, bắt buộc đính kèm lý do từ chối."""
    owner_id = None if is_operator(current_user) else current_user.user_id
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
    current_user: User = Depends(check_operator),
    db: Session = Depends(get_db),
):
    """Quét và chuyển toàn bộ đơn quá hạn 15 phút sang trạng thái 'Chờ vận hành viên xử lý'."""
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
    current_user: User = Depends(check_operator),
    db: Session = Depends(get_db),
):
    """Lấy danh sách các đơn quá hạn 15 phút đang chờ vận hành viên tiếp nhận xử lý."""
    data = list_escalated_orders_for_operator(db=db)
    return create_response(
        request,
        status.HTTP_200_OK,
        "Lấy danh sách đơn chờ vận hành viên xử lý thành công",
        data,
    )
