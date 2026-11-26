"""
Router API cho chức năng xác nhận bàn giao 2 chiều (Task TF148C7):
Cả khách hàng và nhân viên cùng xác nhận thì đơn mới chuyển sang trạng thái 'Đang thuê'.
"""

from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.handover_confirmation_schemas import HandoverConfirmSchema
from app.services.handover_confirmation_services import (
    customer_confirm_handover,
    get_handover_status,
    staff_confirm_handover,
)
from app.utils.response import create_response
from dependencies.middleware import (
    check_store_staff_or_admin,
    get_current_user,
    is_operator,
)

router = APIRouter(tags=["Dual Handover Confirmation (TF148C7)"])


def _get_order_or_404(db: Session, order_id: int) -> Order:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn thuê với ID {order_id}.",
        )
    return order


@router.get("/orders/{order_id}/handover", status_code=status.HTTP_200_OK)
def get_handover_status_endpoint(
    request: Request,
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy trạng thái xác nhận bàn giao 2 chiều (nhân viên & khách hàng) của đơn thuê."""
    order = _get_order_or_404(db, order_id)
    store_owner_id = (
        order.vehicle.store.owner_id
        if getattr(order, "vehicle", None) and getattr(order.vehicle, "store", None)
        else None
    )
    if (
        order.renter_id != current_user.user_id
        and store_owner_id != current_user.user_id
        and not is_operator(current_user)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem trạng thái bàn giao của đơn thuê này.",
        )
    data = get_handover_status(db=db, order_id=order_id)
    return create_response(request, status.HTTP_200_OK, "Lấy trạng thái bàn giao xe thành công", data)


@router.post("/orders/{order_id}/handover/staff-confirm", status_code=status.HTTP_200_OK)
def staff_confirm_handover_endpoint(
    request: Request,
    order_id: int,
    payload: Optional[HandoverConfirmSchema] = Body(default=None),
    current_user: User = Depends(check_store_staff_or_admin),
    db: Session = Depends(get_db),
):
    """Nhân viên / cửa hàng xác nhận bàn giao xe (chỉ sang 'Đang thuê' khi khách cũng đã xác nhận)."""
    order = _get_order_or_404(db, order_id)
    if not is_operator(current_user):
        store_owner_id = (
            order.vehicle.store.owner_id
            if getattr(order, "vehicle", None) and getattr(order.vehicle, "store", None)
            else None
        )
        if store_owner_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xác nhận bàn giao cho đơn thuộc cửa hàng khác.",
            )
    data = staff_confirm_handover(
        db=db,
        order_id=order_id,
        staff_id=current_user.user_id,
        condition_note=payload.condition_note if payload else None,
    )
    msg = (
        "Cả nhân viên và khách hàng đã xác nhận — đơn chuyển sang trạng thái 'Đang thuê'."
        if data["both_confirmed"]
        else "Nhân viên đã xác nhận giao xe — đang chờ khách hàng xác nhận để chuyển sang 'Đang thuê'."
    )
    return create_response(request, status.HTTP_200_OK, msg, data)


@router.post("/orders/{order_id}/handover/customer-confirm", status_code=status.HTTP_200_OK)
def customer_confirm_handover_endpoint(
    request: Request,
    order_id: int,
    payload: Optional[HandoverConfirmSchema] = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Khách hàng xác nhận đã nhận xe (chỉ sang 'Đang thuê' khi nhân viên cũng đã xác nhận)."""
    order = _get_order_or_404(db, order_id)
    if order.renter_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ chính chủ đơn thuê mới có quyền xác nhận đã nhận xe.",
        )
    data = customer_confirm_handover(
        db=db,
        order_id=order_id,
        renter_id=current_user.user_id,
        condition_note=payload.condition_note if payload else None,
    )
    msg = (
        "Cả khách hàng và nhân viên đã xác nhận — đơn chuyển sang trạng thái 'Đang thuê'."
        if data["both_confirmed"]
        else "Khách hàng đã xác nhận nhận xe — đang chờ nhân viên cửa hàng xác nhận để chuyển sang 'Đang thuê'."
    )
    return create_response(request, status.HTTP_200_OK, msg, data)
