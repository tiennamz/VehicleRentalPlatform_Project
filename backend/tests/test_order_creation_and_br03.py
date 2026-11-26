from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db
from app.models.drivers_license import DriverLicense
from app.models.order import Order
from app.models.price_table import PriceTable
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.booking_eligibility_schemas import OrderCalculateRequestSchema, OrderCreateSchema
from app.services.booking_eligibility_services import (
    calculate_deposit_br03,
    calculate_order_pricing,
    create_rental_order,
    get_order_by_id,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _seed(db):
    now = utc_now()
    user_moto = User(
        user_id=1,
        fullname="Nguyễn Văn Thuê",
        email="br03-moto@example.com",
        phone_number="0905111222",
        date_of_birth=date(1998, 5, 10),
        address="Đà Nẵng",
        status="Hoạt động",
    )
    user_car = User(
        user_id=2,
        fullname="Trần Thị Ô Tô",
        email="br03-car@example.com",
        phone_number="0905333444",
        date_of_birth=date(1995, 2, 20),
        address="Đà Nẵng",
        status="Hoạt động",
    )
    lic_moto = DriverLicense(
        drivers_license_id=1,
        user_id=1,
        license_number="GPLX-BR03-A1",
        license_class="A1",
        issue_date=now - timedelta(days=365),
        expiry_date=now + timedelta(days=3650),
        verification_status="Đã xác thực",
    )
    lic_car = DriverLicense(
        drivers_license_id=2,
        user_id=2,
        license_number="GPLX-BR03-B1",
        license_class="B1",
        issue_date=now - timedelta(days=365),
        expiry_date=now + timedelta(days=3650),
        verification_status="Đã xác thực",
    )
    moto = Vehicle(
        vehicle_id=1,
        brand="Honda",
        model="Vision 2024",
        license_plate="43A1-90001",
        type="Xe tay ga",
        status="Sẵn sàng",
    )
    car = Vehicle(
        vehicle_id=2,
        brand="Hyundai",
        model="Santafe 2024",
        license_plate="43A-90002",
        type="Ô tô 7 chỗ",
        status="Sẵn sàng",
    )
    p_moto = PriceTable(price_id=1, vehicle_id=1, amount=Decimal("150000.00"), price_type="DAILY")
    p_car = PriceTable(price_id=2, vehicle_id=2, amount=Decimal("1000000.00"), price_type="DAILY")
    db.add_all([user_moto, user_car, lic_moto, lic_car, moto, car, p_moto, p_car])
    db.commit()


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    _seed(db)
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def api_client():
    prev = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    _seed(db)
    db.close()

    with TestClient(app) as client:
        yield client

    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides = prev


# =========================================================
# 1. UNIT TESTS: BR-03 (30%, TỐI THIỂU 200K, TỐI ĐA 1 TRIỆU)
# =========================================================

def test_br03_deposit_tiers(db_session):
    # 1. Tổng tiền < 200k (150k) => cọc không vượt quá tổng tiền (150k), còn lại 0đ
    below_min = calculate_deposit_br03(db_session, Decimal("150000.00"))
    assert below_min["deposit_amount"] == Decimal("150000.00")
    assert below_min["remaining_amount"] == Decimal("0.00")

    # 2. 30% < 200k nhưng tổng >= 200k (330k * 30% = 99k) => áp dụng sàn 200k, còn lại 130k
    floor_case = calculate_deposit_br03(db_session, Decimal("330000.00"))
    assert floor_case["deposit_amount"] == Decimal("200000.00")
    assert floor_case["remaining_amount"] == Decimal("130000.00")

    # 3. 30% nằm trong [200k, 1M] (1.000.000 * 30% = 300k) => cọc 300k, còn lại 700k
    mid_case = calculate_deposit_br03(db_session, Decimal("1000000.00"))
    assert mid_case["deposit_amount"] == Decimal("300000.00")
    assert mid_case["remaining_amount"] == Decimal("700000.00")

    # 4. 30% > 1M (5.000.000 * 30% = 1.5M) => áp dụng trần 1.000.000đ, còn lại 4.000.000đ
    cap_case = calculate_deposit_br03(db_session, Decimal("5000000.00"))
    assert cap_case["deposit_amount"] == Decimal("1000000.00")
    assert cap_case["remaining_amount"] == Decimal("4000000.00")


# =========================================================
# 2. SERVICE TESTS: TÍNH CHI PHÍ, TẠO ĐƠN, GHI CHÚ & TRÙNG LỊCH
# =========================================================

def test_calculate_order_pricing_with_home_delivery(db_session):
    now = utc_now()
    # Xe 150k/ngày * 3 ngày = 450k + Giao tận nơi 5km (30k + 5*10k = 80k) => Tổng 530k
    # BR-03: 530k * 30% = 159k < 200k => Cọc 200k, Trả khi nhận xe 330k
    req = OrderCalculateRequestSchema(
        vehicle_id=1,
        price_id=1,
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=4),
        delivery_method="Giao tận nơi",
        delivery_address="100 Bạch Đằng, Đà Nẵng",
        delivery_distance_km=Decimal("5.00"),
    )
    res = calculate_order_pricing(db_session, req)
    assert res["duration_days"] == 3
    assert res["rental_amount"] == Decimal("450000.00")
    assert res["delivery_fee"] == Decimal("80000.00")
    assert res["total_amount"] == Decimal("530000.00")
    assert res["deposit_amount"] == Decimal("200000.00")
    assert res["remaining_amount"] == Decimal("330000.00")


def test_create_order_persists_note_br03_and_blocks_overlap(db_session):
    now = utc_now()
    # Thuê ô tô 1tr/ngày * 4 ngày = 4tr, nhận tại cửa hàng (phí 0)
    # BR-03: 4tr * 30% = 1.2tr > 1tr => cọc trần 1tr, còn lại 3tr
    order_req = OrderCreateSchema(
        renter_id=2,
        vehicle_id=2,
        price_id=2,
        start_time=now + timedelta(days=2),
        end_time=now + timedelta(days=6),
        delivery_method="Nhận tại cửa hàng",
        note="  Chuẩn bị thêm ghế trẻ em  ",
    )
    order = create_rental_order(db_session, order_req)
    assert order.note == "Chuẩn bị thêm ghế trẻ em"
    assert Decimal(str(order.rental_amount)) == Decimal("4000000.00")
    assert Decimal(str(order.delivery_fee)) == Decimal("0.00")
    assert Decimal(str(order.total_amount)) == Decimal("4000000.00")
    assert Decimal(str(order.deposit_amount)) == Decimal("1000000.00")
    assert Decimal(str(order.remaining_amount)) == Decimal("3000000.00")

    fetched = get_order_by_id(db_session, order.order_id)
    assert fetched.order_id == order.order_id
    assert fetched.note == "Chuẩn bị thêm ghế trẻ em"

    # Đặt trùng lịch trên cùng xe 2 => 409 Conflict
    overlap_req = OrderCreateSchema(
        renter_id=2,
        vehicle_id=2,
        price_id=2,
        start_time=now + timedelta(days=3),
        end_time=now + timedelta(days=5),
    )
    with pytest.raises(HTTPException) as exc:
        create_rental_order(db_session, overlap_req)
    assert exc.value.status_code == 409


# =========================================================
# 3. API TESTS: POST /orders/calculate, POST /orders, GET /orders/{id}
# =========================================================

def test_api_calculate_and_create_order_with_br03_and_note(api_client):
    now = utc_now()
    start = (now + timedelta(days=1)).isoformat()
    end = (now + timedelta(days=3)).isoformat()

    # 1. Tính trước: Ô tô 1tr * 2 ngày = 2tr + Giao tận nơi 4km (30k + 40k = 70k) => 2.070.000đ
    # BR-03: 2.070.000 * 30% = 621.000đ, Trả khi nhận xe = 1.449.000đ
    res_calc = api_client.post(
        "/orders/calculate",
        json={
            "vehicle_id": 2,
            "price_id": 2,
            "start_time": start,
            "end_time": end,
            "delivery_method": "Giao tận nơi",
            "delivery_address": "Sân bay Đà Nẵng",
            "delivery_distance_km": 4.0,
        },
    )
    assert res_calc.status_code == 200
    calc_data = res_calc.json()["data"]
    assert calc_data["rental_amount"] == 2000000.0
    assert calc_data["delivery_fee"] == 70000.0
    assert calc_data["total_amount"] == 2070000.0
    assert calc_data["deposit_amount"] == 621000.0
    assert calc_data["remaining_amount"] == 1449000.0

    # 2. Tạo đơn thật kèm ghi chú
    from app.core.security import create_access_token

    car_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': 'br03-car@example.com', 'email': 'br03-car@example.com', 'user_id': 2, 'role_id': [2]})}"
    }
    res_create = api_client.post(
        "/orders",
        headers=car_headers,
        json={
            "renter_id": 2,
            "vehicle_id": 2,
            "price_id": 2,
            "start_time": start,
            "end_time": end,
            "delivery_method": "Giao tận nơi",
            "delivery_address": "Sân bay Đà Nẵng",
            "delivery_distance_km": 4.0,
            "note": "Giao ở cổng ga quốc nội",
        },
    )
    assert res_create.status_code == 201
    created = res_create.json()["data"]
    assert created["note"] == "Giao ở cổng ga quốc nội"
    assert created["rental_amount"] == 2000000.0
    assert created["delivery_fee"] == 70000.0
    assert created["total_amount"] == 2070000.0
    assert created["deposit_amount"] == 621000.0
    assert created["remaining_amount"] == 1449000.0

    # 3. Xem lại chi tiết đơn vừa tạo
    res_get = api_client.get(f"/orders/{created['order_id']}", headers=car_headers)
    assert res_get.status_code == 200
    assert res_get.json()["data"]["deposit_amount"] == 621000.0
    assert res_get.json()["data"]["note"] == "Giao ở cổng ga quốc nội"
