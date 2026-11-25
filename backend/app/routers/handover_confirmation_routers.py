"""
Router API cho chức năng xác nhận bàn giao 2 chiều (Task TF148C7):
Cả khách hàng và nhân viên cùng xác nhận thì đơn mới chuyển sang trạng thái 'Đang thuê'.
"""

from typing import Optional
from fastapi import APIRouter, Body, Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.handover_confirmation_schemas import HandoverConfirmSchema
from app.services.handover_confirmation_services import (
    customer_confirm_handover,
    get_handover_status,
    staff_confirm_handover,
)
from app.utils.response import create_response

router = APIRouter(tags=["Dual Handover Confirmation (TF148C7)"])


def _resolve_user_id(x_user_id: Optional[int], body_user_id: Optional[int]) -> Optional[int]:
    """Ưu tiên lấy ID người dùng từ header X-User-Id, nếu không có thì lấy từ body."""
    return x_user_id if x_user_id is not None else body_user_id


@router.get("/orders/{order_id}/handover", status_code=status.HTTP_200_OK)
def get_handover_status_endpoint(
    request: Request,
    order_id: int,
    db: Session = Depends(get_db),
):
    """Lấy trạng thái xác nhận bàn giao 2 chiều (nhân viên & khách hàng) của đơn thuê."""
    data = get_handover_status(db=db, order_id=order_id)
    return create_response(request, status.HTTP_200_OK, "Lấy trạng thái bàn giao xe thành công", data)


@router.post("/orders/{order_id}/handover/staff-confirm", status_code=status.HTTP_200_OK)
def staff_confirm_handover_endpoint(
    request: Request,
    order_id: int,
    payload: Optional[HandoverConfirmSchema] = Body(default=None),
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Nhân viên / cửa hàng xác nhận bàn giao xe (chỉ sang 'Đang thuê' khi khách cũng đã xác nhận)."""
    staff_id = _resolve_user_id(x_user_id, payload.user_id if payload else None)
    data = staff_confirm_handover(
        db=db,
        order_id=order_id,
        staff_id=staff_id,
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
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Khách hàng xác nhận đã nhận xe (chỉ sang 'Đang thuê' khi nhân viên cũng đã xác nhận)."""
    renter_id = _resolve_user_id(x_user_id, payload.user_id if payload else None)
    data = customer_confirm_handover(
        db=db,
        order_id=order_id,
        renter_id=renter_id,
        condition_note=payload.condition_note if payload else None,
    )
    msg = (
        "Cả khách hàng và nhân viên đã xác nhận — đơn chuyển sang trạng thái 'Đang thuê'."
        if data["both_confirmed"]
        else "Khách hàng đã xác nhận nhận xe — đang chờ nhân viên cửa hàng xác nhận để chuyển sang 'Đang thuê'."
    )
    return create_response(request, status.HTTP_200_OK, msg, data)
