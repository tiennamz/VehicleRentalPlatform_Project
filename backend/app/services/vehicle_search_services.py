from datetime import datetime, timezone
import math
from typing import Optional, Sequence
from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.city import City
from app.models.order import Order
from app.models.price_table import PriceTable
from app.models.review import Review
from app.models.store import Store
from app.models.vehicle import Vehicle
from app.schemas.delivery_schemas import DeliveryMethodEnum
from app.schemas.vehicle_search_schemas import VehicleSearchItem
from app.services.delivery_services import get_delivery_config

VEHICLE_TYPE_ALIASES = {
    "xe-may": {"Xe tay ga", "Xe số"},
    "xe máy": {"Xe tay ga", "Xe số"},
    "xe-dien": {"Xe điện"},
    "xe điện": {"Xe điện"},
    "o-to": {"Ô tô 4 chỗ", "Ô tô 7 chỗ", "Ô tô 16 chỗ"},
    "ô tô": {"Ô tô 4 chỗ", "Ô tô 7 chỗ", "Ô tô 16 chỗ"},
    "xe tay ga": {"Xe tay ga"},
    "xe số": {"Xe số"},
    "ô tô 4 chỗ": {"Ô tô 4 chỗ"},
    "ô tô 7 chỗ": {"Ô tô 7 chỗ"},
    "ô tô 16 chỗ": {"Ô tô 16 chỗ"},
}

DELIVERY_METHOD_ALIASES = {
    "tai-cua-hang": DeliveryMethodEnum.STORE_PICKUP.value,
    "store_pickup": DeliveryMethodEnum.STORE_PICKUP.value,
    "nhận tại cửa hàng": DeliveryMethodEnum.STORE_PICKUP.value,
    "tại cửa hàng": DeliveryMethodEnum.STORE_PICKUP.value,
    "giao-tan-noi": DeliveryMethodEnum.HOME_DELIVERY.value,
    "home_delivery": DeliveryMethodEnum.HOME_DELIVERY.value,
    "giao tận nơi": DeliveryMethodEnum.HOME_DELIVERY.value,
    "giao xe tận nơi": DeliveryMethodEnum.HOME_DELIVERY.value,
}

DAILY_PRICE_TYPES = {"DAILY", "DAY", "NGÀY", "THEO NGÀY"}
INACTIVE_ORDER_STATUSES = {
    "Đã hủy",
    "Hoàn thành",
    "Cửa hàng từ chối",
    "Từ chối",
    "Cancelled",
    "Completed",
    "Rejected",
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách đường chim bay (km) theo công thức Haversine."""
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(radius_km * c, 2)


def _split_multi_values(values: Optional[Sequence[str] | str]) -> list[str]:
    if values is None:
        return []
    raw_list = [values] if isinstance(values, str) else list(values)
    result: list[str] = []
    for entry in raw_list:
        if not entry:
            continue
        for part in str(entry).split(","):
            cleaned = part.strip()
            if cleaned:
                result.append(cleaned)
    return result


def _expand_vehicle_types(raw_types: list[str]) -> set[str]:
    expanded: set[str] = set()
    for item in raw_types:
        mapped = VEHICLE_TYPE_ALIASES.get(item.lower())
        if mapped:
            expanded.update(mapped)
        else:
            expanded.add(item)
    return expanded


def _normalize_delivery_methods(raw_methods: list[str]) -> set[str]:
    normalized: set[str] = set()
    for item in raw_methods:
        mapped = DELIVERY_METHOD_ALIASES.get(item.lower())
        if not mapped:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Hình thức giao nhận '{item}' không hợp lệ.",
            )
        normalized.add(mapped)
    return normalized


def _normalize_sort(sort_by: Optional[str], sort_order: Optional[str]) -> tuple[str, str]:
    raw_sort = (sort_by or "default").strip().lower()
    raw_order = sort_order.strip().lower() if sort_order else None

    if raw_order is not None and raw_order not in {"asc", "desc"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Thứ tự sắp xếp '{sort_order}' không hợp lệ (chỉ hỗ trợ 'asc' hoặc 'desc').",
        )

    compound_map = {
        "default": ("default", "asc"),
        "price_asc": ("price", "asc"),
        "price-asc": ("price", "asc"),
        "price_desc": ("price", "desc"),
        "price-desc": ("price", "desc"),
        "rating_asc": ("rating", "asc"),
        "rating-asc": ("rating", "asc"),
        "rating_desc": ("rating", "desc"),
        "rating-desc": ("rating", "desc"),
        "distance_asc": ("distance", "asc"),
        "distance-asc": ("distance", "asc"),
        "distance_desc": ("distance", "desc"),
        "distance-desc": ("distance", "desc"),
    }
    if raw_sort in compound_map:
        field, default_order = compound_map[raw_sort]
        return field, (raw_order if raw_order and field != "default" else default_order)

    bare_defaults = {
        "price": "asc",
        "rating": "desc",
        "distance": "asc",
    }
    if raw_sort in bare_defaults:
        return raw_sort, (raw_order or bare_defaults[raw_sort])

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Tiêu chí sắp xếp '{sort_by}' không hợp lệ.",
    )


def _strip_tz(dt: Optional[datetime]) -> Optional[datetime]:
    return dt.replace(tzinfo=None) if dt is not None else None


def _pick_daily_price(price_rows: list[PriceTable], now_naive: datetime) -> Optional[float]:
    if not price_rows:
        return None

    def _is_active(row: PriceTable) -> bool:
        eff_from = _strip_tz(row.effective_from)
        eff_to = _strip_tz(row.effective_to)
        return (eff_from is None or eff_from <= now_naive) and (eff_to is None or eff_to >= now_naive)

    def _is_daily(row: PriceTable) -> bool:
        return row.price_type is None or row.price_type.strip().upper() in DAILY_PRICE_TYPES

    def _sort_key(row: PriceTable) -> tuple[datetime, int]:
        eff_from = _strip_tz(row.effective_from) or datetime.min
        return (eff_from, int(row.price_id or 0))

    candidates = (
        [r for r in price_rows if _is_active(r) and _is_daily(r)]
        or [r for r in price_rows if _is_active(r)]
        or [r for r in price_rows if _is_daily(r)]
        or list(price_rows)
    )
    chosen = max(candidates, key=_sort_key)
    return float(chosen.amount) if chosen.amount is not None else None


def _validate_search_inputs(
    min_price: Optional[float],
    max_price: Optional[float],
    min_rating: Optional[float],
    user_lat: Optional[float],
    user_lng: Optional[float],
    max_distance_km: Optional[float],
    sort_field: str,
    start_time: Optional[datetime],
    end_time: Optional[datetime],
) -> None:
    if min_price is not None and min_price < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Giá tối thiểu không được âm.")
    if max_price is not None and max_price < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Giá tối đa không được âm.")
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giá tối thiểu không được lớn hơn giá tối đa.",
        )
    if min_rating is not None and (min_rating < 0 or min_rating > 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Điểm đánh giá tối thiểu phải nằm trong khoảng 0 đến 5.",
        )
    if (user_lat is None) != (user_lng is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp đầy đủ cả vĩ độ (user_lat) và kinh độ (user_lng).",
        )
    if user_lat is not None and (user_lat < -90 or user_lat > 90):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vĩ độ không hợp lệ.")
    if user_lng is not None and (user_lng < -180 or user_lng > 180):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kinh độ không hợp lệ.")
    if max_distance_km is not None:
        if max_distance_km < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Khoảng cách tối đa không được âm.")
        if user_lat is None or user_lng is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cần cung cấp tọa độ người dùng để lọc theo khoảng cách.",
            )
    if sort_field == "distance" and (user_lat is None or user_lng is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cần cung cấp tọa độ người dùng (user_lat, user_lng) để sắp xếp theo khoảng cách.",
        )
    if start_time is not None and end_time is not None:
        if _strip_tz(start_time) >= _strip_tz(end_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian nhận xe phải nhỏ hơn thời gian trả xe.",
            )


def search_and_sort_vehicles(
    db: Session,
    vehicle_type: Optional[Sequence[str] | str] = None,
    brand: Optional[Sequence[str] | str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    delivery_method: Optional[Sequence[str] | str] = None,
    min_rating: Optional[float] = None,
    city: Optional[str] = None,
    city_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_distance_km: Optional[float] = None,
    sort_by: Optional[str] = "default",
    sort_order: Optional[str] = None,
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
) -> list[VehicleSearchItem]:
    """
    Tìm kiếm, lọc và sắp xếp phương tiện:
    - Lọc theo: loại xe, giá/ngày, hãng, hình thức giao nhận, điểm đánh giá tối thiểu, thành phố, khoảng cách, lịch trống.
    - Sắp xếp theo: mặc định, giá, điểm đánh giá, khoảng cách.
    """
    _ = user_id  # Tài khoản chưa duyệt hoặc chưa nộp GPLX vẫn được phép tìm kiếm xe bình thường.
    sort_field, normalized_order = _normalize_sort(sort_by, sort_order)
    _validate_search_inputs(
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        user_lat=user_lat,
        user_lng=user_lng,
        max_distance_km=max_distance_km,
        sort_field=sort_field,
        start_time=start_time,
        end_time=end_time,
    )

    raw_types = _split_multi_values(vehicle_type)
    expanded_types = _expand_vehicle_types(raw_types) if raw_types else set()
    brands = _split_multi_values(brand)
    raw_deliveries = _split_multi_values(delivery_method)
    normalized_deliveries = _normalize_delivery_methods(raw_deliveries) if raw_deliveries else set()

    query = (
        db.query(Vehicle)
        .outerjoin(Store, Vehicle.store_id == Store.store_id)
        .outerjoin(City, Store.city_id == City.city_id)
        .options(
            joinedload(Vehicle.store).joinedload(Store.city),
            joinedload(Vehicle.price_tables),
            joinedload(Vehicle.images),
        )
    )

    if status_filter is None or status_filter.strip().lower() in {"available", "sẵn sàng"}:
        query = query.filter(Vehicle.status.in_(["Sẵn sàng", "Available"]))
    elif status_filter.strip().lower() == "all":
        query = query.filter(Vehicle.status != "Đã xóa")
    else:
        query = query.filter(Vehicle.status == status_filter)

    if expanded_types:
        query = query.filter(Vehicle.type.in_(expanded_types))
    if brands:
        query = query.filter(or_(*[Vehicle.brand.ilike(f"%{b}%") for b in brands]))
    if city_id is not None:
        query = query.filter(Store.city_id == city_id)
    if city and city.strip():
        city_term = f"%{city.strip()}%"
        query = query.filter(or_(City.city_name.ilike(city_term), Store.address.ilike(city_term)))

    if start_time is not None and end_time is not None:
        start_naive = _strip_tz(start_time)
        end_naive = _strip_tz(end_time)
        busy_vehicle_ids = (
            db.query(Order.vehicle_id)
            .filter(
                Order.vehicle_id.isnot(None),
                or_(Order.order_status.is_(None), ~Order.order_status.in_(INACTIVE_ORDER_STATUSES)),
                Order.start_time < end_naive,
                Order.end_time > start_naive,
            )
            .distinct()
        )
        query = query.filter(~Vehicle.vehicle_id.in_(busy_vehicle_ids))

    vehicles = query.order_by(Vehicle.vehicle_id.asc()).all()
    if not vehicles:
        return []

    vehicle_ids = [v.vehicle_id for v in vehicles]
    rating_rows = (
        db.query(
            Order.vehicle_id,
            func.avg(Review.rating),
            func.count(Review.review_id),
        )
        .join(Review, Review.order_id == Order.order_id)
        .filter(Order.vehicle_id.in_(vehicle_ids))
        .group_by(Order.vehicle_id)
        .all()
    )
    rating_map = {
        row[0]: (round(float(row[1]), 2) if row[1] is not None else 0.0, int(row[2] or 0))
        for row in rating_rows
    }

    delivery_cfg = get_delivery_config(db)
    global_pickup = bool(delivery_cfg.get("allow_store_pickup", True))
    global_home = bool(delivery_cfg.get("allow_home_delivery", True))
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)

    items: list[VehicleSearchItem] = []
    for vehicle in vehicles:
        store = vehicle.store
        store_pickup = True if store is None or store.allow_store_pickup is None else bool(store.allow_store_pickup)
        store_home = True if store is None or store.allow_home_delivery is None else bool(store.allow_home_delivery)

        supported_deliveries: list[str] = []
        if global_pickup and store_pickup:
            supported_deliveries.append(DeliveryMethodEnum.STORE_PICKUP.value)
        if global_home and store_home:
            supported_deliveries.append(DeliveryMethodEnum.HOME_DELIVERY.value)

        price_per_day = _pick_daily_price(list(vehicle.price_tables or []), now_naive)
        avg_rating, review_count = rating_map.get(vehicle.vehicle_id, (0.0, 0))

        distance_km: Optional[float] = None
        store_lat = store.latitude if store else None
        store_lng = store.longitude if store else None
        if user_lat is not None and user_lng is not None and store_lat is not None and store_lng is not None:
            distance_km = haversine_km(user_lat, user_lng, store_lat, store_lng)

        if min_price is not None and (price_per_day is None or price_per_day < min_price):
            continue
        if max_price is not None and (price_per_day is None or price_per_day > max_price):
            continue
        if normalized_deliveries and not any(m in supported_deliveries for m in normalized_deliveries):
            continue
        if min_rating is not None and avg_rating < min_rating:
            continue
        if max_distance_km is not None and (distance_km is None or distance_km > max_distance_km):
            continue

        sorted_images = sorted(vehicle.images or [], key=lambda img: int(img.image_id or 0))
        first_image = sorted_images[0].img_url if sorted_images else None

        items.append(
            VehicleSearchItem(
                vehicle_id=vehicle.vehicle_id,
                store_id=vehicle.store_id,
                brand=vehicle.brand,
                model=vehicle.model,
                license_plate=vehicle.license_plate,
                manufacture_year=vehicle.manufacture_year,
                engine_capacity=vehicle.engine_capacity,
                description=vehicle.description,
                type=vehicle.type,
                status=vehicle.status,
                price_per_day=price_per_day,
                rating=avg_rating,
                review_count=review_count,
                delivery_methods=supported_deliveries,
                store_name=store.store_name if store else None,
                store_address=store.address if store else None,
                city_name=store.city.city_name if (store and store.city) else None,
                store_latitude=store_lat,
                store_longitude=store_lng,
                distance_km=distance_km,
                image_url=first_image,
            )
        )

    if sort_field == "price":
        sign = 1 if normalized_order == "asc" else -1
        items.sort(
            key=lambda x: (
                x.price_per_day is None,
                sign * (x.price_per_day if x.price_per_day is not None else 0.0),
                x.vehicle_id,
            )
        )
    elif sort_field == "rating":
        if normalized_order == "desc":
            items.sort(key=lambda x: (-x.rating, -x.review_count, x.vehicle_id))
        else:
            items.sort(key=lambda x: (x.rating, x.review_count, x.vehicle_id))
    elif sort_field == "distance":
        sign = 1 if normalized_order == "asc" else -1
        items.sort(
            key=lambda x: (
                x.distance_km is None,
                sign * (x.distance_km if x.distance_km is not None else 0.0),
                x.vehicle_id,
            )
        )
    else:
        items.sort(key=lambda x: x.vehicle_id)

    return items
