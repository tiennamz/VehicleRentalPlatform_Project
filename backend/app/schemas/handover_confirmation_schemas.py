"""Schema kiểm tra dữ liệu đầu vào cho luồng xác nhận bàn giao 2 chiều (Task TF148C7)."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class HandoverConfirmSchema(BaseModel):
    """Dữ liệu gửi lên khi nhân viên hoặc khách hàng xác nhận bàn giao nhận xe."""

    condition_note: Optional[str] = Field(
        None,
        description="Ghi chú tình trạng xe khi bàn giao (tùy chọn, tối đa 255 ký tự)",
    )
    user_id: Optional[int] = Field(
        None,
        description="ID người xác nhận (tùy chọn nếu đã truyền qua header X-User-Id)",
    )

    @field_validator("condition_note")
    @classmethod
    def validate_condition_note(cls, v: Optional[str]) -> Optional[str]:
        """Chuẩn hóa khoảng trắng và giới hạn độ dài ghi chú tình trạng xe tối đa 255 ký tự."""
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if len(cleaned) > 255:
            raise ValueError("Ghi chú tình trạng xe không được vượt quá 255 ký tự.")
        return cleaned
