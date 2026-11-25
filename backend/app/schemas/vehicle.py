
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List


class VehicleCreate(BaseModel):
    brand: str = Field(..., min_length=1, max_length=255)
    model: str = Field(..., min_length=1, max_length=255)
    license_plate: str = Field(..., min_length=1, max_length=255)
    manufacture_year: int = Field(..., ge=1900, le=2100)
    type: str
    engine_capacity: int = Field(..., gt=0)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    status: Optional[str] = "Sẵn sàng"


class VehicleUpdate(BaseModel):
    brand: Optional[str] = Field(None, min_length=1, max_length=255)
    model: Optional[str] = Field(None, min_length=1, max_length=255)
    license_plate: Optional[str] = Field(None, min_length=1, max_length=255)
    manufacture_year: Optional[int] = Field(None, ge=1900, le=2100)
    type: Optional[str] = None
    engine_capacity: Optional[int] = Field(None, gt=0)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    status: Optional[str] = None


class VehicleResponse(BaseModel):
    vehicle_id: int
    store_id: int
    brand: str
    model: Optional[str] = None
    license_plate: str
    manufacture_year: Optional[int] = None
    type: str
    engine_capacity: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None
    price: Optional[float] = None
    images: List[str] = []
    model_config = ConfigDict(from_attributes=True)
