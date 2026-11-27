"""
Router API cho quản trị cấu hình hệ thống (hoa hồng, thời gian giữ chỗ, chính sách hủy, phí trả trễ)
và tính phí trả xe trễ theo cấu hình (Task TF14C2C).
"""

from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.system_config_schemas import (
    LateReturnFeeCalculateRequestSchema,
    SystemConfigUpdateSchema,
)
from app.services.system_config_services import (
    calculate_late_return_fee,
    get_system_config,
    serialize_system_config,
    update_system_config,
)
from app.utils.response import create_response
from dependencies.middleware import check_admin, get_current_user, is_operator

router = APIRouter(tags=["System Configuration (TF14C2C)"])


@router.get("/system-config", status_code=status.HTTP_200_OK)
def get_system_config_endpoint(
    request: Request,
    db: Session = Depends(get_db),
):
    """Lấy toàn bộ cấu hình hệ thống hiện hành (hoa hồng, giữ chỗ, chính sách hủy, phí trả trễ)."""
    cfg = get_system_config(db)
    return create_response(
        request,
        status.HTTP_200_OK,
        "Lấy cấu hình hệ thống thành công",
        serialize_system_config(cfg),
    )


@router.put("/admin/system-config", status_code=status.HTTP_200_OK)
def update_system_config_endpoint(
    request: Request,
    payload: SystemConfigUpdateSchema,
    current_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
):
    """Quản trị viên (Admin) cập nhật cấu hình hoa hồng, thời gian giữ chỗ, chính sách hủy, phí trả trễ."""
    cfg = update_system_config(db, payload)
    return create_response(
        request,
        status.HTTP_200_OK,
        "Cập nhật cấu hình hệ thống thành công",
        serialize_system_config(cfg),
    )


@router.post("/orders/{order_id}/late-fee/calculate", status_code=status.HTTP_200_OK)
def calculate_order_late_fee_endpoint(
    request: Request,
    order_id: int,
    payload: Optional[LateReturnFeeCalculateRequestSchema] = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tính phí trả xe trễ của đơn thuê theo cấu hình hiện hành (chính chủ đơn, chủ cửa hàng hoặc vận hành viên)."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn thuê với ID {order_id}.",
        )

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
            detail="Bạn không có quyền tính phí trả trễ cho đơn thuê này.",
        )

    if not order.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn thuê chưa có thời gian trả xe dự kiến.",
        )

    result = calculate_late_return_fee(
        db=db,
        expected_end_time=order.end_time,
        actual_return_time=payload.actual_return_time if payload else None,
    )
    data = {
        "order_id": order.order_id,
        "expected_end_time": result["expected_end_time"],
        "actual_return_time": result["actual_return_time"],
        "late_minutes": result["late_minutes"],
        "grace_minutes": result["grace_minutes"],
        "billable_late_hours": result["billable_late_hours"],
        "fee_per_hour": float(result["fee_per_hour"]),
        "late_fee": float(result["late_fee"]),
        "policy_note": result["policy_note"],
    }
    return create_response(request, status.HTTP_200_OK, "Tính phí trả xe trễ thành công", data)
