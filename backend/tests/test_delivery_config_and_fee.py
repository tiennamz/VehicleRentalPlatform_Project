import pytest
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from pydantic import ValidationError
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db
from app.models.user import User
from app.models.drivers_license import DriverLicense
from app.models.vehicle import Vehicle
from app.models.price_table import PriceTable
from app.models.order import Order
from app.models.system_config import SystemConfig

from app.schemas.delivery_schemas import (
    DeliveryMethodEnum,
    DeliveryConfigSchema,
    DeliveryFeeCalculateRequestSchema,
)
from app.schemas.booking_eligibility_schemas import OrderCreateSchema
from app.services.delivery_services import (
    get_delivery_config,
    update_delivery_config,
    calculate_and_validate_delivery_fee,
)
from app.services.booking_eligibility_services import create_rental_order


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# =========================================================
# 1. UNIT TESTS: VALIDATE CẤU HÌNH GIAO NHẬN (SCHEMAS)
# =========================================================

def test_delivery_config_schema_disabling_both_methods_fails():
    with pytest.raises(ValidationError) as exc_info:
        DeliveryConfigSchema(
            allow_store_pickup=False,
            allow_home_delivery=False,
            max_delivery_radius_km=Decimal("10.00"),
            delivery_base_fee=Decimal("20000.00"),
            delivery_fee_per_km=Decimal("10000.00"),
        )
    assert "phương thức" in str(exc_info.value).lower()


def test_delivery_config_schema_negative_radius_or_fee_fails():
    with pytest.raises(ValidationError):
        DeliveryConfigSchema(
            allow_store_pickup=True,
            allow_home_delivery=True,
            max_delivery_radius_km=Decimal("-5.00"),
            delivery_base_fee=Decimal("20000.00"),
            delivery_fee_per_km=Decimal("10000.00"),
        )
    with pytest.raises(ValidationError):
        DeliveryConfigSchema(
            allow_store_pickup=True,
            allow_home_delivery=True,
            max_delivery_radius_km=Decimal("15.00"),
            delivery_base_fee=Decimal("-1000.00"),
            delivery_fee_per_km=Decimal("10000.00"),
        )


# =========================================================
# 2. SERVICE TESTS: CẤU HÌNH, BÁN KÍNH & TÍNH PHÍ GIAO XE
# =========================================================

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    user = User(
        user_id=1,
        fullname="Nguyễn Văn Thuê",
        email="renter@example.com",
        phone_number="0905555555",
        date_of_birth=date(1999, 6, 15),
        address="Đà Nẵng",
    )
    lic = DriverLicense(
        drivers_license_id=1,
        user_id=1,
        license_number="GPLX-DELIVERY-01",
        license_class="A1",
        issue_date=utc_now() - timedelta(days=365),
        expiry_date=utc_now() + timedelta(days=3650),
        verification_status="Đã xác thực",
    )
    veh = Vehicle(
        vehicle_id=1,
        brand="Honda Vision",
        license_plate="43C1-55555",
        type="Xe tay ga",
        status="Available",
    )
    price = PriceTable(
        price_id=1,
        vehicle_id=1,
        amount=Decimal("150000.00"),
        price_type="DAILY",
    )
    session.add_all([user, lic, veh, price])
    session.commit()

    yield session
    session.close()


def test_get_and_update_delivery_config(db_session):
    # Mặc định ban đầu: bán kính 15km, base_fee 30,000, fee_per_km 10,000
    default_cfg = get_delivery_config(db_session)
    assert default_cfg["allow_store_pickup"] is True
    assert default_cfg["allow_home_delivery"] is True
    assert default_cfg["max_delivery_radius_km"] == Decimal("15.00")
    assert default_cfg["delivery_base_fee"] == Decimal("30000.00")
    assert default_cfg["delivery_fee_per_km"] == Decimal("10000.00")

    # Cập nhật cấu hình mới: bán kính 20km, base_fee 20,000, fee_per_km 12,000
    new_cfg = DeliveryConfigSchema(
        allow_store_pickup=True,
        allow_home_delivery=True,
        max_delivery_radius_km=Decimal("20.00"),
        delivery_base_fee=Decimal("20000.00"),
        delivery_fee_per_km=Decimal("12000.00"),
    )
    updated = update_delivery_config(db_session, new_cfg)
    assert updated["max_delivery_radius_km"] == Decimal("20.00")
    assert updated["delivery_base_fee"] == Decimal("20000.00")
    assert updated["delivery_fee_per_km"] == Decimal("12000.00")


def test_calculate_fee_store_pickup_is_free(db_session):
    res = calculate_and_validate_delivery_fee(
        db_session,
        delivery_method="Nhận tại cửa hàng",
    )
    assert res["delivery_method"] == "Nhận tại cửa hàng"
    assert res["delivery_fee"] == Decimal("0.00")
    assert res["delivery_distance_km"] == Decimal("0.00")


def test_calculate_fee_home_delivery_within_and_at_boundary_radius(db_session):
    # Khoảng cách 5km (trong bán kính 15km): 30,000 + 5 * 10,000 = 80,000
    res_5km = calculate_and_validate_delivery_fee(
        db_session,
        delivery_method="Giao tận nơi",
        delivery_distance_km=Decimal("5.00"),
        delivery_address="100 Bạch Đằng, Hải Châu, Đà Nẵng",
    )
    assert res_5km["delivery_fee"] == Decimal("80000.00")

    # Đúng bằng biên bán kính quy định 15.0km: 30,000 + 15 * 10,000 = 180,000
    res_15km = calculate_and_validate_delivery_fee(
        db_session,
        delivery_method="Giao tận nơi",
        delivery_distance_km=Decimal("15.00"),
        delivery_address="Bán đảo Sơn Trà, Đà Nẵng",
    )
    assert res_15km["delivery_fee"] == Decimal("180000.00")


def test_calculate_fee_home_delivery_exceeds_radius_raises_400(db_session):
    with pytest.raises(HTTPException) as exc_info:
        calculate_and_validate_delivery_fee(
            db_session,
            delivery_method="Giao tận nơi",
            delivery_distance_km=Decimal("15.50"),
            delivery_address="Hội An, Quảng Nam",
        )
    assert exc_info.value.status_code == 400
    assert "bán kính quy định" in exc_info.value.detail.lower()


def test_calculate_fee_home_delivery_missing_address_or_zero_distance_raises_400(db_session):
    with pytest.raises(HTTPException) as exc_info:
        calculate_and_validate_delivery_fee(
            db_session,
            delivery_method="Giao tận nơi",
            delivery_distance_km=Decimal("5.00"),
            delivery_address="   ",
        )
    assert exc_info.value.status_code == 400
    assert "địa chỉ" in exc_info.value.detail.lower()

    with pytest.raises(HTTPException) as exc_info2:
        calculate_and_validate_delivery_fee(
            db_session,
            delivery_method="Giao tận nơi",
            delivery_distance_km=Decimal("0.00"),
            delivery_address="100 Bạch Đằng, Đà Nẵng",
        )
    assert exc_info2.value.status_code == 400


def test_calculate_fee_when_home_delivery_disabled_raises_400(db_session):
    update_delivery_config(
        db_session,
        DeliveryConfigSchema(
            allow_store_pickup=True,
            allow_home_delivery=False,
            max_delivery_radius_km=Decimal("15.00"),
            delivery_base_fee=Decimal("30000.00"),
            delivery_fee_per_km=Decimal("10000.00"),
        ),
    )
    with pytest.raises(HTTPException) as exc_info:
        calculate_and_validate_delivery_fee(
            db_session,
            delivery_method="Giao tận nơi",
            delivery_distance_km=Decimal("3.00"),
            delivery_address="100 Bạch Đằng, Đà Nẵng",
        )
    assert exc_info.value.status_code == 400
    assert "không hỗ trợ giao xe tận nơi" in exc_info.value.detail.lower()


def test_create_order_with_home_delivery_adds_fee_to_total_amount(db_session):
    base_time = utc_now()
    # Thuê 2 ngày (2 * 150,000 = 300,000) + Giao tận nơi 8km (30,000 + 8 * 10,000 = 110,000) => Tổng 410,000
    order_req = OrderCreateSchema(
        renter_id=1,
        vehicle_id=1,
        price_id=1,
        start_time=base_time + timedelta(days=1),
        end_time=base_time + timedelta(days=3),
        delivery_method="Giao tận nơi",
        delivery_address="254 Nguyễn Văn Linh, Đà Nẵng",
        delivery_distance_km=Decimal("8.00"),
    )
    order = create_rental_order(db_session, order_req)
    assert order.delivery_method == "Giao tận nơi"
    assert order.delivery_address == "254 Nguyễn Văn Linh, Đà Nẵng"
    assert Decimal(str(order.delivery_distance_km)) == Decimal("8.00")
    assert Decimal(str(order.delivery_fee)) == Decimal("110000.00")
    assert Decimal(str(order.total_amount)) == Decimal("410000.00")


def test_create_order_with_home_delivery_exceeding_radius_is_blocked(db_session):
    base_time = utc_now()
    order_req = OrderCreateSchema(
        renter_id=1,
        vehicle_id=1,
        price_id=1,
        start_time=base_time + timedelta(days=1),
        end_time=base_time + timedelta(days=3),
        delivery_method="Giao tận nơi",
        delivery_address="Lăng Cô, Huế",
        delivery_distance_km=Decimal("35.00"),
    )
    with pytest.raises(HTTPException) as exc_info:
        create_rental_order(db_session, order_req)
    assert exc_info.value.status_code == 400
    assert "bán kính quy định" in exc_info.value.detail.lower()


# =========================================================
# 3. API INTEGRATION TESTS VỚI FASTAPI TESTCLIENT
# =========================================================

test_delivery_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
DeliveryTestingSessionLocal = sessionmaker(bind=test_delivery_engine, autoflush=False, expire_on_commit=False)


def override_get_db():
    db = DeliveryTestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def api_client():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_delivery_engine)
    db = DeliveryTestingSessionLocal()

    user = User(
        user_id=1,
        fullname="Khách Đặt Giao Tận Nơi",
        email="delivery@example.com",
        phone_number="0977777777",
        date_of_birth=date(1997, 4, 12),
        address="Đà Nẵng",
    )
    lic = DriverLicense(
        drivers_license_id=1,
        user_id=1,
        license_number="GPLX-DEL-99",
        license_class="A1",
        issue_date=utc_now() - timedelta(days=300),
        expiry_date=utc_now() + timedelta(days=3000),
        verification_status="Đã xác thực",
    )
    veh = Vehicle(
        vehicle_id=10,
        brand="Honda SH Mode",
        license_plate="43D1-77777",
        type="Xe tay ga",
        status="Available",
    )
    price = PriceTable(
        price_id=1,
        vehicle_id=10,
        amount=Decimal("200000.00"),
        price_type="DAILY",
    )
    db.add_all([user, lic, veh, price])
    db.commit()
    db.close()

    with TestClient(app) as c:
        yield c

    Base.metadata.drop_all(bind=test_delivery_engine)
    app.dependency_overrides.clear()


def test_api_update_and_get_delivery_config(api_client):
    from app.core.security import create_access_token

    admin_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': 'delivery@example.com', 'email': 'delivery@example.com', 'user_id': 1, 'role_id': [1]})}"
    }
    res_put = api_client.put(
        "/admin/delivery-config",
        headers=admin_headers,
        json={
            "allow_store_pickup": True,
            "allow_home_delivery": True,
            "max_delivery_radius_km": 12.0,
            "delivery_base_fee": 25000,
            "delivery_fee_per_km": 8000,
        },
    )
    assert res_put.status_code == 200
    assert float(res_put.json()["data"]["max_delivery_radius_km"]) == 12.0

    res_get = api_client.get("/delivery-config")
    assert res_get.status_code == 200
    assert float(res_get.json()["data"]["delivery_fee_per_km"]) == 8000.0


def test_api_calculate_delivery_fee_and_create_order(api_client):
    from app.core.security import create_access_token

    cust_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': 'delivery@example.com', 'email': 'delivery@example.com', 'user_id': 1, 'role_id': [2]})}"
    }
    # 1. Tính thử phí giao xe tận nơi 6km (30,000 + 6 * 10,000 = 90,000)
    res_calc = api_client.post(
        "/delivery-config/calculate-fee",
        json={
            "delivery_method": "Giao tận nơi",
            "delivery_distance_km": 6.0,
            "delivery_address": "Sân bay Quốc tế Đà Nẵng",
        },
    )
    assert res_calc.status_code == 200
    assert float(res_calc.json()["data"]["delivery_fee"]) == 90000.0

    # 2. Tạo đơn đặt xe 2 ngày (2 * 200,000 = 400,000) + giao tận nơi 6km (90,000) => 490,000
    base_time = utc_now()
    res_order = api_client.post(
        "/orders",
        headers=cust_headers,
        json={
            "renter_id": 1,
            "vehicle_id": 10,
            "price_id": 1,
            "start_time": (base_time + timedelta(days=1)).isoformat(),
            "end_time": (base_time + timedelta(days=3)).isoformat(),
            "delivery_method": "Giao tận nơi",
            "delivery_address": "Sân bay Quốc tế Đà Nẵng",
            "delivery_distance_km": 6.0,
        },
    )
    assert res_order.status_code == 201
    order_data = res_order.json()["data"]
    assert order_data["delivery_method"] == "Giao tận nơi"
    assert float(order_data["delivery_fee"]) == 90000.0
    assert float(order_data["total_amount"]) == 490000.0
