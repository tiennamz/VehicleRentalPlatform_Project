from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.price_table import PriceTable



# API giá thuê 
def update_price_service(vehicle_id: int, price: int, db: Session):
    price_vehicle = db.query(PriceTable).filter(vehicle_id == PriceTable.vehicle_id).first()
    if not price_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy xe với id {vehicle_id}"
        )
    
    price_vehicle.amount = price
    db.commit()
    db.refresh(price_vehicle)

    return price_vehicle


# API tính tổng tiền

def calculate_price_service(num_of_days: int, vehicle_id: int, db: Session):
    vehicle = db.query(PriceTable).filter(vehicle_id == PriceTable.vehicle_id).first()
    if not price_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy xe với id {vehicle_id}"
        )

    total_price = num_of_days * vehicle.amount

    return {
        "num_of_days": num_of_days,
        "price": total_price
    }