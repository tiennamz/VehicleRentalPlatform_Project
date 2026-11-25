from typing import Optional
from pydantic import BaseModel, ConfigDict


class VehicleSearchItem(BaseModel):
    vehicle_id: int
    store_id: Optional[int] = None
    brand: str
    model: Optional[str] = None
    license_plate: str
    manufacture_year: Optional[int] = None
    engine_capacity: Optional[int] = None
    description: Optional[str] = None
    type: str
    status: Optional[str] = None
    price_per_day: Optional[float] = None
    rating: float = 0.0
    review_count: int = 0
    delivery_methods: list[str] = []
    store_name: Optional[str] = None
    store_address: Optional[str] = None
    city_name: Optional[str] = None
    store_latitude: Optional[float] = None
    store_longitude: Optional[float] = None
    distance_km: Optional[float] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
