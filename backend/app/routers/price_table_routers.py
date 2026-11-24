from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.models.price_table import PriceTable
from app.models.user import User

from app.database.database import get_db

from app.services.price_table_services import calculate_price_service, update_price_service

from app.utils.response import create_response

from dependencies.middleware import check_store_owner

router = APIRouter(tags=['Price of vehicle'], prefix='price')

@router.patch('/{vehicle_id}')
def update_price(request: Request, vehicle_id: int, price: int, user: User = Depends(check_store_owner), db: Session = Depends(get_db)):
    price_table = update_price_service(vehicle_id, price, db)

    return create_response(
        request,
        status.HTTP_200_OK,
        "Success",
        price_table
    )

@router.get("/{vehicle_id}/calculate")
def calculate_price(request: Request, num_of_days: int, vehicle_id: int, user: User = Depends(check_store_owner), db: Session = Depends(get_db)):
    total_price = calculate_price_service(num_of_days, vehicle_id, db)

    return create_response(
        request,
        status.HTTP_200_OK,
        "Success",
        total_price
    )