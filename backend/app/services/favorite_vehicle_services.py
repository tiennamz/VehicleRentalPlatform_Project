from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.models.favorite_vehicle import FavoriteVehicle
from app.models.vehicle import Vehicle
from app.services.vehicle import serialize_vehicle


def add_favorite_vehicle(db: Session, user_id: int, vehicle_id: int):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy xe"
        )
    favorite = db.query(FavoriteVehicle).filter(FavoriteVehicle.user_id == user_id,FavoriteVehicle.vehicle_id == vehicle_id).first()
    if favorite:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Xe đã có trong danh sách yêu thích"
        )
    favorite = FavoriteVehicle(
        user_id=user_id,
        vehicle_id=vehicle_id,
        created_at=datetime.now()
    )
    try:
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể thêm xe vào danh sách yêu thích"
        )
    return {
        "message": "Thêm xe vào danh sách yêu thích thành công",
        "favorite_id": favorite.favorite_id,
        "vehicle_id": favorite.vehicle_id
    }

def remove_favorite_vehicle(db: Session, user_id: int, vehicle_id: int):
    favorite = db.query(FavoriteVehicle).filter(FavoriteVehicle.user_id == user_id,FavoriteVehicle.vehicle_id == vehicle_id).first()
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy xe yêu thích"
        )
    try:
        db.delete(favorite)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể xóa xe yêu thích"
        )
    return {
        "message": "Xóa xe khỏi danh mục yêu thích thành công",
        "vehicle_id": vehicle_id
    }

def get_favorite_vehicles(db: Session, user_id: int):
    favorites = (
        db.query(FavoriteVehicle)
        .options(
            joinedload(FavoriteVehicle.vehicle).joinedload(Vehicle.images),
            joinedload(FavoriteVehicle.vehicle).joinedload(Vehicle.price_tables)
        )
        .filter(FavoriteVehicle.user_id == user_id)
        .order_by(FavoriteVehicle.created_at.desc())
        .all()
    )
    result = []
    for favorite in favorites:
        vehicle_data = serialize_vehicle(favorite.vehicle)
        result.append({
            "favorite_id": favorite.favorite_id,
            "created_at": favorite.created_at,
            "vehicle": vehicle_data
        })
    return {
        "total": len(result),
        "favorites": result
    }