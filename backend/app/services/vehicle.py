from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.vehicle import Vehicle
from app.models.store import Store
from app.models.image import Image
from app.models.user import User

def get_owner_store(db: Session, user_id: int):
    store = db.query(Store).filter(Store.owner_id == user_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn không phải chủ của cửa hàng"
        )
    return store

def check_vehicle(db: Session, vehicle_id: int, store_id: int):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id,Vehicle.store_id == store_id).first()
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
        type=data.type,
        engine_capacity=data.engine_capacity,
        description=data.description,
        status="Sẵn sàng"
    )
    try:
        db.add(vehicle)
        db.flush()
        return vehicle
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Biển số xe đã tồn tại"
        )


def update_vehicle(db: Session,user_id: int,vehicle_id: int,data):
    store = get_owner_store(db, user_id)
    vehicle = check_vehicle(db, vehicle_id, store.store_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)
    try: 
        db.commit()
        db.refresh(vehicle)
        return vehicle
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
    return db.query(Vehicle).filter(Vehicle.store_id == store.store_id,Vehicle.status != "Đã xóa").all()


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

    return vehicle