import re
from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator

from app.schemas.booking_eligibility_schemas import calculate_age

VALID_LICENSE_CLASSES = {"A", "A1", "B1", "C"}


class PersonalProfileUpdateSchema(BaseModel):
    fullname: str
    date_of_birth: date
    address: str
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    license_number: Optional[str] = None
    license_class: Optional[str] = None

    @field_validator("fullname")
    @classmethod
    def validate_fullname(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Họ và tên không được để trống.")
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
            raise ValueError("Người dùng phải từ đủ 18 tuổi trở lên.")
        return dob

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip().replace(" ", "")
        if not cleaned:
            return None
        if len(cleaned) > 15 or not cleaned.lstrip("+").isdigit():
            raise ValueError("Số điện thoại không hợp lệ (tối đa 15 chữ số).")
        return cleaned

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip().lower()
        return cleaned if cleaned else None

    @field_validator("license_number")
    @classmethod
    def validate_license_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = re.sub(r"\s+", "", value).strip()
        if not cleaned:
            return None
        if not re.match(r"^[A-Za-z0-9-]{5,20}$", cleaned):
            raise ValueError("Số giấy phép lái xe gồm 5–20 ký tự chữ hoặc số.")
        return cleaned

    @field_validator("license_class")
    @classmethod
    def validate_license_class(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip().upper()
        if not cleaned:
            return None
        if cleaned not in VALID_LICENSE_CLASSES:
            raise ValueError(f"Hạng giấy phép lái xe chỉ chấp nhận: {', '.join(sorted(VALID_LICENSE_CLASSES))}.")
        return cleaned
