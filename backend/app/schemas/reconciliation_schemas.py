"""Schema kiểm tra dữ liệu đầu vào cho chức năng chốt đối soát tuần & hoa hồng BR-09 (TF149EA)."""

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class WeeklyReconciliationGenerateSchema(BaseModel):
    """Dữ liệu gửi lên khi chốt và lưu bảng đối soát tuần cho cửa hàng."""

    store_id: Optional[int] = Field(
        None,
        description="ID cửa hàng cần chốt đối soát (bỏ trống sẽ chốt cho tất cả cửa hàng)",
    )
    week_start: Optional[date] = Field(
        None,
        description="Ngày bất kỳ trong tuần cần chốt (hệ thống tự quy về Thứ 2 đầu tuần)",
    )
