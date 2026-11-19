from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator


class DeliveryMethodEnum(str, Enum):
    STORE_PICKUP = "Nhận tại cửa hàng"
    HOME_DELIVERY = "Giao tận nơi"


class DeliveryConfigSchema(BaseModel):
    allow_store_pickup: bool = True
    allow_home_delivery: bool = True
    max_delivery_radius_km: Decimal = Decimal("15.00")
    delivery_base_fee: Decimal = Decimal("30000.00")
    delivery_fee_per_km: Decimal = Decimal("10000.00")

    @field_validator("max_delivery_radius_km", "delivery_base_fee", "delivery_fee_per_km")
    @classmethod
    def validate_non_negative(cls, value: Decimal) -> Decimal:
        if value < Decimal("0"):
            raise ValueError("Bán kính và các mức phí giao xe không được là số âm.")
        return value.quantize(Decimal("0.01"))

    @model_validator(mode="after")
    def validate_at_least_one_method(self):
        if not self.allow_store_pickup and not self.allow_home_delivery:
            raise ValueError("Phải bật ít nhất một phương thức giao nhận xe (Nhận tại cửa hàng hoặc Giao tận nơi).")
        return self


class DeliveryFeeCalculateRequestSchema(BaseModel):
    delivery_method: str = DeliveryMethodEnum.STORE_PICKUP.value
    delivery_distance_km: Optional[Decimal] = Decimal("0.00")
    delivery_address: Optional[str] = None
