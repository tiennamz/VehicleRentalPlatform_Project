import pytest
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.database import Base
from app.models.user import User
from app.models.personal_data_access_log import PersonalDataAccessLog
from app.services.audit_log_services import (
    record_personal_data_access,
    get_personal_data_audit_logs,
    purge_audit_logs_older_than_12_months,
)

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    admin = User(user_id=1, fullname="Admin User", email="admin@example.com")
    customer = User(user_id=2, fullname="Customer User", email="customer@example.com")
    session.add_all([admin, customer])
    session.commit()

    yield session
    session.close()

def test_record_personal_data_access(db_session):
    log = record_personal_data_access(
        db=db_session,
        accessor_id=1,
        target_user_id=2,
        data_type="DRIVERS_LICENSE",
        action="VIEW",
        reason="Kiểm tra bằng lái để duyệt đơn thuê",
        ip_address="192.168.1.100",
        user_agent="A" * 300,
    )

    assert log.log_id is not None
    assert log.accessor_id == 1
    assert log.target_user_id == 2
    assert log.action == "VIEW"
    assert len(log.user_agent) == 255

def test_get_personal_data_audit_logs_with_filter(db_session):
    record_personal_data_access(db_session, 1, 2, "DRIVERS_LICENSE", "VIEW", "Xem chi tiết")
    record_personal_data_access(db_session, 1, 2, "DRIVERS_LICENSE", "APPROVE", "Duyệt bằng lái")
    record_personal_data_access(db_session, 1, 2, "CCCD", "REJECT", "Ảnh mờ")

    logs_all = get_personal_data_audit_logs(db_session, target_user_id=2)
    assert len(logs_all) == 3

    logs_filtered = get_personal_data_audit_logs(db_session, target_user_id=2, action="APPROVE")
    assert len(logs_filtered) == 1
    assert logs_filtered[0].action == "APPROVE"

def test_purge_audit_logs_under_12_months_raises_403(db_session):
    recent_cutoff = utc_now() - timedelta(days=180)
    with pytest.raises(HTTPException) as exc_info:
        purge_audit_logs_older_than_12_months(db_session, cutoff_date=recent_cutoff)

    assert exc_info.value.status_code == 403
    assert "tối thiểu 12 tháng" in exc_info.value.detail

def test_purge_audit_logs_older_than_12_months_succeeds(db_session):
    old_log = PersonalDataAccessLog(
        accessor_id=1,
        target_user_id=2,
        data_type="CCCD",
        action="VIEW",
        reason="Tra cứu cũ",
        accessed_at=utc_now() - timedelta(days=400)
    )
    fresh_log = PersonalDataAccessLog(
        accessor_id=1,
        target_user_id=2,
        data_type="CCCD",
        action="VIEW",
        reason="Tra cứu mới",
        accessed_at=utc_now() - timedelta(days=10)
    )
    db_session.add_all([old_log, fresh_log])
    db_session.commit()

    cutoff = utc_now() - timedelta(days=370)
    deleted_count = purge_audit_logs_older_than_12_months(db_session, cutoff_date=cutoff)

    assert deleted_count == 1
    remaining_logs = db_session.query(PersonalDataAccessLog).all()
    assert len(remaining_logs) == 1
    assert remaining_logs[0].reason == "Tra cứu mới"
