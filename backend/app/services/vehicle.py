from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.vehicle import Vehicle
from app.models.store import Store
from app.models.image import Image
from app.models.price_table import PriceTable
from app.models.user import User
from app.models.user_role import UserRole
from sqlalchemy import func
from app.models.review import Review
from app.models.city import City
from app.models.order import Order

VEHICLE_TYPE_MAP = {
    "xe tay ga": "Xe tay ga",
    "xe số": "Xe số",
    "xe côn tay": "Xe số",
    "xe điện": "Xe điện",
    "xe máy điện": "Xe điện",
    "ô tô 4 chỗ": "Ô tô 4 chỗ",
    "ô tô 7 chỗ": "Ô tô 7 chỗ",
    "ô tô 16 chỗ": "Ô tô 16 chỗ",
}

VEHICLE_STATUS_MAP = {
    "available": "Sẵn sàng",
    "sẵn sàng": "Sẵn sàng",
    "sẵn sàng thuê": "Sẵn sàng",
    "rented": "Đang thuê",
    "đang thuê": "Đang thuê",
    "đang cho thuê": "Đang thuê",
    "maintenance": "Bảo trì",
    "bảo trì": "Bảo trì",
    "bảo dưỡng": "Bảo trì",
}


def normalize_vehicle_type(raw_type: str) -> str:
    key = (raw_type or "").strip().lower()
    return VEHICLE_TYPE_MAP.get(key, "Xe tay ga")


def normalize_vehicle_status(raw_status: str) -> str:
    key = (raw_status or "").strip().lower()
    return VEHICLE_STATUS_MAP.get(key, "Sẵn sàng")


def serialize_vehicle(vehicle: Vehicle) -> dict:
    hourly_price = None
    if getattr(vehicle, "price_tables", None):
        sorted_prices = sorted(
            vehicle.price_tables,
            key=lambda p: getattr(p, "price_id", 0) or 0,
            reverse=True,
        )
        for pt in sorted_prices:
            if pt.amount is not None:
                hourly_price = float(pt.amount)
                break

    image_urls = [
        img.img_url
        for img in (getattr(vehicle, "images", None) or [])
        if getattr(img, "img_url", None)
    ]

    return {
        "vehicle_id": vehicle.vehicle_id,
        "store_id": vehicle.store_id,
        "brand": vehicle.brand,
        "model": vehicle.model,
        "license_plate": vehicle.license_plate,
        "manufacture_year": vehicle.manufacture_year,
        "type": vehicle.type,
        "engine_capacity": vehicle.engine_capacity,
        "description": vehicle.description,
        "status": vehicle.status,
        "price": hourly_price,
        "images": image_urls,
    }


def get_owner_store(db: Session, user_id: int):
    store = db.query(Store).filter(Store.owner_id == user_id).first()
    if store:
        return store

    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        role_ids = {
            ur.role_id
            for ur in db.query(UserRole).filter(UserRole.user_id == user_id).all()
        }
        if role_ids.intersection({1, 3, 4}):
            store = Store(
                owner_id=user_id,
                store_name=f"Cửa hàng {user.fullname or 'VRP-GO'}",
                address=user.address or "Đà Nẵng",
                contact=user.phone_number or user.email or "0900000000",
                status="Đã duyệt",
                allow_store_pickup=True,
                allow_home_delivery=True,
            )
            db.add(store)
            db.flush()
            return store

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Bạn không phải chủ của cửa hàng"
    )


def check_vehicle(db: Session, vehicle_id: int, store_id: int):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id, Vehicle.store_id == store_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy xe"
        )
    return vehicle


def create_vehicle(db: Session, user_id: int, data):
    store = get_owner_store(db, user_id)
    vehicle = Vehicle(
        store_id=store.store_id,
        brand=data.brand,
        model=data.model,
        license_plate=data.license_plate,
        manufacture_year=data.manufacture_year,
        type=normalize_vehicle_type(data.type),
        engine_capacity=data.engine_capacity,
        description=data.description,
        status=normalize_vehicle_status(getattr(data, "status", "Sẵn sàng") or "Sẵn sàng"),
    )
    try:
        db.add(vehicle)
        db.flush()
        if getattr(data, "price", None) is not None:
            db.add(
                PriceTable(
                    vehicle_id=vehicle.vehicle_id,
                    effective_from=datetime.now(),
                    amount=data.price,
                    price_type="HOURLY",
                )
            )
            db.flush()
        return vehicle
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Biển số xe đã tồn tại"
        )


def update_vehicle(db: Session, user_id: int, vehicle_id: int, data):
    store = get_owner_store(db, user_id)
    vehicle = check_vehicle(db, vehicle_id, store.store_id)
    update_data = data.model_dump(exclude_unset=True)
    new_price = update_data.pop("price", None)
    if "type" in update_data and update_data["type"]:
        update_data["type"] = normalize_vehicle_type(update_data["type"])
    if "status" in update_data and update_data["status"]:
        update_data["status"] = normalize_vehicle_status(update_data["status"])

    for key, value in update_data.items():
        setattr(vehicle, key, value)

    if new_price is not None:
        pt = (
            db.query(PriceTable)
            .filter(PriceTable.vehicle_id == vehicle.vehicle_id)
            .order_by(PriceTable.price_id.desc())
            .first()
        )
        if pt:
            pt.amount = new_price
            pt.price_type = "HOURLY"
        else:
            db.add(
                PriceTable(
                    vehicle_id=vehicle.vehicle_id,
                    effective_from=datetime.now(),
                    amount=new_price,
                    price_type="HOURLY",
                )
            )

    try:
        db.commit()
        db.refresh(vehicle)
        return serialize_vehicle(vehicle)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Biển số xe đã tồn tại"
        )


def delete_vehicle(db: Session, user_id: int, vehicle_id: int):
    store = get_owner_store(db, user_id)
    vehicle = check_vehicle(db, vehicle_id, store.store_id)
    vehicle.status = "Đã xóa"
    db.commit()
    return {
        "message": "Xóa xe thành công"
    }


def get_vehicles(db: Session, user_id: int):
    store = get_owner_store(db, user_id)
    vehicles = (
        db.query(Vehicle)
        .options(joinedload(Vehicle.images), joinedload(Vehicle.price_tables))
        .filter(Vehicle.store_id == store.store_id, Vehicle.status != "Đã xóa")
        .order_by(Vehicle.vehicle_id.desc())
        .all()
    )
    return [serialize_vehicle(v) for v in vehicles]


# FR-08 API tạm ngưng cho thuê
def pause_vehicle_service(vehicle_id: int, db: Session):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy xe có id {vehicle_id}"
        )

    vehicle.status = "Bảo trì"
    db.commit()
    db.refresh(vehicle)

    return serialize_vehicle(vehicle)


def get_vehicle_detail(db: Session,vehicle_id: int,start_time: datetime = None,end_time: datetime = None):
    vehicle = (
        db.query(Vehicle)
        .options(
            joinedload(Vehicle.images),
            joinedload(Vehicle.price_tables),
            joinedload(Vehicle.store).joinedload(Store.city),
        )
        .filter(Vehicle.vehicle_id == vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy xe"
        )
    if vehicle.status in ("Đã xóa", "Bị từ chối"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Xe hiện không khả dụng"
        )
    now = datetime.now()
    valid_prices = [
        price for price in vehicle.price_tables
        if price.amount is not None
        and price.price_type == "HOURLY"
        and (price.effective_from is None or price.effective_from <= now)
        and (price.effective_to is None or price.effective_to >= now)
    ]
    valid_prices.sort(
        key=lambda price: price.effective_from or datetime.min,
        reverse=True
    )
    current_price = valid_prices[0] if valid_prices else None
    hourly_price = float(current_price.amount) if current_price else None
    pricing = {
        "price_type": "HOURLY",
        "price_per_hour": hourly_price,
        "start_time": start_time,
        "end_time": end_time,
        "rental_hours": None,
        "estimated_total": None
    }
    if start_time and end_time:
        if start_time <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian bắt đầu thuê phải ở tương lai"
            )
        if end_time <= start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Thời gian kết thúc phải sau thời gian bắt đầu"
            )
        if hourly_price is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Xe chưa có giá thuê theo giờ"
            )
        seconds = (end_time - start_time).total_seconds()
        rental_hours = seconds / 3600
        from math import ceil
        billed_hours = ceil(rental_hours)
        pricing["rental_hours"] = rental_hours
        pricing["billed_hours"] = billed_hours
        pricing["estimated_total"] = billed_hours * hourly_price
    store = vehicle.store
    store_data = None
    if store:
        store_data = {
            "store_id": store.store_id,
            "store_name": store.store_name,
            "address": store.address,
            "contact": store.contact,
            "city": store.city.city_name if store.city else None,
            "latitude": store.latitude,
            "longitude": store.longitude,
            "allow_store_pickup": store.allow_store_pickup,
            "allow_home_delivery": store.allow_home_delivery
        }
    review_rows = (
        db.query(Review)
        .join(Order, Review.order_id == Order.order_id)
        .options(
            joinedload(Review.reviewer),
            joinedload(Review.images)
        )
        .filter(Order.vehicle_id == vehicle_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    ratings = [review.rating for review in review_rows if review.rating is not None]
    average_rating = (
        sum(ratings) / len(ratings)
        if ratings else 0
    )
    review_data = []
    for review in review_rows:
        review_data.append({
            "review_id": review.review_id,
            "reviewer_name": (
                review.reviewer.fullname
                if review.reviewer else None
            ),
            "reviewer_avatar": (
                review.reviewer.avatar_url
                if review.reviewer else None
            ),
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "images": [
                image.img_url
                for image in review.images
                if image.img_url
            ]
        })
    cancellation_policy = {
        "before_24_hours": "Hoàn 100% tiền cọc",
        "from_6_to_24_hours": "Hoàn 50% tiền cọc",
        "under_6_hours": "Không hoàn tiền cọc",
        "unpaid_deposit": "Không hoàn tiền cọc"
    }
    return {
        "vehicle": serialize_vehicle(vehicle),
        "pricing": pricing,
        "store": store_data,
        "rating": {
            "average": round(average_rating, 2),
            "total_reviews": len(ratings)
        },
        "reviews": review_data,
        "cancellation_policy": cancellation_policy
    }