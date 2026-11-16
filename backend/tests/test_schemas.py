import pytest
from datetime import datetime
from pydantic import ValidationError
from app.schemas.verification_schemas import ReviewKYCRequestSchema, ReviewActionEnum
from app.schemas.audit_log_schemas import AuditLogResponseSchema

def test_reject_action_requires_reason():
    with pytest.raises(ValidationError) as exc_info:
        ReviewKYCRequestSchema(action=ReviewActionEnum.REJECT, rejected_reason="")
    assert "Bắt buộc phải có lý do từ chối" in str(exc_info.value)

def test_reject_action_with_whitespace_fails():
    with pytest.raises(ValidationError) as exc_info:
        ReviewKYCRequestSchema(action=ReviewActionEnum.REJECT, rejected_reason="    ")
    assert "Bắt buộc phải có lý do từ chối" in str(exc_info.value)

def test_reject_action_with_valid_reason_passes():
    schema = ReviewKYCRequestSchema(action=ReviewActionEnum.REJECT, rejected_reason="Ảnh GPLX bị mờ")
    assert schema.action == ReviewActionEnum.REJECT
    assert schema.rejected_reason == "Ảnh GPLX bị mờ"

def test_approve_action_accepts_none_reason():
    schema = ReviewKYCRequestSchema(action=ReviewActionEnum.APPROVE)
    assert schema.action == ReviewActionEnum.APPROVE
    assert schema.rejected_reason is None

def test_audit_log_response_schema():
    data = {
        "log_id": 1,
        "accessor_id": 10,
        "target_user_id": 20,
        "data_type": "DRIVERS_LICENSE",
        "action": "APPROVE",
        "reason": "Hồ sơ hợp lệ",
        "ip_address": "127.0.0.1",
        "user_agent": "Mozilla/5.0",
        "accessed_at": datetime.now()
    }
    log = AuditLogResponseSchema(**data)
    assert log.log_id == 1
    assert log.action == "APPROVE"

