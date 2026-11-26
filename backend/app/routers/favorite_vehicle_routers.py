from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from dependencies.middleware import get_current_user
from app.models.user import User
from app.services.favorite_vehicle_services import (
    add_favorite_vehicle,
    remove_favorite_vehicle,
    get_favorite_vehicles
)

router = APIRouter(prefix="/favorites",tags=["Favorite Vehicles"])

@router.post("/{vehicle_id}")
def add_favorite(vehicle_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return add_favorite_vehicle(db,current_user.user_id,vehicle_id)

@router.delete("/{vehicle_id}")
def remove_favorite(vehicle_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return remove_favorite_vehicle(db,current_user.user_id,vehicle_id)

@router.get("")
def get_favorites(db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return get_favorite_vehicles(db,current_user.user_id)