import pytest
from app.core.security import hash_password, verify_password
from app.models.user import User


def test_bcrypt_hash_password_uses_random_salt_and_verifies():
    h1 = hash_password("StrongPass@2026")
    h2 = hash_password("StrongPass@2026")
    assert h1 != h2
    assert h1.startswith(("$2b$", "$2a$", "$scrypt$"))
    assert "StrongPass@2026" not in h1
    assert verify_password("StrongPass@2026", h1) is True
    assert verify_password("WrongPass@2026", h1) is False


def test_bcrypt_password_edge_cases():
    with pytest.raises(ValueError):
        hash_password("")
    with pytest.raises(ValueError):
        hash_password("   ")
    with pytest.raises(ValueError):
        hash_password("a" * 73)
    assert verify_password("StrongPass@2026", "not-a-valid-bcrypt-hash") is False
    assert verify_password("", "$2b$12$invalid") is False


def test_user_model_does_not_store_plaintext_password_column():
    column_names = set(User.__table__.columns.keys())
    assert "password" not in column_names
    assert "plain_password" not in column_names


def test_middleware_role_helpers_identify_admin_and_operator():
    from types import SimpleNamespace
    from dependencies.middleware import (
        RoleID,
        check_operator,
        get_user_role_ids,
        is_admin,
        is_operator,
    )

    assert callable(check_operator)

    admin_user = SimpleNamespace(user_id=1, user_roles=[SimpleNamespace(role_id=RoleID.ADMIN)])
    staff_user = SimpleNamespace(user_id=2, user_roles=[SimpleNamespace(role_id=RoleID.STAFF)])
    customer_user = SimpleNamespace(user_id=3, user_roles=[SimpleNamespace(role_id=RoleID.CUSTOMER)])
    owner_user = SimpleNamespace(user_id=4, user_roles=[SimpleNamespace(role_id=RoleID.STORE_OWNER)])

    assert get_user_role_ids(admin_user) == {RoleID.ADMIN}
    assert is_admin(admin_user) is True
    assert is_operator(admin_user) is True

    assert is_admin(staff_user) is False
    assert is_operator(staff_user) is True

    assert is_admin(customer_user) is False
    assert is_operator(customer_user) is False

    assert is_admin(owner_user) is False
    assert is_operator(owner_user) is False


def test_ensure_owner_or_roles_blocks_other_user_with_403():
    from types import SimpleNamespace
    from fastapi import HTTPException
    from dependencies.middleware import RoleID, ensure_owner_or_roles

    owner = SimpleNamespace(user_id=10, user_roles=[SimpleNamespace(role_id=RoleID.CUSTOMER)])
    other = SimpleNamespace(user_id=20, user_roles=[SimpleNamespace(role_id=RoleID.CUSTOMER)])
    admin = SimpleNamespace(user_id=1, user_roles=[SimpleNamespace(role_id=RoleID.ADMIN)])

    assert ensure_owner_or_roles(owner, 10, {RoleID.ADMIN}) is owner
    assert ensure_owner_or_roles(admin, 10, {RoleID.ADMIN}) is admin

    with pytest.raises(HTTPException) as exc_info:
        ensure_owner_or_roles(other, 10, {RoleID.ADMIN})
    assert exc_info.value.status_code == 403


# =========================================================
# API RBAC Matrix Tests (Task 5 & Task 6)
# =========================================================

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.database import Base, get_db
from app.main import app
from app.models.city import City
from app.models.drivers_license import DriverLicense
from app.models.order import Order
from app.models.price_table import PriceTable
from app.models.role import Role
from app.models.store import Store
from app.models.user_role import UserRole
from app.models.vehicle import Vehicle
from app.models.verifiable_information import VerifiableInformation


rbac_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
RbacSessionLocal = sessionmaker(bind=rbac_engine, autoflush=False, expire_on_commit=False)


def _override_rbac_db():
    db = RbacSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _make_headers(user_id: int, email: str, role_id: int) -> dict:
    token = create_access_token({
        "sub": email,
        "email": email,
        "user_id": user_id,
        "role_id": [role_id],
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def rbac_client():
    prev_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = _override_rbac_db
    Base.metadata.drop_all(bind=rbac_engine)
    Base.metadata.create_all(bind=rbac_engine)
    db = RbacSessionLocal()

    db.add_all([
        Role(role_id=1, role_name="Admin", description="Admin"),
        Role(role_id=2, role_name="Khách hàng", description="Customer"),
        Role(role_id=3, role_name="Nhân viên", description="Staff"),
        Role(role_id=4, role_name="Chủ cửa hàng", description="Store Owner"),
    ])
    db.add(City(city_id=1, city_name="Đà Nẵng"))
    users = [
        User(user_id=1, fullname="Admin", email="admin@rbac.local", status="Hoạt động"),
        User(user_id=2, fullname="Customer A", email="custa@rbac.local", date_of_birth=date(1998, 1, 1), status="Hoạt động"),
        User(user_id=3, fullname="Staff Op", email="staff@rbac.local", status="Hoạt động"),
        User(user_id=4, fullname="Owner A", email="ownera@rbac.local", status="Hoạt động"),
        User(user_id=5, fullname="Owner B", email="ownerb@rbac.local", status="Hoạt động"),
        User(user_id=6, fullname="Customer B", email="custb@rbac.local", date_of_birth=date(1997, 1, 1), status="Hoạt động"),
    ]
    db.add_all(users)
    db.flush()
    db.add_all([
        UserRole(user_id=1, role_id=1),
        UserRole(user_id=2, role_id=2),
        UserRole(user_id=3, role_id=3),
        UserRole(user_id=4, role_id=4),
        UserRole(user_id=5, role_id=4),
        UserRole(user_id=6, role_id=2),
    ])

    store_a = Store(store_id=10, owner_id=4, city_id=1, store_name="Store A", address="A", business_license="BL-A", status="Đã duyệt")
    store_b = Store(store_id=20, owner_id=5, city_id=1, store_name="Store B", address="B", business_license="BL-B", status="Đã duyệt")
    db.add_all([store_a, store_b])
    db.flush()

    veh_a = Vehicle(vehicle_id=100, store_id=10, model="AirBlade A", license_plate="43A-10001", type="Xe tay ga", brand="Honda", status="Sẵn sàng")
    veh_b = Vehicle(vehicle_id=200, store_id=20, model="Vision B", license_plate="43A-20001", type="Xe tay ga", brand="Honda", status="Sẵn sàng")
    db.add_all([veh_a, veh_b])
    db.flush()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    pt_a = PriceTable(price_id=100, vehicle_id=100, amount=Decimal("150000"), price_type="Ngày", effective_from=now - timedelta(days=1), effective_to=now + timedelta(days=365))
    pt_b = PriceTable(price_id=200, vehicle_id=200, amount=Decimal("140000"), price_type="Ngày", effective_from=now - timedelta(days=1), effective_to=now + timedelta(days=365))
    db.add_all([pt_a, pt_b])
    order_a = Order(
        order_id=1000,
        renter_id=2,
        vehicle_id=100,
        price_id=100,
        start_time=now + timedelta(days=2),
        end_time=now + timedelta(days=4),
        delivery_method="Nhận tại cửa hàng",
        rental_amount=Decimal("300000"),
        deposit_amount=Decimal("90000"),
        remaining_amount=Decimal("210000"),
        total_amount=Decimal("300000"),
        order_status="Chờ xác nhận",
        created_at=now,
        confirmation_deadline=now + timedelta(minutes=15),
    )
    order_b = Order(
        order_id=2000,
        renter_id=6,
        vehicle_id=200,
        price_id=200,
        start_time=now + timedelta(days=2),
        end_time=now + timedelta(days=4),
        delivery_method="Nhận tại cửa hàng",
        rental_amount=Decimal("280000"),
        deposit_amount=Decimal("84000"),
        remaining_amount=Decimal("196000"),
        total_amount=Decimal("280000"),
        order_status="Đã xác nhận",
        created_at=now,
        confirmation_deadline=now + timedelta(minutes=15),
    )
    db.add_all([order_a, order_b])
    db.commit()
    db.close()

    yield TestClient(app)

    Base.metadata.drop_all(bind=rbac_engine)
    app.dependency_overrides = prev_overrides


def test_rbac_admin_and_operator_endpoints_enforce_roles(rbac_client):
    h_admin = _make_headers(1, "admin@rbac.local", 1)
    h_cust = _make_headers(2, "custa@rbac.local", 2)
    h_staff = _make_headers(3, "staff@rbac.local", 3)
    h_owner_a = _make_headers(4, "ownera@rbac.local", 4)

    delivery_payload = {
        "allow_store_pickup": True,
        "allow_home_delivery": True,
        "max_delivery_radius_km": 15,
        "delivery_base_fee": 20000,
        "delivery_fee_per_km": 5000,
    }
    assert rbac_client.put("/admin/delivery-config", json=delivery_payload).status_code == 401
    assert rbac_client.put("/admin/delivery-config", headers=h_cust, json=delivery_payload).status_code == 403
    assert rbac_client.put("/admin/delivery-config", headers=h_staff, json=delivery_payload).status_code == 403
    assert rbac_client.put("/admin/delivery-config", headers=h_admin, json=delivery_payload).status_code == 200

    assert rbac_client.get("/operator/orders/escalated").status_code == 401
    assert rbac_client.get("/operator/orders/escalated", headers=h_cust).status_code == 403
    assert rbac_client.get("/operator/orders/escalated", headers=h_owner_a).status_code == 403
    assert rbac_client.get("/operator/orders/escalated", headers=h_staff).status_code == 200

    assert rbac_client.post("/reconciliation/weekly/generate").status_code == 401
    assert rbac_client.post("/reconciliation/weekly/generate", headers=h_owner_a).status_code == 403
    assert rbac_client.post("/reconciliation/weekly/generate", headers=h_admin).status_code == 200


def test_rbac_customer_idor_and_store_owner_cross_store_blocked(rbac_client):
    h_cust_a = _make_headers(2, "custa@rbac.local", 2)
    h_owner_a = _make_headers(4, "ownera@rbac.local", 4)
    h_owner_b = _make_headers(5, "ownerb@rbac.local", 5)

    # Customer A cannot read Customer B's order or list Customer B's orders
    assert rbac_client.get("/orders/2000").status_code == 401
    assert rbac_client.get("/orders/2000", headers=h_cust_a).status_code == 403
    assert rbac_client.get("/orders/my?renter_id=6", headers=h_cust_a).status_code == 403
    assert rbac_client.get("/orders/1000", headers=h_cust_a).status_code == 200

    # Store Owner A cannot confirm Store B's order, confirm handover on Store B's order, or view Store B's reconciliation
    assert rbac_client.post("/stores/orders/2000/confirm", headers=h_owner_a).status_code == 403
    assert rbac_client.post("/orders/2000/handover/staff-confirm", headers=h_owner_a).status_code == 403
    assert rbac_client.get("/stores/20/reconciliation/weekly", headers=h_owner_a).status_code == 403
    assert rbac_client.get("/stores/20/reconciliation/weekly", headers=h_owner_b).status_code == 200


def test_all_protected_routes_require_authentication():
    """Tự động quét toàn bộ app.routes: mọi endpoint ngoài danh sách public bắt buộc có JWT dependency."""
    from fastapi.routing import APIRoute

    public_whitelist = {
        ("GET", "/health/check"),
        ("GET", "/firebase"),
        ("POST", "/auth/register"),
        ("POST", "/auth/login"),
        ("GET", "/vehicles"),
        ("GET", "/stores/public"),
        ("GET", "/delivery-config"),
        ("POST", "/delivery-config/calculate-fee"),
        ("GET", "/system-config"),
        ("POST", "/orders/calculate"),
    }

    def _collect_dep_names(dependant) -> set[str]:
        names = set()
        if dependant.call is not None:
            names.add(getattr(dependant.call, "__name__", ""))
        for sub in getattr(dependant, "dependencies", []):
            names.update(_collect_dep_names(sub))
        return names

    unprotected = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in route.methods:
            if (method, route.path) in public_whitelist:
                continue
            dep_names = _collect_dep_names(route.dependant)
            if not dep_names.intersection({"get_current_user", "role_checker", "_get_token"}):
                unprotected.append(f"{method} {route.path}")

    assert unprotected == [], f"Phát hiện endpoint chưa có xác thực JWT: {unprotected}"



