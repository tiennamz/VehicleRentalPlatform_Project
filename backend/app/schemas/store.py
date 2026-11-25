from pydantic import BaseModel, ConfigDict, Field

class StoreCreate(BaseModel):
    store_name: str = Field(..., min_length=1, max_length=255)
    address: str = Field(..., min_length=1, max_length=255)
    contact: str = Field(..., min_length=1, max_length=255)
    bank_account_number: str = Field(..., min_length=1, max_length=50)
    bank_name: str = Field(..., min_length=1, max_length=100)
    account_holder: str = Field(..., min_length=1, max_length=150)

class StoreResponse(BaseModel):
    store_id: int
    owner_id: int
    store_name: str
    address: str
    contact: str
    status: str | None = None
    business_license: str | None = None
    bank_account_number: str | None = None
    bank_name: str | None = None
    account_holder: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    allow_store_pickup: bool = True
    allow_home_delivery: bool = True
    model_config = ConfigDict(from_attributes=True)

class PublicStoreResponse(BaseModel):
    store_id: int
    store_name: str
    address: str
    contact: str
    latitude: float | None = None
    longitude: float | None = None
    allow_store_pickup: bool = True
    allow_home_delivery: bool = True
    model_config = ConfigDict(from_attributes=True)