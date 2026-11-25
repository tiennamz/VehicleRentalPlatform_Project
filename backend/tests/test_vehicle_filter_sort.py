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
from app.models.city import City
from app.models.order import Order
from app.models.price_table import PriceTable
from app.models.review import Review
from app.models.store import Store
from app.models.system_config import SystemConfig
from app.models.user import User
from app.models.vehicle import Vehicle
from app.services.vehicle_search_services import haversine_km, search_and_sort_vehicles


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


def _seed_data(db):
    now = utc_now()

    owner = User(
        user_id=1,
        fullname="Chủ Cửa Hàng",
        email="owner@example.com",
        phone_number="0901000001",
        date_of_birth=date(1990, 1, 1),
        address="Đà Nẵng",
        status="Hoạt động",
    )
    renter = User(
        user_id=2,
        fullname="Khách Thuê",
        email="renter@example.com",
        phone_number="0901000002",
        date_of_birth=date(1998, 5, 10),
        address="Đà Nẵng",
        status="Hoạt động",
    )
    db.add_all([owner, renter])
    db.flush()

    dn = City(city_id=1, city_name="Đà Nẵng")
    vt = City(city_id=2, city_name="Vũng Tàu")
    db.add_all([dn, vt])
    db.flush()

    # Store 1: Hải Châu, Đà Nẵng - hỗ trợ cả 2 hình thức giao nhận
    s1 = Store(
        store_id=1,
        owner_id=1,
        store_name="Cửa hàng Hải Châu",
        address="100 Bạch Đằng, Hải Châu, Đà Nẵng",
        contact="0901111111",
        status="Đã duyệt",
        city_id=1,
        latitude=16.0678,
        longitude=108.2208,
        allow_store_pickup=True,
        allow_home_delivery=True,
    )
    # Store 2: Sơn Trà, Đà Nẵng - chỉ nhận tại cửa hàng
    s2 = Store(
        store_id=2,
        owner_id=1,
        store_name="Cửa hàng Sơn Trà",
        address="50 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
        contact="0902222222",
        status="Đã duyệt",
        city_id=1,
        latitude=16.0598,
        longitude=108.2450,
        allow_store_pickup=True,
        allow_home_delivery=False,
    )
    # Store 3: Liên Chiểu, Đà Nẵng - chỉ giao tận nơi
    s3 = Store(
        store_id=3,
        owner_id=1,
        store_name="Cửa hàng Liên Chiểu",
        address="20 Nguyễn Lương Bằng, Liên Chiểu, Đà Nẵng",
        contact="0903333333",
        status="Đã duyệt",
        city_id=1,
        latitude=16.0862,
        longitude=108.1554,
        allow_store_pickup=False,
        allow_home_delivery=True,
    )
    # Store 4: Vũng Tàu - chưa có tọa độ
    s4 = Store(
        store_id=4,
        owner_id=1,
        store_name="Cửa hàng Vũng Tàu",
        address="10 Thùy Vân, Vũng Tàu",
        contact="0904444444",
        status="Đã duyệt",
        city_id=2,
        latitude=None,
        longitude=None,
        allow_store_pickup=True,
        allow_home_delivery=True,
    )
    db.add_all([s1, s2, s3, s4])
    db.flush()

    v1 = Vehicle(
        vehicle_id=1,
        store_id=1,
        brand="Honda",
        model="Vision 2024",
        license_plate="43A1-10001",
        type="Xe tay ga",
        status="Sẵn sàng",
    )
    v2 = Vehicle(
        vehicle_id=2,
        store_id=2,
        brand="Yamaha",
        model="Janus 2023",
        license_plate="43A1-10002",
        type="Xe tay ga",
        status="Sẵn sàng",
    )
    v3 = Vehicle(
        vehicle_id=3,
        store_id=3,
        brand="VinFast",
        model="Feliz S",
        license_plate="43MD-10003",
        type="Xe điện",
        status="Sẵn sàng",
    )
    v4 = Vehicle(
        vehicle_id=4,
        store_id=1,
        brand="Hyundai",
        model="Santafe 2024",
        license_plate="43A-10004",
        type="Ô tô 7 chỗ",
        status="Available",
    )
    v5 = Vehicle(
        vehicle_id=5,
        store_id=4,
        brand="Toyota",
        model="Vios 2024",
        license_plate="72A-10005",
        type="Ô tô 4 chỗ",
        status="Sẵn sàng",
    )
    v6 = Vehicle(
        vehicle_id=6,
        store_id=1,
        brand="Honda",
        model="Wave Alpha",
        license_plate="43A1-10006",
        type="Xe số",
        status="Sẵn sàng",
    )
    v7 = Vehicle(
        vehicle_id=7,
        store_id=1,
        brand="Yamaha",
        model="Exciter 155",
        license_plate="43A1-10007",
        type="Xe số",
        status="Bảo trì",
    )
    db.add_all([v1, v2, v3, v4, v5, v6, v7])
    db.flush()

    prices = [
        PriceTable(price_id=1, vehicle_id=1, amount=Decimal("150000.00"), price_type="DAILY"),
        PriceTable(price_id=2, vehicle_id=2, amount=Decimal("160000.00"), price_type="DAILY"),
        PriceTable(price_id=3, vehicle_id=3, amount=Decimal("220000.00"), price_type="DAILY"),
        PriceTable(price_id=4, vehicle_id=4, amount=Decimal("900000.00"), price_type="DAILY"),
        PriceTable(price_id=5, vehicle_id=5, amount=Decimal("700000.00"), price_type="DAILY"),
        PriceTable(price_id=7, vehicle_id=7, amount=Decimal("200000.00"), price_type="DAILY"),
    ]
    db.add_all(prices)
    db.flush()

    # Đơn hoàn thành để gắn đánh giá + đơn trùng lịch tương lai
    orders = [
        # v1: 2 reviews (5, 5) => avg 5.0
        Order(
            order_id=1, renter_id=2, vehicle_id=1, price_id=1,
            start_time=now - timedelta(days=20), end_time=now - timedelta(days=18),
            total_amount=Decimal("300000.00"), order_status="Hoàn thành", created_at=now - timedelta(days=21),
        ),
        Order(
            order_id=2, renter_id=2, vehicle_id=1, price_id=1,
            start_time=now - timedelta(days=15), end_time=now - timedelta(days=14),
            total_amount=Decimal("150000.00"), order_status="Hoàn thành", created_at=now - timedelta(days=16),
        ),
        # v2: 2 reviews (4, 5) => avg 4.5
        Order(
            order_id=3, renter_id=2, vehicle_id=2, price_id=2,
            start_time=now - timedelta(days=12), end_time=now - timedelta(days=10),
            total_amount=Decimal("320000.00"), order_status="Hoàn thành", created_at=now - timedelta(days=13),
        ),
        Order(
            order_id=4, renter_id=2, vehicle_id=2, price_id=2,
            start_time=now - timedelta(days=9), end_time=now - timedelta(days=8),
            total_amount=Decimal("160000.00"), order_status="Hoàn thành", created_at=now - timedelta(days=10),
        ),
        # v3: 1 review (4) => avg 4.0
        Order(
            order_id=5, renter_id=2, vehicle_id=3, price_id=3,
            start_time=now - timedelta(days=7), end_time=now - timedelta(days=6),
            total_amount=Decimal("220000.00"), order_status="Hoàn thành", created_at=now - timedelta(days=8),
        ),
        # v4: 3 reviews (5, 4, 5) => avg 4.67
        Order(
            order_id=6, renter_id=2, vehicle_id=4, price_id=4,
            start_time=now - timedelta(days=6), end_time=now - timedelta(days=5),
            total_amount=Decimal("900000.00"), order_status="Hoàn thành", created_at=now - timedelta(days=7),
        ),
        Order(
            order_id=7, renter_id=2, vehicle_id=4, price_id=4,
            start_time=now - timedelta(days=4), end_time=now - timedelta(days=3),
            total_amount=Decimal("900000.00"), order_status="Hoàn thành", created_at=now - timedelta(days=5),
        ),
        Order(
            order_id=8, renter_id=2, vehicle_id=4, price_id=4,
            start_time=now - timedelta(days=2), end_time=now - timedelta(days=1),
            total_amount=Decimal("900000.00"), order_status="Hoàn thành", created_at=now - timedelta(days=3),
        ),
        # Đơn trùng lịch đang hoạt động cho v1 trong khoảng [now + 10d, now + 12d]
        Order(
            order_id=9, renter_id=2, vehicle_id=1, price_id=1,
            start_time=now + timedelta(days=10), end_time=now + timedelta(days=12),
            total_amount=Decimal("300000.00"), order_status="Đã xác nhận", created_at=now,
        ),
        # Đơn Đã hủy cho v2 cùng khoảng thời gian => v2 vẫn trống
        Order(
            order_id=10, renter_id=2, vehicle_id=2, price_id=2,
            start_time=now + timedelta(days=10), end_time=now + timedelta(days=12),
            total_amount=Decimal("320000.00"), order_status="Đã hủy", created_at=now,
        ),
    ]
    db.add_all(orders)
    db.flush()

    reviews = [
        Review(review_id=1, order_id=1, reviewer_id=2, rating=5, comment="Rất tốt", created_at=now),
        Review(review_id=2, order_id=2, reviewer_id=2, rating=5, comment="Xe mới", created_at=now),
        Review(review_id=3, order_id=3, reviewer_id=2, rating=4, comment="Ổn", created_at=now),
        Review(review_id=4, order_id=4, reviewer_id=2, rating=5, comment="Sạch sẽ", created_at=now),
        Review(review_id=5, order_id=5, reviewer_id=2, rating=4, comment="Êm", created_at=now),
        Review(review_id=6, order_id=6, reviewer_id=2, rating=5, comment="Tuyệt", created_at=now),
        Review(review_id=7, order_id=7, reviewer_id=2, rating=4, comment="Tốt", created_at=now),
        Review(review_id=8, order_id=8, reviewer_id=2, rating=5, comment="Chuẩn", created_at=now),
    ]
    db.add_all(reviews)
    db.commit()


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    _seed_data(session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def api_client():
    prev_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    _seed_data(db)
    db.close()

    with TestClient(app) as client:
        yield client

    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides = prev_overrides


# =========================================================
# 1. TESTS LỌC THEO LOẠI XE, GIÁ, HÃNG, GIAO NHẬN, ĐÁNH GIÁ
# =========================================================

def test_filter_by_vehicle_type_exact_slug_and_multiple(db_session):
    # Slug xe-may => Xe tay ga + Xe số (v1, v2, v6; loại v7 vì Bảo trì)
    motorbikes = search_and_sort_vehicles(db_session, vehicle_type="xe-may")
    assert [v.vehicle_id for v in motorbikes] == [1, 2, 6]

    # Slug o-to => Ô tô 4 chỗ + 7 chỗ + 16 chỗ (v4, v5)
    cars = search_and_sort_vehicles(db_session, vehicle_type="o-to")
    assert [v.vehicle_id for v in cars] == [4, 5]

    # Nhiều loại cùng lúc: xe-dien + Ô tô 4 chỗ
    mixed = search_and_sort_vehicles(db_session, vehicle_type=["xe-dien", "Ô tô 4 chỗ"])
    assert [v.vehicle_id for v in mixed] == [3, 5]


def test_filter_by_price_range_and_validation(db_session):
    # Dưới hoặc bằng 200k (loại v6 chưa có giá)
    cheap = search_and_sort_vehicles(db_session, max_price=200000)
    assert [v.vehicle_id for v in cheap] == [1, 2]

    # Khoảng 200k - 800k
    mid = search_and_sort_vehicles(db_session, min_price=200000, max_price=800000)
    assert [v.vehicle_id for v in mid] == [3, 5]

    # min_price > max_price => 400
    with pytest.raises(HTTPException) as exc:
        search_and_sort_vehicles(db_session, min_price=500000, max_price=200000)
    assert exc.value.status_code == 400


def test_filter_by_brand_single_and_multiple(db_session):
    honda_only = search_and_sort_vehicles(db_session, brand="honda")
    assert [v.vehicle_id for v in honda_only] == [1, 6]

    multi_brand = search_and_sort_vehicles(db_session, brand=["Yamaha", "vinfast"])
    assert [v.vehicle_id for v in multi_brand] == [2, 3]


def test_filter_by_delivery_method_store_and_global_config(db_session):
    # Giao tận nơi: store 1 (v1, v4, v6), store 3 (v3), store 4 (v5); store 2 (v2) không hỗ trợ
    home = search_and_sort_vehicles(db_session, delivery_method="Giao tận nơi")
    assert [v.vehicle_id for v in home] == [1, 3, 4, 5, 6]

    # Nhận tại cửa hàng (dùng slug): loại store 3 (v3)
    pickup = search_and_sort_vehicles(db_session, delivery_method="tai-cua-hang")
    assert [v.vehicle_id for v in pickup] == [1, 2, 4, 5, 6]

    # Tắt giao tận nơi ở cấu hình hệ thống => lọc giao tận nơi trả về rỗng
    db_session.add(SystemConfig(config_key="allow_home_delivery", config_value="false"))
    db_session.commit()
    home_disabled = search_and_sort_vehicles(db_session, delivery_method="giao-tan-noi")
    assert home_disabled == []

    # Hình thức giao nhận không hợp lệ => 400
    with pytest.raises(HTTPException) as exc:
        search_and_sort_vehicles(db_session, delivery_method="ship-hoa-toc")
    assert exc.value.status_code == 400


def test_filter_by_min_rating_and_availability(db_session):
    # Điểm >= 4.6 => v1 (5.0), v4 (4.67)
    high_rated = search_and_sort_vehicles(db_session, min_rating=4.6)
    assert [v.vehicle_id for v in high_rated] == [1, 4]

    # Khoảng thời gian trùng với đơn đang hoạt động của v1 => v1 bị loại, v2 (đơn đã hủy) giữ lại
    now = utc_now()
    avail = search_and_sort_vehicles(
        db_session,
        start_time=now + timedelta(days=10, hours=2),
        end_time=now + timedelta(days=11),
    )
    assert 1 not in [v.vehicle_id for v in avail]
    assert 2 in [v.vehicle_id for v in avail]

    # Rating ngoài [0, 5] => 400
    with pytest.raises(HTTPException) as exc:
        search_and_sort_vehicles(db_session, min_rating=5.5)
    assert exc.value.status_code == 400


# =========================================================
# 2. TESTS SẮP XẾP THEO GIÁ, ĐÁNH GIÁ, KHOẢNG CÁCH
# =========================================================

def test_sort_by_price_asc_and_desc_keeps_unpriced_last(db_session):
    asc = search_and_sort_vehicles(db_session, sort_by="price_asc")
    # 150k (1), 160k (2), 220k (3), 700k (5), 900k (4), None (6)
    assert [v.vehicle_id for v in asc] == [1, 2, 3, 5, 4, 6]

    desc = search_and_sort_vehicles(db_session, sort_by="price_desc")
    assert [v.vehicle_id for v in desc] == [4, 5, 3, 2, 1, 6]


def test_sort_by_rating_desc_and_asc(db_session):
    desc = search_and_sort_vehicles(db_session, sort_by="rating_desc")
    # 5.0 (1), 4.67 (4), 4.5 (2), 4.0 (3), 0.0 (5, 6)
    assert [v.vehicle_id for v in desc] == [1, 4, 2, 3, 5, 6]

    asc = search_and_sort_vehicles(db_session, sort_by="rating_asc")
    assert [v.vehicle_id for v in asc] == [5, 6, 3, 2, 4, 1]


def test_sort_by_distance_asc_and_desc_and_haversine(db_session):
    # Người dùng đứng tại Hải Châu (16.0678, 108.2208) => trùng store 1 (0 km)
    asc = search_and_sort_vehicles(
        db_session,
        user_lat=16.0678,
        user_lng=108.2208,
        sort_by="distance_asc",
    )
    ids_asc = [v.vehicle_id for v in asc]
    # Store 1 (1, 4, 6) = 0km -> Store 2 (2) ~2.73km -> Store 3 (3) ~7.28km -> Store 4 (5, None) cuối
    assert ids_asc[:3] == [1, 4, 6]
    assert ids_asc[3] == 2
    assert ids_asc[4] == 3
    assert ids_asc[5] == 5
    assert asc[0].distance_km == 0.0
    assert asc[3].distance_km == haversine_km(16.0678, 108.2208, 16.0598, 108.2450)
    assert asc[5].distance_km is None

    # Sort distance_desc vẫn giữ xe chưa có tọa độ (5) ở cuối
    desc = search_and_sort_vehicles(
        db_session,
        user_lat=16.0678,
        user_lng=108.2208,
        sort_by="distance",
        sort_order="desc",
    )
    ids_desc = [v.vehicle_id for v in desc]
    assert ids_desc[0] == 3
    assert ids_desc[1] == 2
    assert ids_desc[-1] == 5

    # Thiếu tọa độ khi sort distance => 400
    with pytest.raises(HTTPException) as exc:
        search_and_sort_vehicles(db_session, sort_by="distance_asc")
    assert exc.value.status_code == 400


# =========================================================
# 3. API INTEGRATION TESTS (GET /vehicles)
# =========================================================

def test_api_combined_filters_and_sorting(api_client):
    res = api_client.get(
        "/vehicles",
        params=[
            ("vehicle_type", "xe-may"),
            ("vehicle_type", "o-to"),
            ("min_price", "140000"),
            ("max_price", "950000"),
            ("brand", "honda"),
            ("brand", "hyundai"),
            ("delivery_method", "Giao tận nơi"),
            ("min_rating", "4.5"),
            ("user_lat", "16.0678"),
            ("user_lng", "108.2208"),
            ("sort_by", "price_desc"),
        ],
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert [item["vehicle_id"] for item in data] == [4, 1]
    assert data[0]["price_per_day"] == 900000.0
    assert data[0]["rating"] == 4.67
    assert data[0]["review_count"] == 3
    assert "Giao tận nơi" in data[0]["delivery_methods"]
    assert data[0]["distance_km"] == 0.0


def test_api_sort_distance_without_coords_returns_400(api_client):
    res = api_client.get("/vehicles?sort_by=distance_asc")
    assert res.status_code == 400


def test_api_invalid_sort_by_returns_400(api_client):
    res = api_client.get("/vehicles?sort_by=invalid_sort")
    assert res.status_code == 400
