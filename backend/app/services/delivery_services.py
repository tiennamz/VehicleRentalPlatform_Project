from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.system_config import SystemConfig
from app.schemas.delivery_schemas import DeliveryConfigSchema, DeliveryMethodEnum

DEFAULT_DELIVERY_CONFIG = {
    "allow_store_pickup": ("true", "Cho phép khách nhận xe trực tiếp tại cửa hàng"),
    "allow_home_delivery": ("true", "Cho phép giao xe tận nơi trong bán kính quy định"),
    "max_delivery_radius_km": ("15.00", "Bán kính giao xe tận nơi tối đa tính bằng km"),
    "delivery_base_fee": ("30000.00", "Phí cố định cơ bản khi giao xe tận nơi (VNĐ)"),
    "delivery_fee_per_km": ("10000.00", "Đơn giá phí giao xe tận nơi trên mỗi km (VNĐ)"),
}


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_delivery_config(db: Session) -> Dict[str, Any]:
    """
    Lấy cấu hình giao nhận xe hiện tại từ bảng system_config.
    Nếu chưa có trong DB thì trả về giá trị mặc định chuẩn.
    """
    keys = list(DEFAULT_DELIVERY_CONFIG.keys())
    rows = db.query(SystemConfig).filter(SystemConfig.config_key.in_(keys)).all()
    raw_map = {r.config_key: r.config_value for r in rows}

    def _get_bool(key: str) -> bool:
        val = raw_map.get(key, DEFAULT_DELIVERY_CONFIG[key][0])
        return str(val).strip().lower() in ("true", "1", "yes")

    def _get_decimal(key: str) -> Decimal:
        val = raw_map.get(key, DEFAULT_DELIVERY_CONFIG[key][0])
        return Decimal(str(val).strip()).quantize(Decimal("0.01"))

    return {
        "allow_store_pickup": _get_bool("allow_store_pickup"),
        "allow_home_delivery": _get_bool("allow_home_delivery"),
        "max_delivery_radius_km": _get_decimal("max_delivery_radius_km"),
        "delivery_base_fee": _get_decimal("delivery_base_fee"),
        "delivery_fee_per_km": _get_decimal("delivery_fee_per_km"),
    }


def update_delivery_config(db: Session, config_data: DeliveryConfigSchema) -> Dict[str, Any]:
    """
    Cập nhật cấu hình giao tại cửa hàng hoặc giao tận nơi (bán kính quy định và phí tương ứng).
    """
    updates = {
        "allow_store_pickup": "true" if config_data.allow_store_pickup else "false",
        "allow_home_delivery": "true" if config_data.allow_home_delivery else "false",
        "max_delivery_radius_km": str(config_data.max_delivery_radius_km.quantize(Decimal("0.01"))),
        "delivery_base_fee": str(config_data.delivery_base_fee.quantize(Decimal("0.01"))),
        "delivery_fee_per_km": str(config_data.delivery_fee_per_km.quantize(Decimal("0.01"))),
    }

    now_utc = get_utc_now()
    for key, val in updates.items():
        row = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
        if row:
            row.config_value = val
        else:
            row = SystemConfig(
                config_key=key,
                config_value=val,
                description=DEFAULT_DELIVERY_CONFIG[key][1],
                created_at=now_utc,
            )
            db.add(row)

    try:
        db.commit()
        return get_delivery_config(db)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể cập nhật cấu hình giao nhận xe: {str(e)}",
        )


def normalize_delivery_method(method: Optional[str]) -> str:
    if not method or not method.strip():
        return DeliveryMethodEnum.STORE_PICKUP.value
    cleaned = method.strip()
    if cleaned in ("STORE_PICKUP", DeliveryMethodEnum.STORE_PICKUP.value):
        return DeliveryMethodEnum.STORE_PICKUP.value
    if cleaned in ("HOME_DELIVERY", DeliveryMethodEnum.HOME_DELIVERY.value):
        return DeliveryMethodEnum.HOME_DELIVERY.value
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Phương thức giao nhận '{method}' không hợp lệ. Chỉ chấp nhận 'Nhận tại cửa hàng' hoặc 'Giao tận nơi'.",
    )


def calculate_and_validate_delivery_fee(
    db: Session,
    delivery_method: Optional[str] = "Nhận tại cửa hàng",
    delivery_distance_km: Optional[Decimal] = Decimal("0.00"),
    delivery_address: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Kiểm tra phương thức giao nhận, kiểm tra bán kính giao tận nơi quy định và tính phí giao xe tương ứng.
    """
    cfg = get_delivery_config(db)
    normalized_method = normalize_delivery_method(delivery_method)

    # 1. Trường hợp Nhận tại cửa hàng
    if normalized_method == DeliveryMethodEnum.STORE_PICKUP.value:
        if not cfg["allow_store_pickup"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cửa hàng hiện không hỗ trợ phương thức nhận xe trực tiếp tại cửa hàng.",
            )
        return {
            "delivery_method": DeliveryMethodEnum.STORE_PICKUP.value,
            "delivery_address": delivery_address.strip() if delivery_address else None,
            "delivery_distance_km": Decimal("0.00"),
            "delivery_fee": Decimal("0.00"),
            "max_delivery_radius_km": cfg["max_delivery_radius_km"],
        }

    # 2. Trường hợp Giao tận nơi
    if not cfg["allow_home_delivery"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cửa hàng hiện không hỗ trợ giao xe tận nơi.",
        )

    if not delivery_address or not delivery_address.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập địa chỉ giao xe khi chọn phương thức Giao tận nơi.",
        )

    if delivery_distance_km is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp khoảng cách giao xe (delivery_distance_km) khi chọn Giao tận nơi.",
        )

    dist = Decimal(str(delivery_distance_km)).quantize(Decimal("0.01"))
    if dist <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoảng cách giao xe tận nơi phải lớn hơn 0 km.",
        )

    max_radius = cfg["max_delivery_radius_km"]
    if dist > max_radius:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Khoảng cách giao xe ({dist} km) vượt quá bán kính quy định tối đa ({max_radius} km).",
        )

    fee = (cfg["delivery_base_fee"] + (dist * cfg["delivery_fee_per_km"])).quantize(Decimal("0.01"))

    return {
        "delivery_method": DeliveryMethodEnum.HOME_DELIVERY.value,
        "delivery_address": delivery_address.strip(),
        "delivery_distance_km": dist,
        "delivery_fee": fee,
        "max_delivery_radius_km": max_radius,
    }
