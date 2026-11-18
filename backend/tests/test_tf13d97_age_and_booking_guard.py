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

from app.schemas.booking_eligibility_schemas import (
    calculate_age,
    UserProfileUpdateSchema,
    DriverLicenseSubmitSchema,
    OrderCreateSchema,
)
from app.services.booking_eligibility_services import (
    update_user_profile,
    submit_driver_license,
    search_vehicles,
    create_rental_order,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# =========================================================
# 1. UNIT TESTS: TÍNH TUỔI & VALIDATE SCHEMA (ĐỦ 18 TUỔI)
# =========================================================

def test_calculate_age_exact_18th_birthday_passes():
    today = date(2026, 11, 18)
    dob_exact_18 = date(2008, 11, 18)
    assert calculate_age(dob_exact_18, today=today) == 18


def test_calculate_age_one_day_short_of_18():
    today = date(2026, 11, 18)
    dob_17_years_364_days = date(2008, 11, 19)
    assert calculate_age(dob_17_years_364_days, today=today) == 17


def test_profile_update_schema_future_dob_fails():
    future_dob = date.today() + timedelta(days=5)
    with pytest.raises(ValidationError) as exc_info:
        UserProfileUpdateSchema(
            fullname="Nguyễn Văn Trẻ",
            date_of_birth=future_dob,
            address="123 Lê Lợi, Đà Nẵng",
        )
    assert "tương lai" in str(exc_info.value).lower() or "hiện tại" in str(exc_info.value).lower()


def test_profile_update_schema_under_18_fails():
    today = date.today()
    under_18_dob = date(today.year - 17, today.month, today.day)
    with pytest.raises(ValidationError) as exc_info:
        UserProfileUpdateSchema(
            fullname="Nguyễn Văn 17",
            date_of_birth=under_18_dob,
            address="123 Lê Lợi, Đà Nẵng",
        )
    assert "18 tuổi" in str(exc_info.value)


def test_profile_update_schema_empty_fullname_or_address_fails():
    valid_dob = date(2000, 1, 1)
    with pytest.raises(ValidationError):
        UserProfileUpdateSchema(fullname="   ", date_of_birth=valid_dob, address="Đà Nẵng")
    with pytest.raises(ValidationError):
        UserProfileUpdateSchema(fullname="Nguyễn Văn A", date_of_birth=valid_dob, address="   ")


# =========================================================
# 2. SERVICE TESTS: TÌM XE VS ĐẶT XE & KIỂM TRA 18 TUỔI
# =========================================================

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Tạo 3 người dùng:
    # User 1: Đủ 18 tuổi, GPLX Đang chờ duyệt
    user_pending = User(
        user_id=1,
        fullname="Khách Chờ Duyệt",
        email="pending@example.com",
        phone_number="0901111111",
        date_of_birth=date(2000, 5, 20),
        address="Đà Nẵng",
    )
    # User 2: Đủ 18 tuổi, GPLX Đã xác thực (hạng A1)
    user_verified = User(
        user_id=2,
        fullname="Khách Đã Duyệt",
        email="verified@example.com",
        phone_number="0902222222",
        date_of_birth=date(1998, 3, 15),
        address="Vũng Tàu",
    )
    # User 3: Chưa đủ 18 tuổi (17 tuổi)
    today = date.today()
    user_underage = User(
        user_id=3,
        fullname="Khách 17 Tuổi",
        email="underage@example.com",
        phone_number="0903333333",
        date_of_birth=date(today.year - 17, today.month, today.day),
        address="Hà Nội",
    )
    # User 4: Đủ 18 tuổi nhưng chưa nộp GPLX
    user_no_license = User(
        user_id=4,
        fullname="Khách Chưa Có Bằng",
        email="nolicense@example.com",
        phone_number="0904444444",
        date_of_birth=date(1995, 10, 10),
        address="TP.HCM",
    )

    session.add_all([user_pending, user_verified, user_underage, user_no_license])
    session.commit()

    lic_pending = DriverLicense(
        drivers_license_id=101,
        user_id=1,
        license_number="GPLX-PENDING-01",
        license_class="A1",
        issue_date=utc_now() - timedelta(days=365),
        expiry_date=utc_now() + timedelta(days=3650),
        verification_status="Đang chờ",
    )
    lic_verified = DriverLicense(
        drivers_license_id=102,
        user_id=2,
        license_number="GPLX-VERIFIED-02",
        license_class="A1",
        issue_date=utc_now() - timedelta(days=365),
        expiry_date=utc_now() + timedelta(days=3650),
        verification_status="Đã xác thực",
    )
    session.add_all([lic_pending, lic_verified])

    veh_motorbike = Vehicle(
        vehicle_id=10,
        brand="Honda AirBlade",
        license_plate="43A1-12345",
        type="Xe tay ga",
        status="Available",
    )
    veh_car = Vehicle(
        vehicle_id=20,
        brand="Toyota Vios",
        license_plate="43A-99999",
        type="Ô tô 4 chỗ",
        status="Available",
    )
    session.add_all([veh_motorbike, veh_car])

    price_motorbike = PriceTable(
        price_id=1,
        vehicle_id=10,
        amount=Decimal("150000.00"),
        price_type="DAILY",
    )
    price_car = PriceTable(
        price_id=2,
        vehicle_id=20,
        amount=Decimal("800000.00"),
        price_type="DAILY",
    )
    session.add_all([price_motorbike, price_car])
    session.commit()

    yield session
    session.close()


def test_search_vehicles_allowed_for_unverified_or_missing_license(db_session):
    """TC33: Tài khoản chưa duyệt GPLX hoặc chưa có GPLX vẫn tìm kiếm xe bình thường."""
    vehicles_for_pending = search_vehicles(db_session, user_id=1)
    assert len(vehicles_for_pending) == 2

    vehicles_for_no_license = search_vehicles(db_session, user_id=4, vehicle_type="Xe tay ga")
    assert len(vehicles_for_no_license) == 1
    assert vehicles_for_no_license[0].brand == "Honda AirBlade"


def test_create_order_blocked_when_license_pending(db_session):
    """TC34: Đặt xe khi GPLX đang chờ duyệt -> Không cho phép tạo đơn."""
    order_req = OrderCreateSchema(
        renter_id=1,
        vehicle_id=10,
        price_id=1,
        start_time=utc_now() + timedelta(days=1),
        end_time=utc_now() + timedelta(days=3),
    )
    with pytest.raises(HTTPException) as exc_info:
        create_rental_order(db_session, order_req)
    assert exc_info.value.status_code == 403
    assert "chưa được duyệt" in exc_info.value.detail.lower()


def test_create_order_blocked_when_license_rejected(db_session):
    """Đặt xe khi GPLX bị từ chối -> Không cho phép tạo đơn."""
    lic = db_session.query(DriverLicense).filter_by(user_id=1).first()
    lic.verification_status = "Bị từ chối"
    lic.rejected_reason = "Ảnh mờ"
    db_session.commit()

    order_req = OrderCreateSchema(
        renter_id=1,
        vehicle_id=10,
        price_id=1,
        start_time=utc_now() + timedelta(days=1),
        end_time=utc_now() + timedelta(days=2),
    )
    with pytest.raises(HTTPException) as exc_info:
        create_rental_order(db_session, order_req)
    assert exc_info.value.status_code == 403
    assert "bị từ chối" in exc_info.value.detail.lower() or "chưa được duyệt" in exc_info.value.detail.lower()


def test_create_order_blocked_when_license_missing(db_session):
    """TC31/TC34: Đặt xe khi chưa nộp GPLX -> Không cho phép tạo đơn."""
    order_req = OrderCreateSchema(
        renter_id=4,
        vehicle_id=10,
        price_id=1,
        start_time=utc_now() + timedelta(days=1),
        end_time=utc_now() + timedelta(days=2),
    )
    with pytest.raises(HTTPException) as exc_info:
        create_rental_order(db_session, order_req)
    assert exc_info.value.status_code == 403
    assert "giấy phép lái xe" in exc_info.value.detail.lower()


def test_create_order_blocked_when_user_under_18(db_session):
    """TC21: Người dùng chưa đủ 18 tuổi -> Không đủ điều kiện thuê xe."""
    order_req = OrderCreateSchema(
        renter_id=3,
        vehicle_id=10,
        price_id=1,
        start_time=utc_now() + timedelta(days=1),
        end_time=utc_now() + timedelta(days=2),
    )
    with pytest.raises(HTTPException) as exc_info:
        create_rental_order(db_session, order_req)
    assert exc_info.value.status_code == 403
    assert "18 tuổi" in exc_info.value.detail


def test_create_order_blocked_when_license_class_incompatible(db_session):
    """TC30: Có GPLX hạng A1 (Đã xác thực) nhưng đặt Ô tô 4 chỗ -> Chặn."""
    order_req = OrderCreateSchema(
        renter_id=2,
        vehicle_id=20,  # Ô tô 4 chỗ
        price_id=2,
        start_time=utc_now() + timedelta(days=1),
        end_time=utc_now() + timedelta(days=2),
    )
    with pytest.raises(HTTPException) as exc_info:
        create_rental_order(db_session, order_req)
    assert exc_info.value.status_code == 403
    assert "hạng" in exc_info.value.detail.lower()


def test_create_order_blocked_when_license_expired(db_session):
    """Đặt xe khi GPLX đã hết hạn -> Không cho phép tạo đơn."""
    lic = db_session.query(DriverLicense).filter_by(user_id=2).first()
    lic.expiry_date = utc_now() - timedelta(days=1)
    db_session.commit()

    base_time = utc_now()
    order_req = OrderCreateSchema(
        renter_id=2,
        vehicle_id=10,
        price_id=1,
        start_time=base_time + timedelta(days=1),
        end_time=base_time + timedelta(days=2),
    )
    with pytest.raises(HTTPException) as exc_info:
        create_rental_order(db_session, order_req)
    assert exc_info.value.status_code == 403
    assert "hết hạn" in exc_info.value.detail.lower()


def test_create_order_succeeds_when_18_plus_and_license_verified(db_session):
    """TC35: Đủ 18 tuổi + GPLX đã duyệt đúng hạng -> Tạo đơn thuê thành công."""
    base_time = utc_now()
    order_req = OrderCreateSchema(
        renter_id=2,
        vehicle_id=10,  # Xe tay ga, khớp A1
        price_id=1,
        start_time=base_time + timedelta(days=1),
        end_time=base_time + timedelta(days=3),  # 2 ngày
    )
    order = create_rental_order(db_session, order_req)
    assert order.order_id is not None
    assert order.renter_id == 2
    assert order.vehicle_id == 10
    assert order.total_amount == Decimal("300000.00")
    assert order.order_status == "Chờ thanh toán"


# =========================================================
# 3. API INTEGRATION TESTS VỚI FASTAPI TESTCLIENT
# =========================================================

test_api_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
ApiTestingSessionLocal = sessionmaker(bind=test_api_engine, autoflush=False, expire_on_commit=False)


def override_get_db():
    db = ApiTestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def api_client():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_api_engine)
    db = ApiTestingSessionLocal()

    u1 = User(
        user_id=1,
        fullname="Khách Chờ Duyệt",
        email="u1@example.com",
        phone_number="0911111111",
        date_of_birth=date(2000, 1, 1),
        address="Đà Nẵng",
    )
    u2 = User(
        user_id=2,
        fullname="Khách Đã Duyệt",
        email="u2@example.com",
        phone_number="0922222222",
        date_of_birth=date(1999, 5, 5),
        address="Đà Nẵng",
    )
    db.add_all([u1, u2])
    db.commit()

    lic1 = DriverLicense(
        drivers_license_id=1,
        user_id=1,
        license_number="GPLX-001",
        license_class="A1",
        issue_date=utc_now() - timedelta(days=200),
        expiry_date=utc_now() + timedelta(days=2000),
        verification_status="Đang chờ",
    )
    lic2 = DriverLicense(
        drivers_license_id=2,
        user_id=2,
        license_number="GPLX-002",
        license_class="A1",
        issue_date=utc_now() - timedelta(days=200),
        expiry_date=utc_now() + timedelta(days=2000),
        verification_status="Đã xác thực",
    )
    veh = Vehicle(
        vehicle_id=100,
        brand="Yamaha Grande",
        license_plate="43B1-88888",
        type="Xe tay ga",
        status="Available",
    )
    price = PriceTable(
        price_id=10,
        vehicle_id=100,
        amount=Decimal("120000.00"),
        price_type="DAILY",
    )
    db.add_all([lic1, lic2, veh, price])
    db.commit()
    db.close()

    with TestClient(app) as c:
        yield c

    Base.metadata.drop_all(bind=test_api_engine)
    app.dependency_overrides.clear()


def test_api_update_profile_under_18_returns_422(api_client):
    today = date.today()
    under_18 = date(today.year - 16, today.month, today.day).isoformat()
    res = api_client.put(
        "/users/1/profile",
        json={
            "fullname": "Khách Nhỏ Tuổi",
            "date_of_birth": under_18,
            "address": "Đà Nẵng",
        },
    )
    assert res.status_code == 422


def test_api_update_profile_valid_18_plus_returns_200(api_client):
    res = api_client.put(
        "/users/1/profile",
        json={
            "fullname": "Khách Hợp Lệ",
            "date_of_birth": "2001-08-15",
            "address": "45 Nguyễn Văn Linh, Đà Nẵng",
        },
    )
    assert res.status_code == 200
    assert res.json()["data"]["fullname"] == "Khách Hợp Lệ"
    assert res.json()["data"]["age"] >= 18


def test_api_search_vehicles_with_unapproved_license_returns_200(api_client):
    res = api_client.get("/vehicles?user_id=1&vehicle_type=Xe tay ga")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    assert data[0]["brand"] == "Yamaha Grande"


def test_api_create_order_with_pending_license_returns_403(api_client):
    start = (utc_now() + timedelta(days=1)).isoformat()
    end = (utc_now() + timedelta(days=2)).isoformat()
    res = api_client.post(
        "/orders",
        json={
            "renter_id": 1,
            "vehicle_id": 100,
            "price_id": 10,
            "start_time": start,
            "end_time": end,
        },
    )
    assert res.status_code == 403
    assert "chưa được duyệt" in res.json()["error"].lower()


def test_api_create_order_with_verified_license_returns_201(api_client):
    start = (utc_now() + timedelta(days=1)).isoformat()
    end = (utc_now() + timedelta(days=3)).isoformat()
    res = api_client.post(
        "/orders",
        json={
            "renter_id": 2,
            "vehicle_id": 100,
            "price_id": 10,
            "start_time": start,
            "end_time": end,
        },
    )
    assert res.status_code == 201
    assert res.json()["data"]["renter_id"] == 2
    assert res.json()["data"]["order_status"] == "Chờ thanh toán"
