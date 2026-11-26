"""
Dịch vụ quản trị cấu hình hệ thống tập trung (Task TF14C2C):
- Hoa hồng nền tảng (`commission_rate`)
- Thời gian giữ chỗ / hạn xác nhận đơn (`hold_time_minutes`, đồng bộ `store_confirmation_timeout_minutes`)
- Chính sách hủy đơn & hoàn cọc (`cancel_full_refund_hours/rate`, `cancel_partial_refund_hours/rate`, `cancel_late_refund_rate`)
- Phí trả trễ (`late_return_grace_minutes`, `late_return_fee_per_hour`)
"""

from datetime import datetime, timezone
from decimal import Decimal
import math
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.system_config import SystemConfig
from app.schemas.system_config_schemas import SystemConfigUpdateSchema

DEFAULT_SYSTEM_CONFIG: Dict[str, tuple[str, str]] = {
    "commission_rate": ("12.00", "Tỷ lệ hoa hồng nền tảng (%) tính trên tiền thuê xe"),
    "hold_time_minutes": ("15", "Thời gian giữ chỗ / hạn cửa hàng xác nhận đơn (phút)"),
    "cancel_full_refund_hours": ("24.00", "Số giờ tối thiểu trước khi nhận xe để được hoàn cọc mức cao nhất"),
    "cancel_full_refund_rate": ("100.00", "Tỷ lệ hoàn cọc (%) khi hủy trước mốc hoàn toàn phần"),
    "cancel_partial_refund_hours": ("6.00", "Số giờ tối thiểu trước khi nhận xe để được hoàn cọc một phần"),
    "cancel_partial_refund_rate": ("50.00", "Tỷ lệ hoàn cọc (%) khi hủy trong khung hoàn một phần"),
    "cancel_late_refund_rate": ("0.00", "Tỷ lệ hoàn cọc (%) khi hủy sát giờ nhận xe"),
    "late_return_grace_minutes": ("30", "Thời gian miễn phạt khi trả xe trễ (phút)"),
    "late_return_fee_per_hour": ("50000.00", "Phí trả xe trễ cố định mỗi giờ (VNĐ/giờ)"),
}

LEGACY_HOLD_TIME_KEY = "store_confirmation_timeout_minutes"


def _now_utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_decimal(raw: Any, default_str: str) -> Decimal:
    try:
        return Decimal(str(raw).strip()).quantize(Decimal("0.01"))
    except Exception:
        return Decimal(default_str).quantize(Decimal("0.01"))


def _parse_int(raw: Any, default_str: str) -> int:
    try:
        return int(str(raw).strip())
    except Exception:
        return int(default_str)


def get_system_config(db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Đọc toàn bộ cấu hình nghiệp vụ từ bảng `system_config`.
    Nếu chưa được lưu trong DB hoặc không truyền `db`, trả về giá trị mặc định chuẩn.
    """
    raw_map: Dict[str, str] = {}
    if db is not None:
        keys = list(DEFAULT_SYSTEM_CONFIG.keys()) + [LEGACY_HOLD_TIME_KEY]
        rows = db.query(SystemConfig).filter(SystemConfig.config_key.in_(keys)).all()
        raw_map = {r.config_key: r.config_value for r in rows if r.config_value is not None}

    raw_hold = raw_map.get("hold_time_minutes")
    if raw_hold is None:
        raw_hold = raw_map.get(LEGACY_HOLD_TIME_KEY, DEFAULT_SYSTEM_CONFIG["hold_time_minutes"][0])
    hold_minutes = _parse_int(raw_hold, DEFAULT_SYSTEM_CONFIG["hold_time_minutes"][0])
    if hold_minutes <= 0:
        hold_minutes = int(DEFAULT_SYSTEM_CONFIG["hold_time_minutes"][0])

    commission_rate = _parse_decimal(
        raw_map.get("commission_rate", DEFAULT_SYSTEM_CONFIG["commission_rate"][0]),
        DEFAULT_SYSTEM_CONFIG["commission_rate"][0],
    )
    if not (Decimal("0.00") <= commission_rate <= Decimal("100.00")):
        commission_rate = Decimal(DEFAULT_SYSTEM_CONFIG["commission_rate"][0])

    grace_minutes = _parse_int(
        raw_map.get("late_return_grace_minutes", DEFAULT_SYSTEM_CONFIG["late_return_grace_minutes"][0]),
        DEFAULT_SYSTEM_CONFIG["late_return_grace_minutes"][0],
    )
    if grace_minutes < 0:
        grace_minutes = int(DEFAULT_SYSTEM_CONFIG["late_return_grace_minutes"][0])

    fee_per_hour = _parse_decimal(
        raw_map.get("late_return_fee_per_hour", DEFAULT_SYSTEM_CONFIG["late_return_fee_per_hour"][0]),
        DEFAULT_SYSTEM_CONFIG["late_return_fee_per_hour"][0],
    )
    if fee_per_hour < Decimal("0.00"):
        fee_per_hour = Decimal(DEFAULT_SYSTEM_CONFIG["late_return_fee_per_hour"][0])

    return {
        "commission_rate": commission_rate,
        "hold_time_minutes": hold_minutes,
        "cancel_full_refund_hours": _parse_decimal(
            raw_map.get("cancel_full_refund_hours", DEFAULT_SYSTEM_CONFIG["cancel_full_refund_hours"][0]),
            DEFAULT_SYSTEM_CONFIG["cancel_full_refund_hours"][0],
        ),
        "cancel_full_refund_rate": _parse_decimal(
            raw_map.get("cancel_full_refund_rate", DEFAULT_SYSTEM_CONFIG["cancel_full_refund_rate"][0]),
            DEFAULT_SYSTEM_CONFIG["cancel_full_refund_rate"][0],
        ),
        "cancel_partial_refund_hours": _parse_decimal(
            raw_map.get("cancel_partial_refund_hours", DEFAULT_SYSTEM_CONFIG["cancel_partial_refund_hours"][0]),
            DEFAULT_SYSTEM_CONFIG["cancel_partial_refund_hours"][0],
        ),
        "cancel_partial_refund_rate": _parse_decimal(
            raw_map.get("cancel_partial_refund_rate", DEFAULT_SYSTEM_CONFIG["cancel_partial_refund_rate"][0]),
            DEFAULT_SYSTEM_CONFIG["cancel_partial_refund_rate"][0],
        ),
        "cancel_late_refund_rate": _parse_decimal(
            raw_map.get("cancel_late_refund_rate", DEFAULT_SYSTEM_CONFIG["cancel_late_refund_rate"][0]),
            DEFAULT_SYSTEM_CONFIG["cancel_late_refund_rate"][0],
        ),
        "late_return_grace_minutes": grace_minutes,
        "late_return_fee_per_hour": fee_per_hour,
    }


def get_hold_time_minutes(db: Optional[Session] = None) -> int:
    return int(get_system_config(db)["hold_time_minutes"])


def _validate_merged_config(merged: Dict[str, Any]) -> None:
    if merged["cancel_full_refund_hours"] <= merged["cancel_partial_refund_hours"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mốc giờ hoàn cọc toàn phần (cancel_full_refund_hours) phải lớn hơn mốc hoàn một phần (cancel_partial_refund_hours).",
        )
    if merged["cancel_full_refund_rate"] < merged["cancel_partial_refund_rate"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tỷ lệ hoàn cọc toàn phần (cancel_full_refund_rate) phải lớn hơn hoặc bằng tỷ lệ hoàn một phần (cancel_partial_refund_rate).",
        )
    if merged["cancel_partial_refund_rate"] < merged["cancel_late_refund_rate"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tỷ lệ hoàn cọc một phần (cancel_partial_refund_rate) phải lớn hơn hoặc bằng tỷ lệ hoàn sát giờ (cancel_late_refund_rate).",
        )


def _upsert_config_row(db: Session, key: str, value: str, description: str, now_utc: datetime) -> None:
    row = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
    if row:
        row.config_value = value
    else:
        db.add(
            SystemConfig(
                config_key=key,
                config_value=value,
                description=description,
                created_at=now_utc,
            )
        )


def update_system_config(db: Session, payload: SystemConfigUpdateSchema) -> Dict[str, Any]:
    """
    Cập nhật cấu hình hệ thống (toàn phần hoặc từng phần) vào `system_config`
    và kiểm tra toàn bộ ràng buộc chéo trước khi lưu.
    """
    current = get_system_config(db)
    provided = payload.model_dump(exclude_none=True)
    if not provided:
        return current

    merged = dict(current)
    for k, v in provided.items():
        if isinstance(v, Decimal):
            merged[k] = v.quantize(Decimal("0.01"))
        else:
            merged[k] = v

    _validate_merged_config(merged)

    now_utc = _now_utc_naive()
    for key, val in provided.items():
        str_val = (
            str(val.quantize(Decimal("0.01")))
            if isinstance(val, Decimal)
            else str(int(val))
        )
        _upsert_config_row(db, key, str_val, DEFAULT_SYSTEM_CONFIG[key][1], now_utc)
        if key == "hold_time_minutes":
            _upsert_config_row(
                db,
                LEGACY_HOLD_TIME_KEY,
                str_val,
                "Thời hạn xác nhận đơn hàng của cửa hàng (phút) - đồng bộ với hold_time_minutes",
                now_utc,
            )

    try:
        db.commit()
        return get_system_config(db)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể cập nhật cấu hình hệ thống: {str(exc)}",
        ) from exc


def calculate_late_return_fee(
    db: Optional[Session],
    expected_end_time: datetime,
    actual_return_time: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Tính phí trả xe trễ theo Phương án A:
    - Miễn phạt trong `late_return_grace_minutes` phút đầu.
    - Sau thời gian miễn phạt, làm tròn lên từng giờ và nhân `late_return_fee_per_hour`.
    """
    cfg = get_system_config(db)
    grace_minutes: int = cfg["late_return_grace_minutes"]
    fee_per_hour: Decimal = cfg["late_return_fee_per_hour"]

    expected = expected_end_time.replace(tzinfo=None)
    actual = (actual_return_time or _now_utc_naive()).replace(tzinfo=None)

    diff_seconds = (actual - expected).total_seconds()
    late_minutes = max(0, int(diff_seconds // 60)) if diff_seconds > 0 else 0

    if late_minutes <= grace_minutes:
        billable_hours = 0
        late_fee = Decimal("0.00")
        policy_note = (
            f"Trả xe đúng hạn hoặc trong thời gian miễn phạt ({grace_minutes} phút) — không phát sinh phí trả trễ."
        )
    else:
        chargeable_minutes = late_minutes - grace_minutes
        billable_hours = math.ceil(chargeable_minutes / 60)
        late_fee = (Decimal(billable_hours) * fee_per_hour).quantize(Decimal("0.01"))
        policy_note = (
            f"Trả xe trễ {late_minutes} phút (miễn phạt {grace_minutes} phút, tính phí {billable_hours} giờ × "
            f"{int(fee_per_hour):,}đ/giờ = {int(late_fee):,}đ)."
        )

    return {
        "expected_end_time": expected.isoformat(),
        "actual_return_time": actual.isoformat(),
        "late_minutes": late_minutes,
        "grace_minutes": grace_minutes,
        "billable_late_hours": billable_hours,
        "fee_per_hour": fee_per_hour,
        "late_fee": late_fee,
        "policy_note": policy_note,
    }


def serialize_system_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "commission_rate": float(cfg["commission_rate"]),
        "hold_time_minutes": int(cfg["hold_time_minutes"]),
        "cancel_full_refund_hours": float(cfg["cancel_full_refund_hours"]),
        "cancel_full_refund_rate": float(cfg["cancel_full_refund_rate"]),
        "cancel_partial_refund_hours": float(cfg["cancel_partial_refund_hours"]),
        "cancel_partial_refund_rate": float(cfg["cancel_partial_refund_rate"]),
        "cancel_late_refund_rate": float(cfg["cancel_late_refund_rate"]),
        "late_return_grace_minutes": int(cfg["late_return_grace_minutes"]),
        "late_return_fee_per_hour": float(cfg["late_return_fee_per_hour"]),
    }
