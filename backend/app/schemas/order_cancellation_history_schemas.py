"""Schema kiểm tra dữ liệu đầu vào cho chức năng hủy đơn và hoàn cọc BR-04 (Task TF14841)."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class OrderCancelSchema(BaseModel):
    """Dữ liệu khách hàng gửi lên khi yêu cầu hủy đơn thuê."""

    cancel_reason: Optional[str] = Field(
        None,
        description="Lý do hủy đơn của khách hàng (tùy chọn, tối đa 500 ký tự)",
    )
    renter_id: Optional[int] = Field(
        None,
        description="ID khách thuê (tùy chọn nếu đã truyền qua header X-User-Id)",
    )

    @field_validator("cancel_reason")
    @classmethod
    def validate_cancel_reason(cls, v: Optional[str]) -> Optional[str]:
        """Chuẩn hóa khoảng trắng và giới hạn độ dài lý do hủy tối đa 500 ký tự."""
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if len(cleaned) > 500:
            raise ValueError("Lý do hủy đơn không được vượt quá 500 ký tự.")
        return cleaned
