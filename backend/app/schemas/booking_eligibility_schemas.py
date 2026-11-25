from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal
from pydantic import BaseModel, field_validator, model_validator


def calculate_age(dob: date, today: Optional[date] = None) -> int:
    """
    Tính tuổi chính xác theo ngày, tháng, năm sinh tính đến ngày hiện tại (today).
    """
    if today is None:
        today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class UserProfileUpdateSchema(BaseModel):
    fullname: str
    date_of_birth: date
    address: str
    phone_number: Optional[str] = None

    @field_validator("fullname")
    @classmethod
    def validate_fullname(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Họ tên không được để trống.")
        return value.strip()

    @field_validator("address")
    @classmethod
    def validate_address(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Địa chỉ không được để trống.")
        return value.strip()

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, dob: date) -> date:
        today = date.today()
        if dob > today:
            raise ValueError("Ngày sinh không hợp lệ (không được lớn hơn ngày hiện tại).")
        age = calculate_age(dob, today=today)
        if age < 18:
            raise ValueError("Người dùng chưa đủ 18 tuổi, không đủ điều kiện thuê xe.")
        return dob


class DriverLicenseSubmitSchema(BaseModel):
    license_number: str
    license_class: Literal["A", "A1", "B1", "C"]
    issue_date: datetime
    expiry_date: datetime

    @field_validator("license_number")
    @classmethod
    def validate_license_number(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Số giấy phép lái xe không được để trống.")
        return value.strip()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.expiry_date <= self.issue_date:
            raise ValueError("Ngày hết hạn GPLX phải lớn hơn ngày cấp.")
        return self


class OrderCalculateRequestSchema(BaseModel):
    vehicle_id: int
    price_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    delivery_method: str = "Nhận tại cửa hàng"
    delivery_address: Optional[str] = None
    delivery_distance_km: Optional[Decimal] = Decimal("0.00")

    @model_validator(mode="after")
    def validate_rental_period(self):
        if self.end_time <= self.start_time:
            raise ValueError("Thời gian trả xe phải lớn hơn thời gian nhận xe.")
        return self


class OrderCreateSchema(BaseModel):
    renter_id: int
    vehicle_id: int
    price_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    delivery_method: str = "Nhận tại cửa hàng"
    delivery_address: Optional[str] = None
    delivery_distance_km: Optional[Decimal] = Decimal("0.00")
    note: Optional[str] = None

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if len(cleaned) > 500:
            raise ValueError("Ghi chú không được vượt quá 500 ký tự.")
        return cleaned or None

    @model_validator(mode="after")
    def validate_rental_period(self):
        if self.end_time <= self.start_time:
            raise ValueError("Thời gian trả xe phải lớn hơn thời gian nhận xe.")
        return self
