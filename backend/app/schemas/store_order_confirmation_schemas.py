"""Schema kiểm tra dữ liệu đầu vào cho chức năng cửa hàng xác nhận/từ chối đơn thuê (TF14679)."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class StoreOrderConfirmSchema(BaseModel):
    """Dữ liệu gửi lên khi cửa hàng xác nhận đơn thuê."""

    owner_id: Optional[int] = Field(
        None,
        description="ID chủ cửa hàng (tùy chọn nếu đã truyền qua header X-User-Id)",
    )


class StoreOrderRejectSchema(BaseModel):
    """Dữ liệu gửi lên khi cửa hàng từ chối đơn thuê (bắt buộc kèm lý do)."""

    rejection_reason: str = Field(
        ...,
        description="Lý do từ chối đơn thuê (bắt buộc, độ dài từ 3 đến 500 ký tự)",
    )
    owner_id: Optional[int] = Field(
        None,
        description="ID chủ cửa hàng (tùy chọn nếu đã truyền qua header X-User-Id)",
    )

    @field_validator("rejection_reason")
    @classmethod
    def validate_rejection_reason(cls, v: str) -> str:
        """Loại bỏ khoảng trắng thừa và kiểm tra độ dài hợp lệ của lý do từ chối."""
        cleaned = (v or "").strip()
        if len(cleaned) < 3:
            raise ValueError("Lý do từ chối là bắt buộc và phải có ít nhất 3 ký tự.")
        if len(cleaned) > 500:
            raise ValueError("Lý do từ chối không được vượt quá 500 ký tự.")
        return cleaned
