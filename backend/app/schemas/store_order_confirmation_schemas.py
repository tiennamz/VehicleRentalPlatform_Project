from typing import Optional
from pydantic import BaseModel, Field, field_validator


class StoreOrderConfirmSchema(BaseModel):
    owner_id: Optional[int] = Field(None, description="ID chủ cửa hàng (tùy chọn nếu truyền qua header X-User-Id)")


class StoreOrderRejectSchema(BaseModel):
    rejection_reason: str = Field(..., description="Lý do từ chối đơn thuê (bắt buộc, 3-500 ký tự)")
    owner_id: Optional[int] = Field(None, description="ID chủ cửa hàng (tùy chọn nếu truyền qua header X-User-Id)")

    @field_validator("rejection_reason")
    @classmethod
    def validate_rejection_reason(cls, v: str) -> str:
        cleaned = (v or "").strip()
        if len(cleaned) < 3:
            raise ValueError("Lý do từ chối là bắt buộc và phải có ít nhất 3 ký tự.")
        if len(cleaned) > 500:
            raise ValueError("Lý do từ chối không được vượt quá 500 ký tự.")
        return cleaned
