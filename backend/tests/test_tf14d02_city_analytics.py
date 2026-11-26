from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base
from app.models.city import City
from app.models.complaint import Complaint
from app.models.order import Order
from app.models.price_table import PriceTable
from app.models.role import Role
from app.models.store import Store
from app.models.user import User
from app.models.user_role import UserRole
from app.models.vehicle import Vehicle
from app.services.city_analytics_services import get_city_analytics_report


def _seed_city_analytics_db(db):
    db.add_all([
        Role(role_id=1, role_name="Admin", description="Admin"),
        Role(role_id=2, role_name="Khách hàng", description="Customer"),
        Role(role_id=3, role_name="Nhân viên", description="Staff"),
        Role(role_id=4, role_name="Chủ cửa hàng", description="Store Owner"),
    ])
    db.add_all([
        City(city_id=1, city_name="Đà Nẵng"),
        City(city_id=2, city_name="Hà Nội"),
        City(city_id=3, city_name="TP. Hồ Chí Minh"),  # 0 orders city
    ])
    db.add_all([
        User(user_id=1, fullname="Admin", email="admin@anl.local", status="Hoạt động"),
        User(user_id=2, fullname="Renter", email="renter@anl.local", status="Hoạt động"),
        User(user_id=3, fullname="Staff", email="staff@anl.local", status="Hoạt động"),
        User(user_id=4, fullname="Owner", email="owner@anl.local", status="Hoạt động"),
    ])
    db.flush()
    db.add_all([
        UserRole(user_id=1, role_id=1),
        UserRole(user_id=2, role_id=2),
        UserRole(user_id=3, role_id=3),
        UserRole(user_id=4, role_id=4),
    ])
    db.add_all([
        Store(store_id=10, owner_id=4, city_id=1, store_name="DN Store", address="DN", business_license="BL1", status="Đã duyệt"),
        Store(store_id=20, owner_id=4, city_id=2, store_name="HN Store", address="HN", business_license="BL2", status="Đã duyệt"),
        Store(store_id=30, owner_id=4, city_id=3, store_name="HCM Store", address="HCM", business_license="BL3", status="Đã duyệt"),
    ])
    db.flush()
    db.add_all([
        Vehicle(vehicle_id=100, store_id=10, brand="Honda", model="SH", license_plate="43A-ANL01", type="Xe tay ga", status="Sẵn sàng"),
        Vehicle(vehicle_id=200, store_id=20, brand="Yamaha", model="NVX", license_plate="29A-ANL01", type="Xe tay ga", status="Sẵn sàng"),
    ])
    db.flush()
    db.add_all([
        PriceTable(price_id=100, vehicle_id=100, amount=Decimal("200000"), price_type="Ngày", effective_from=datetime(2026, 1, 1), effective_to=datetime(2027, 1, 1)),
        PriceTable(price_id=200, vehicle_id=200, amount=Decimal("150000"), price_type="Ngày", effective_from=datetime(2026, 1, 1), effective_to=datetime(2027, 1, 1)),
    ])
    db.flush()

    # Đà Nẵng: 4 orders
    # - #1001 Hoàn tất: 1,000,000 (has 2 complaints -> 1 complained order)
    # - #1002 Đang thuê: 500,000
    # - #1003 Đã hủy: 300,000 (excluded from GMV, counted in cancellation_rate)
    # - #1004 Cửa hàng từ chối: 400,000 (excluded from GMV, NOT counted as customer cancel)
    # => total_orders=4, total_transaction_value=1,500,000, completed_transaction_value=1,000,000
    # => cancelled_orders=1 (25.0%), complained_orders=1 (25.0%), total_complaints=2
    db.add_all([
        Order(order_id=1001, renter_id=2, vehicle_id=100, price_id=100, start_time=datetime(2026, 11, 10, 8, 0), end_time=datetime(2026, 11, 12, 8, 0), total_amount=Decimal("1000000"), order_status="Hoàn tất", created_at=datetime(2026, 11, 10, 7, 0)),
        Order(order_id=1002, renter_id=2, vehicle_id=100, price_id=100, start_time=datetime(2026, 11, 15, 8, 0), end_time=datetime(2026, 11, 16, 8, 0), total_amount=Decimal("500000"), order_status="Đang thuê", created_at=datetime(2026, 11, 15, 7, 0)),
        Order(order_id=1003, renter_id=2, vehicle_id=100, price_id=100, start_time=datetime(2026, 11, 18, 8, 0), end_time=datetime(2026, 11, 19, 8, 0), total_amount=Decimal("300000"), order_status="Đã hủy", created_at=datetime(2026, 11, 18, 7, 0)),
        Order(order_id=1004, renter_id=2, vehicle_id=100, price_id=100, start_time=datetime(2026, 11, 20, 8, 0), end_time=datetime(2026, 11, 21, 8, 0), total_amount=Decimal("400000"), order_status="Cửa hàng từ chối", created_at=datetime(2026, 11, 20, 7, 0)),
    ])

    # Hà Nội: 2 orders
    # - #2001 Hoàn thành: 2,000,000 (1 complaint)
    # - #2002 Đã hủy: 600,000
    # => total_orders=2, total_transaction_value=2,000,000, completed_transaction_value=2,000,000
    # => cancelled_orders=1 (50.0%), complained_orders=1 (50.0%), total_complaints=1
    db.add_all([
        Order(order_id=2001, renter_id=2, vehicle_id=200, price_id=200, start_time=datetime(2026, 11, 12, 8, 0), end_time=datetime(2026, 11, 14, 8, 0), total_amount=Decimal("2000000"), order_status="Hoàn thành", created_at=datetime(2026, 11, 12, 7, 0)),
        Order(order_id=2002, renter_id=2, vehicle_id=200, price_id=200, start_time=datetime(2026, 11, 22, 8, 0), end_time=datetime(2026, 11, 23, 8, 0), total_amount=Decimal("600000"), order_status="Đã hủy", created_at=datetime(2026, 11, 22, 7, 0)),
    ])
    db.flush()

    # 2 complaints on order #1001 (should count as 1 complained_order, 2 total_complaints)
    # 1 complaint on order #2001
    db.add_all([
        Complaint(complaint_id=1, order_id=1001, user_id=2, complaint_type="Xe hỏng", content="Phanh kêu", complaint_status="Đang xử lý", created_at=datetime(2026, 11, 11, 10, 0)),
        Complaint(complaint_id=2, order_id=1001, user_id=2, complaint_type="Phí phát sinh", content="Thu thêm", complaint_status="Đã xử lý", created_at=datetime(2026, 11, 12, 10, 0)),
        Complaint(complaint_id=3, order_id=2001, user_id=2, complaint_type="Giao trễ", content="Trễ 1h", complaint_status="Đang xử lý", created_at=datetime(2026, 11, 13, 10, 0)),
    ])
    db.commit()


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    db = SessionLocal()
    _seed_city_analytics_db(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


def test_city_analytics_aggregates_all_cities_and_summary(db_session):
    report = get_city_analytics_report(db_session)

    # Sorted by total_transaction_value desc: Hà Nội (2M) -> Đà Nẵng (1.5M) -> TP. HCM (0)
    cities = report["cities"]
    assert [c["city_name"] for c in cities] == ["Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh"]

    hn, dn, hcm = cities
    assert hn["total_orders"] == 2
    assert hn["total_transaction_value"] == 2000000.0
    assert hn["completed_transaction_value"] == 2000000.0
    assert hn["cancelled_orders"] == 1
    assert hn["cancellation_rate"] == 50.0
    assert hn["complained_orders"] == 1
    assert hn["total_complaints"] == 1
    assert hn["complaint_rate"] == 50.0

    assert dn["total_orders"] == 4
    assert dn["total_transaction_value"] == 1500000.0
    assert dn["completed_transaction_value"] == 1000000.0
    assert dn["cancelled_orders"] == 1
    assert dn["rejected_orders"] == 1
    assert dn["cancellation_rate"] == 25.0
    assert dn["complained_orders"] == 1
    assert dn["total_complaints"] == 2
    assert dn["complaint_rate"] == 25.0

    # 0-order city has safe 0.0 rates
    assert hcm["total_orders"] == 0
    assert hcm["total_transaction_value"] == 0.0
    assert hcm["cancellation_rate"] == 0.0
    assert hcm["complaint_rate"] == 0.0

    # Summary across all cities: 6 orders, 3.5M GMV, 2 cancelled (33.33%), 2 complained orders (33.33%), 3 total complaints
    summary = report["summary"]
    assert summary["total_orders"] == 6
    assert summary["total_transaction_value"] == 3500000.0
    assert summary["completed_transaction_value"] == 3000000.0
    assert summary["cancelled_orders"] == 2
    assert summary["cancellation_rate"] == 33.33
    assert summary["complained_orders"] == 2
    assert summary["total_complaints"] == 3
    assert summary["complaint_rate"] == 33.33


def test_city_analytics_date_and_city_filters_and_validation(db_session):
    # Filter date range 2026-11-15 to 2026-11-21 -> only DN orders #1002, #1003, #1004
    filtered = get_city_analytics_report(
        db_session,
        from_date=date(2026, 11, 15),
        to_date=date(2026, 11, 21),
        city_id=1,
    )
    assert len(filtered["cities"]) == 1
    dn = filtered["cities"][0]
    assert dn["total_orders"] == 3
    assert dn["total_transaction_value"] == 500000.0
    assert dn["cancelled_orders"] == 1
    assert dn["cancellation_rate"] == 33.33
    assert dn["complained_orders"] == 0
    assert dn["complaint_rate"] == 0.0

    # Invalid date range -> 422
    with pytest.raises(HTTPException) as exc_422:
        get_city_analytics_report(db_session, from_date=date(2026, 11, 25), to_date=date(2026, 11, 10))
    assert exc_422.value.status_code == 422

    # Nonexistent city_id -> 404
    with pytest.raises(HTTPException) as exc_404:
        get_city_analytics_report(db_session, city_id=9999)
    assert exc_404.value.status_code == 404


def test_api_city_analytics_rbac_and_filters():
    from fastapi.testclient import TestClient
    from app.core.security import create_access_token
    from app.database.database import get_db
    from app.main import app

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        s = SessionLocal()
        try:
            yield s
        finally:
            s.close()

    prev_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = override_get_db
    db = SessionLocal()
    try:
        _seed_city_analytics_db(db)

        def _h(uid: int, email: str, rid: int) -> dict:
            t = create_access_token({"sub": email, "email": email, "user_id": uid, "role_id": [rid]})
            return {"Authorization": f"Bearer {t}"}

        client = TestClient(app)

        # Unauthenticated -> 401
        assert client.get("/admin/analytics/cities").status_code == 401

        # Customer & Store Owner -> 403
        assert client.get("/admin/analytics/cities", headers=_h(2, "renter@anl.local", 2)).status_code == 403
        assert client.get("/admin/analytics/cities", headers=_h(4, "owner@anl.local", 4)).status_code == 403

        # Staff (Operator) -> 200
        r_staff = client.get("/admin/analytics/cities", headers=_h(3, "staff@anl.local", 3))
        assert r_staff.status_code == 200
        payload = r_staff.json()["data"]
        assert payload["summary"]["total_orders"] == 6
        assert payload["summary"]["total_transaction_value"] == 3500000.0
        assert len(payload["cities"]) == 3

        # Admin with date + city_id filter -> 200
        r_admin = client.get(
            "/admin/analytics/cities",
            headers=_h(1, "admin@anl.local", 1),
            params={"from_date": "2026-11-10", "to_date": "2026-11-15", "city_id": 1},
        )
        assert r_admin.status_code == 200
        dn = r_admin.json()["data"]["cities"][0]
        assert dn["total_orders"] == 2
        assert dn["total_transaction_value"] == 1500000.0
        assert dn["cancellation_rate"] == 0.0
        assert dn["complaint_rate"] == 50.0
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides = prev_overrides

