from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base
from app.models.system_config import SystemConfig
from app.schemas.system_config_schemas import SystemConfigUpdateSchema
from app.services.system_config_services import (
    calculate_late_return_fee,
    get_hold_time_minutes,
    get_system_config,
    update_system_config,
)


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
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


def test_default_system_config_values(db_session):
    cfg = get_system_config(db_session)
    assert cfg["commission_rate"] == Decimal("12.00")
    assert cfg["hold_time_minutes"] == 15
    assert cfg["cancel_full_refund_hours"] == Decimal("24.00")
    assert cfg["cancel_full_refund_rate"] == Decimal("100.00")
    assert cfg["cancel_partial_refund_hours"] == Decimal("6.00")
    assert cfg["cancel_partial_refund_rate"] == Decimal("50.00")
    assert cfg["cancel_late_refund_rate"] == Decimal("0.00")
    assert cfg["late_return_grace_minutes"] == 30
    assert cfg["late_return_fee_per_hour"] == Decimal("50000.00")
    assert get_hold_time_minutes(db_session) == 15


def test_update_system_config_partial_and_full_and_syncs_timeout_key(db_session):
    updated = update_system_config(
        db_session,
        SystemConfigUpdateSchema(
            commission_rate=Decimal("15.50"),
            hold_time_minutes=25,
            late_return_grace_minutes=15,
            late_return_fee_per_hour=Decimal("80000"),
        ),
    )
    assert updated["commission_rate"] == Decimal("15.50")
    assert updated["hold_time_minutes"] == 25
    assert updated["cancel_full_refund_hours"] == Decimal("24.00")
    assert updated["late_return_grace_minutes"] == 15
    assert updated["late_return_fee_per_hour"] == Decimal("80000.00")

    # Verify both hold_time_minutes and store_confirmation_timeout_minutes are synced
    rows = {
        r.config_key: r.config_value
        for r in db_session.query(SystemConfig).all()
    }
    assert rows["hold_time_minutes"] == "25"
    assert rows["store_confirmation_timeout_minutes"] == "25"


def test_partial_update_rejects_cross_field_cancellation_violation(db_session):
    # Stored cancel_full_refund_hours is 24.00; setting partial hours to 30 must fail
    with pytest.raises(HTTPException) as exc_info:
        update_system_config(
            db_session,
            SystemConfigUpdateSchema(cancel_partial_refund_hours=Decimal("30.00")),
        )
    assert exc_info.value.status_code == 422

    # Stored cancel_partial_refund_rate is 50.00; setting full refund rate to 40 must fail
    with pytest.raises(HTTPException) as exc_info2:
        update_system_config(
            db_session,
            SystemConfigUpdateSchema(cancel_full_refund_rate=Decimal("40.00")),
        )
    assert exc_info2.value.status_code == 422


def test_calculate_late_return_fee_exact_boundaries(db_session):
    end_time = datetime(2026, 11, 26, 10, 0, 0)

    # Returned early -> 0
    r_early = calculate_late_return_fee(db_session, end_time, end_time - timedelta(minutes=10))
    assert r_early["late_minutes"] == 0
    assert r_early["billable_late_hours"] == 0
    assert r_early["late_fee"] == Decimal("0.00")

    # Returned exactly at grace period (30 min) -> 0
    r_grace = calculate_late_return_fee(db_session, end_time, end_time + timedelta(minutes=30))
    assert r_grace["late_minutes"] == 30
    assert r_grace["billable_late_hours"] == 0
    assert r_grace["late_fee"] == Decimal("0.00")

    # Returned 31 min late (1 min past grace) -> 1 hour = 50,000
    r_1h = calculate_late_return_fee(db_session, end_time, end_time + timedelta(minutes=31))
    assert r_1h["late_minutes"] == 31
    assert r_1h["billable_late_hours"] == 1
    assert r_1h["late_fee"] == Decimal("50000.00")

    # Returned 91 min late (61 min past grace) -> 2 hours = 100,000
    r_2h = calculate_late_return_fee(db_session, end_time, end_time + timedelta(minutes=91))
    assert r_2h["late_minutes"] == 91
    assert r_2h["billable_late_hours"] == 2
    assert r_2h["late_fee"] == Decimal("100000.00")

    # Admin updates grace=10 min, fee=75,000/h -> 91 min late => 81 min billable => 2h = 150,000
    update_system_config(
        db_session,
        SystemConfigUpdateSchema(
            late_return_grace_minutes=10,
            late_return_fee_per_hour=Decimal("75000"),
        ),
    )
    r_custom = calculate_late_return_fee(db_session, end_time, end_time + timedelta(minutes=91))
    assert r_custom["grace_minutes"] == 10
    assert r_custom["fee_per_hour"] == Decimal("75000.00")
    assert r_custom["billable_late_hours"] == 2
    assert r_custom["late_fee"] == Decimal("150000.00")


def test_modules_read_live_values_from_system_config(db_session):
    from app.models.city import City
    from app.models.drivers_license import DriverLicense
    from app.models.price_table import PriceTable
    from app.models.store import Store
    from app.models.user import User
    from app.models.vehicle import Vehicle
    from app.schemas.booking_eligibility_schemas import OrderCreateSchema
    from app.services.booking_eligibility_services import create_rental_order
    from app.services.order_cancellation_history_services import (
        calculate_refund_br04,
        preview_order_cancellation,
    )
    from app.services.reconciliation_services import get_commission_rate
    from app.services.store_order_confirmation_services import get_confirmation_timeout_minutes

    # Seed minimal entities for order creation
    db_session.add(City(city_id=1, city_name="Đà Nẵng"))
    owner = User(user_id=10, fullname="Owner", email="owner@cfg.local", status="Hoạt động")
    renter = User(
        user_id=20,
        fullname="Renter",
        email="renter@cfg.local",
        date_of_birth=date(1998, 1, 1),
        status="Hoạt động",
    )
    db_session.add_all([owner, renter])
    db_session.flush()
    db_session.add(
        DriverLicense(
            user_id=20,
            license_number="CFG-99999",
            license_class="A1",
            issue_date=datetime(2020, 1, 1),
            expiry_date=datetime(2035, 1, 1),
            verification_status="Đã xác thực",
        )
    )
    db_session.add(
        Store(
            store_id=100,
            owner_id=10,
            city_id=1,
            store_name="Config Store",
            address="Đà Nẵng",
            business_license="BL-CFG",
            status="Đã duyệt",
        )
    )
    db_session.flush()
    db_session.add(
        Vehicle(
            vehicle_id=100,
            store_id=100,
            brand="Honda",
            model="SH",
            license_plate="43A-CFG01",
            type="Xe tay ga",
            status="Sẵn sàng",
        )
    )
    db_session.flush()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db_session.add(
        PriceTable(
            price_id=100,
            vehicle_id=100,
            amount=Decimal("200000"),
            price_type="Ngày",
            effective_from=now - timedelta(days=1),
            effective_to=now + timedelta(days=365),
        )
    )
    db_session.commit()

    # Update all 4 config areas to non-default values
    update_system_config(
        db_session,
        SystemConfigUpdateSchema(
            commission_rate=Decimal("18.00"),
            hold_time_minutes=30,
            cancel_full_refund_hours=Decimal("48.00"),
            cancel_full_refund_rate=Decimal("90.00"),
            cancel_partial_refund_hours=Decimal("12.00"),
            cancel_partial_refund_rate=Decimal("40.00"),
            cancel_late_refund_rate=Decimal("10.00"),
        ),
    )

    # 1. Reconciliation reads updated 18% commission rate
    assert get_commission_rate(db_session) == Decimal("18.00")

    # 2. Store SLA & Order creation both read updated 30-minute hold time
    assert get_confirmation_timeout_minutes(db_session) == 30
    order = create_rental_order(
        db_session,
        OrderCreateSchema(
            renter_id=20,
            vehicle_id=100,
            price_id=100,
            start_time=now + timedelta(hours=30),
            end_time=now + timedelta(hours=78),
        ),
    )
    delta_minutes = round((order.confirmation_deadline - order.created_at).total_seconds() / 60)
    assert delta_minutes == 30

    # 3. Cancellation policy reads updated tiers:
    # 30h before pickup falls between 12h and 48h -> 40% refund (NOT default 100%)
    order.order_status = "Đã xác nhận"
    db_session.commit()
    preview = preview_order_cancellation(db_session, order.order_id, renter_id=20, now_utc=now)
    assert Decimal(str(preview["refund_rate"])) == Decimal("40.00")

    # 5h before pickup (< 12h) -> 10% late refund (NOT default 0%)
    late_res = calculate_refund_br04(
        start_time=now + timedelta(hours=5),
        deposit_amount=Decimal("200000"),
        cancelled_at=now,
        order_status="Đã xác nhận",
        db=db_session,
    )
    assert late_res["refund_rate"] == Decimal("10.00")
    assert late_res["refund_amount"] == Decimal("20000.00")


def test_api_system_config_and_late_return_fee_rbac_and_flow():
    from fastapi.testclient import TestClient
    from app.core.security import create_access_token
    from app.database.database import get_db
    from app.main import app
    from app.models.city import City
    from app.models.order import Order
    from app.models.price_table import PriceTable
    from app.models.role import Role
    from app.models.store import Store
    from app.models.user import User
    from app.models.user_role import UserRole
    from app.models.vehicle import Vehicle

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
        db.add_all([
            Role(role_id=1, role_name="Admin", description="Admin"),
            Role(role_id=2, role_name="Khách hàng", description="Customer"),
            Role(role_id=3, role_name="Nhân viên", description="Staff"),
            Role(role_id=4, role_name="Chủ cửa hàng", description="Store Owner"),
        ])
        db.add(City(city_id=1, city_name="Đà Nẵng"))
        db.add_all([
            User(user_id=1, fullname="Admin", email="admin@sys.local", status="Hoạt động"),
            User(user_id=2, fullname="Renter", email="renter@sys.local", status="Hoạt động"),
            User(user_id=3, fullname="Staff", email="staff@sys.local", status="Hoạt động"),
            User(user_id=4, fullname="Owner", email="owner@sys.local", status="Hoạt động"),
            User(user_id=5, fullname="Other", email="other@sys.local", status="Hoạt động"),
        ])
        db.flush()
        db.add_all([
            UserRole(user_id=1, role_id=1),
            UserRole(user_id=2, role_id=2),
            UserRole(user_id=3, role_id=3),
            UserRole(user_id=4, role_id=4),
            UserRole(user_id=5, role_id=2),
        ])
        db.add(Store(store_id=10, owner_id=4, city_id=1, store_name="S1", address="A", business_license="BL1", status="Đã duyệt"))
        db.flush()
        db.add(Vehicle(vehicle_id=100, store_id=10, brand="Honda", model="Lead", license_plate="43A-SYS01", type="Xe tay ga", status="Sẵn sàng"))
        db.flush()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(PriceTable(price_id=100, vehicle_id=100, amount=Decimal("150000"), price_type="Ngày", effective_from=now - timedelta(days=1), effective_to=now + timedelta(days=365)))
        expected_end = datetime(2026, 11, 26, 12, 0, 0)
        db.add(Order(
            order_id=500,
            renter_id=2,
            vehicle_id=100,
            price_id=100,
            start_time=datetime(2026, 11, 25, 12, 0, 0),
            end_time=expected_end,
            delivery_method="Nhận tại cửa hàng",
            rental_amount=Decimal("150000"),
            deposit_amount=Decimal("45000"),
            remaining_amount=Decimal("105000"),
            total_amount=Decimal("150000"),
            order_status="Đang thuê",
            created_at=now,
        ))
        db.commit()

        def _h(uid: int, email: str, rid: int) -> dict:
            t = create_access_token({"sub": email, "email": email, "user_id": uid, "role_id": [rid]})
            return {"Authorization": f"Bearer {t}"}

        client = TestClient(app)

        # 1. Public GET /system-config returns defaults
        r_get = client.get("/system-config")
        assert r_get.status_code == 200
        assert r_get.json()["data"]["commission_rate"] == 12.0
        assert r_get.json()["data"]["hold_time_minutes"] == 15
        assert r_get.json()["data"]["late_return_fee_per_hour"] == 50000.0

        # 2. PUT /admin/system-config rejects unauthenticated (401) and non-admin (403)
        payload = {
            "commission_rate": 14.5,
            "hold_time_minutes": 20,
            "cancel_full_refund_hours": 36,
            "cancel_full_refund_rate": 95,
            "cancel_partial_refund_hours": 10,
            "cancel_partial_refund_rate": 45,
            "cancel_late_refund_rate": 5,
            "late_return_grace_minutes": 20,
            "late_return_fee_per_hour": 60000,
        }
        assert client.put("/admin/system-config", json=payload).status_code == 401
        assert client.put("/admin/system-config", headers=_h(2, "renter@sys.local", 2), json=payload).status_code == 403
        assert client.put("/admin/system-config", headers=_h(3, "staff@sys.local", 3), json=payload).status_code == 403
        assert client.put("/admin/system-config", headers=_h(4, "owner@sys.local", 4), json=payload).status_code == 403

        # 3. Admin updates config -> 200
        r_put = client.put("/admin/system-config", headers=_h(1, "admin@sys.local", 1), json=payload)
        assert r_put.status_code == 200
        assert r_put.json()["data"]["commission_rate"] == 14.5
        assert r_put.json()["data"]["hold_time_minutes"] == 20
        assert r_put.json()["data"]["late_return_grace_minutes"] == 20
        assert r_put.json()["data"]["late_return_fee_per_hour"] == 60000.0

        # 4. Late return fee calculation API: 401 unauth, 403 unrelated customer, 200 renter/owner/staff
        actual_return = (expected_end + timedelta(minutes=85)).isoformat()  # 85m late - 20m grace = 65m => 2h * 60,000 = 120,000
        assert client.post("/orders/500/late-fee/calculate", json={"actual_return_time": actual_return}).status_code == 401
        assert client.post(
            "/orders/500/late-fee/calculate",
            headers=_h(5, "other@sys.local", 2),
            json={"actual_return_time": actual_return},
        ).status_code == 403

        r_late = client.post(
            "/orders/500/late-fee/calculate",
            headers=_h(2, "renter@sys.local", 2),
            json={"actual_return_time": actual_return},
        )
        assert r_late.status_code == 200
        late_data = r_late.json()["data"]
        assert late_data["late_minutes"] == 85
        assert late_data["grace_minutes"] == 20
        assert late_data["billable_late_hours"] == 2
        assert late_data["late_fee"] == 120000.0
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides = prev_overrides


