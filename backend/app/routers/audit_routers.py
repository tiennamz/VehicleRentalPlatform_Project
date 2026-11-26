from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Request, status, Query, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.services.audit_log_services import (
    get_personal_data_audit_logs,
    purge_audit_logs_older_than_12_months,
)
from app.utils.response import create_response
from dependencies.middleware import check_admin, check_operator

router = APIRouter(prefix="/admin/audit-logs", tags=["Admin Audit Logs"])


@router.get("/personal-data", status_code=status.HTTP_200_OK)
def get_audit_logs_endpoint(
    request: Request,
    target_user_id: Optional[int] = Query(None),
    accessor_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    data_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(check_operator),
    db: Session = Depends(get_db),
):
    parsed_from = None
    if from_date:
        try:
            parsed_from = datetime.fromisoformat(from_date.replace(" ", "+")).replace(tzinfo=None)
        except Exception:
            pass

    parsed_to = None
    if to_date:
        try:
            parsed_to = datetime.fromisoformat(to_date.replace(" ", "+")).replace(tzinfo=None)
        except Exception:
            pass

    logs = get_personal_data_audit_logs(
        db=db,
        target_user_id=target_user_id,
        accessor_id=accessor_id,
        action=action,
        data_type=data_type,
        from_date=parsed_from,
        to_date=parsed_to,
        limit=limit,
        offset=offset,
    )

    data = [
        {
            "log_id": log.log_id,
            "accessor_id": log.accessor_id,
            "target_user_id": log.target_user_id,
            "data_type": log.data_type,
            "action": log.action,
            "reason": log.reason,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "accessed_at": log.accessed_at.isoformat() if log.accessed_at else None,
        }
        for log in logs
    ]

    return create_response(request, status.HTTP_200_OK, "Truy vấn nhật ký thành công", data)


@router.delete("/personal-data/purge", status_code=status.HTTP_200_OK)
def purge_audit_logs_endpoint(
    request: Request,
    cutoff_date: Optional[str] = Query(None),
    current_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
):
    """
    Dọn dẹp nhật ký đã hết hạn lưu trữ (chỉ Admin được thực hiện và chỉ cho phép xóa các bản ghi >= 12 tháng).
    """
    parsed_cutoff = None
    if cutoff_date:
        try:
            parsed_cutoff = datetime.fromisoformat(cutoff_date.replace(" ", "+")).replace(tzinfo=None)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Định dạng cutoff_date không hợp lệ. Vui lòng sử dụng chuẩn ISO.",
            )

    deleted_count = purge_audit_logs_older_than_12_months(db, cutoff_date=parsed_cutoff)
    return create_response(
        request,
        status.HTTP_200_OK,
        f"Đã dọn dẹp {deleted_count} bản ghi nhật ký hết hạn",
        {"deleted_count": deleted_count},
    )
