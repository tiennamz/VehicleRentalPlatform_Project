from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class SystemConfigUpdateSchema(BaseModel):
    """
    Schema cập nhật cấu hình hệ thống (hỗ trợ cập nhật toàn phần hoặc từng phần).
    """

    commission_rate: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("100"))
    hold_time_minutes: Optional[int] = Field(None, ge=1, le=1440)
    cancel_full_refund_hours: Optional[Decimal] = Field(None, gt=Decimal("0"), le=Decimal("720"))
    cancel_full_refund_rate: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("100"))
    cancel_partial_refund_hours: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("720"))
    cancel_partial_refund_rate: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("100"))
    cancel_late_refund_rate: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("100"))
    late_return_grace_minutes: Optional[int] = Field(None, ge=0, le=720)
    late_return_fee_per_hour: Optional[Decimal] = Field(None, ge=Decimal("0"))


class LateReturnFeeCalculateRequestSchema(BaseModel):
    actual_return_time: Optional[datetime] = Field(
        None,
        description="Thời điểm khách thực tế trả xe (ISO-8601). Nếu bỏ trống dùng thời điểm hiện tại.",
    )
