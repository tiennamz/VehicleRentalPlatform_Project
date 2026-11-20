from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.personal_data_access_log import PersonalDataAccessLog

MIN_RETENTION_DAYS = 365


def get_current_utc_time() -> datetime:
    """Trả về thời gian UTC dạng naive datetime tương thích với SQLAlchemy MySQL/TiDB/SQLite."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def record_personal_data_access(
    db: Session,
    accessor_id: int,
    target_user_id: int,
    data_type: str,
    action: str,
    reason: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> PersonalDataAccessLog:
    """
    Ghi nhật ký mỗi khi người dùng có thẩm quyền (Admin/Nhân viên)
    truy cập, xem, duyệt hoặc từ chối dữ liệu cá nhân của khách hàng.
    """
    safe_ua = user_agent[:255] if user_agent else None
    safe_ip = ip_address[:45] if ip_address else None

    log_entry = PersonalDataAccessLog(
        accessor_id=accessor_id,
        target_user_id=target_user_id,
        data_type=data_type,
        action=action,
        reason=reason,
        ip_address=safe_ip,
        user_agent=safe_ua,
        accessed_at=get_current_utc_time(),
    )

    try:
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể ghi nhật ký truy cập dữ liệu cá nhân: {str(e)}",
        )


def get_personal_data_audit_logs(
    db: Session,
    target_user_id: Optional[int] = None,
    accessor_id: Optional[int] = None,
    action: Optional[str] = None,
    data_type: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[PersonalDataAccessLog]:
    """
    Truy vấn lịch sử nhật ký truy cập dữ liệu cá nhân theo các tiêu chí lọc.
    """
    query = db.query(PersonalDataAccessLog)

    if target_user_id:
        query = query.filter(PersonalDataAccessLog.target_user_id == target_user_id)
    if accessor_id:
        query = query.filter(PersonalDataAccessLog.accessor_id == accessor_id)
    if action:
        query = query.filter(PersonalDataAccessLog.action == action)
    if data_type:
        query = query.filter(PersonalDataAccessLog.data_type == data_type)
    if from_date:
        query = query.filter(PersonalDataAccessLog.accessed_at >= from_date)
    if to_date:
        query = query.filter(PersonalDataAccessLog.accessed_at <= to_date)

    return query.order_by(PersonalDataAccessLog.accessed_at.desc()).offset(offset).limit(limit).all()


def purge_audit_logs_older_than_12_months(
    db: Session,
    cutoff_date: Optional[datetime] = None,
) -> int:
    """
    Quy tắc lưu trữ tối thiểu 12 tháng:
    Tuyệt đối không được phép xóa bất kỳ nhật ký nào có thời gian lưu trữ dưới 365 ngày.
    """
    now_utc = get_current_utc_time()
    max_allowable_cutoff = now_utc - timedelta(days=MIN_RETENTION_DAYS)

    if cutoff_date is None:
        cutoff_date = max_allowable_cutoff
    elif cutoff_date > max_allowable_cutoff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vi phạm chính sách lưu trữ: Nhật ký truy cập dữ liệu cá nhân phải được lưu trữ tối thiểu 12 tháng.",
        )

    try:
        deleted_count = (
            db.query(PersonalDataAccessLog)
            .filter(PersonalDataAccessLog.accessed_at < cutoff_date)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted_count
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa nhật ký hết hạn: {str(e)}",
        )
