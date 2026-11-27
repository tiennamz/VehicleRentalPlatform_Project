from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.schemas.delivery_schemas import (
    DeliveryConfigSchema,
    DeliveryFeeCalculateRequestSchema,
)
from app.services.delivery_services import (
    get_delivery_config,
    update_delivery_config,
    calculate_and_validate_delivery_fee,
)
from app.utils.response import create_response
from dependencies.middleware import check_admin

router = APIRouter(tags=["Delivery Configuration & Fee Calculation"])


@router.get("/delivery-config", status_code=status.HTTP_200_OK)
def get_delivery_config_endpoint(
    request: Request,
    db: Session = Depends(get_db),
):
    cfg = get_delivery_config(db)
    data = {
        "allow_store_pickup": cfg["allow_store_pickup"],
        "allow_home_delivery": cfg["allow_home_delivery"],
        "max_delivery_radius_km": float(cfg["max_delivery_radius_km"]),
        "delivery_base_fee": float(cfg["delivery_base_fee"]),
        "delivery_fee_per_km": float(cfg["delivery_fee_per_km"]),
    }
    return create_response(request, status.HTTP_200_OK, "Lấy cấu hình giao nhận thành công", data)


@router.put("/admin/delivery-config", status_code=status.HTTP_200_OK)
def update_delivery_config_endpoint(
    request: Request,
    config_data: DeliveryConfigSchema,
    current_user: User = Depends(check_admin),
    db: Session = Depends(get_db),
):
    cfg = update_delivery_config(db, config_data)
    data = {
        "allow_store_pickup": cfg["allow_store_pickup"],
        "allow_home_delivery": cfg["allow_home_delivery"],
        "max_delivery_radius_km": float(cfg["max_delivery_radius_km"]),
        "delivery_base_fee": float(cfg["delivery_base_fee"]),
        "delivery_fee_per_km": float(cfg["delivery_fee_per_km"]),
    }
    return create_response(request, status.HTTP_200_OK, "Cập nhật cấu hình giao nhận thành công", data)


@router.post("/delivery-config/calculate-fee", status_code=status.HTTP_200_OK)
def calculate_delivery_fee_endpoint(
    request: Request,
    calc_req: DeliveryFeeCalculateRequestSchema,
    db: Session = Depends(get_db),
):
    res = calculate_and_validate_delivery_fee(
        db=db,
        delivery_method=calc_req.delivery_method,
        delivery_distance_km=calc_req.delivery_distance_km,
        delivery_address=calc_req.delivery_address,
    )
    data = {
        "delivery_method": res["delivery_method"],
        "delivery_address": res["delivery_address"],
        "delivery_distance_km": float(res["delivery_distance_km"]),
        "delivery_fee": float(res["delivery_fee"]),
        "max_delivery_radius_km": float(res["max_delivery_radius_km"]),
    }
    return create_response(request, status.HTTP_200_OK, "Tính phí giao nhận xe thành công", data)
