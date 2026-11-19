from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, field_validator

class ReviewActionEnum(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"

class ReviewKYCRequestSchema(BaseModel):
    action: ReviewActionEnum
    rejected_reason: Optional[str] = None

    @field_validator("rejected_reason")
    @classmethod
    def validate_rejected_reason(cls, value, info):
        action = info.data.get("action")
        if action == ReviewActionEnum.REJECT:
            if not value or not str(value).strip():
                raise ValueError("Bắt buộc phải có lý do từ chối (rejected_reason) khi từ chối hồ sơ.")
        return value.strip() if value else None

class CustomerKYCDetailResponse(BaseModel):
    user_id: int
    fullname: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    driver_license: Optional[Dict[str, Any]] = None
    id_card: Optional[Dict[str, Any]] = None

