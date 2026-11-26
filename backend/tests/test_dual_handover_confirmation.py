from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.main import app
from app.models.city import City
from app.models.order import Order
from app.models.price_table import PriceTable
from app.models.store import Store
from app.models.user import User
from app.models.vehicle import Vehicle
from app.services.handover_confirmation_services import (
    STATUS_ACTIVE_RENTAL,
    STATUS_CONFIRMED,
    customer_confirm_handover,
    staff_confirm_handover,
)


def _setup_db():
    """Khởi tạo DB SQLite trong bộ nhớ cùng dữ liệu mẫu cửa hàng, xe và khách thuê."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    city = City(city_id=1, city_name="Đà Nẵng")
    owner1 = User(user_id=10, fullname="Nhân Viên Cửa Hàng A", email="nv_a@vrp.vn", phone_number="0901000010")
    owner2 = User(user_id=11, fullname="Nhân Viên Cửa Hàng B", email="nv_b@vrp.vn", phone_number="0901000011")
    renter = User(user_id=20, fullname="Khách Thuê B", email="khach@vrp.vn", phone_number="0909000020")
    other_renter = User(user_id=21, fullname="Khách Khác", email="khach2@vrp.vn", phone_number="0909000021")
    store1 = Store(store_id=100, owner_id=10, city_id=1, store_name="VRP Đà Nẵng", status="Đã duyệt")
    store2 = Store(store_id=101, owner_id=11, city_id=1, store_name="VRP Hội An", status="Đã duyệt")
    vehicle1 = Vehicle(
        vehicle_id=200,
        store_id=100,
        brand="Honda",
        model="Vision 2024",
        license_plate="43A1-11111",
        type="Xe tay ga",
        status="Sẵn sàng",
    )
    price1 = PriceTable(price_id=300, vehicle_id=200, amount=Decimal("150000.00"))
    db.add_all([city, owner1, owner2, renter, other_renter, store1, store2, vehicle1, price1])
    db.commit()
    return db, SessionLocal


def _seed_order(db, *, order_status: str = STATUS_CONFIRMED) -> Order:
    """Tạo nhanh đơn thuê mẫu ở trạng thái cho trước."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    order = Order(
        renter_id=20,
        vehicle_id=200,
        price_id=300,
        start_time=now + timedelta(hours=2),
        end_time=now + timedelta(days=2),
        delivery_method="Nhận tại cửa hàng",
        rental_amount=Decimal("300000.00"),
        delivery_fee=Decimal("0.00"),
        deposit_amount=Decimal("200000.00"),
        remaining_amount=Decimal("100000.00"),
        total_amount=Decimal("300000.00"),
        order_status=order_status,
        created_at=now - timedelta(hours=1),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_only_staff_confirm_keeps_order_confirmed_until_customer_confirms():
    """Chỉ nhân viên xác nhận -> đơn CHƯA sang Đang thuê; khách xác nhận tiếp -> mới sang Đang thuê."""
    db, _ = _setup_db()
    order = _seed_order(db, order_status=STATUS_CONFIRMED)

    step1 = staff_confirm_handover(db, order_id=order.order_id, staff_id=10, condition_note="Xe đầy xăng, đủ 2 mũ")
    assert step1["staff_confirmed"] is True
    assert step1["customer_confirmed"] is False
    assert step1["both_confirmed"] is False
    assert step1["waiting_for"] == "customer"
    assert step1["order_status"] == STATUS_CONFIRMED

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == 200).first()
    assert vehicle.status == "Sẵn sàng"

    step2 = customer_confirm_handover(db, order_id=order.order_id, renter_id=20, condition_note="Đã kiểm tra xe tốt")
    assert step2["staff_confirmed"] is True
    assert step2["customer_confirmed"] is True
    assert step2["both_confirmed"] is True
    assert step2["waiting_for"] is None
    assert step2["order_status"] == STATUS_ACTIVE_RENTAL

    db.refresh(vehicle)
    assert vehicle.status == STATUS_ACTIVE_RENTAL
    db.close()


def test_only_customer_confirm_keeps_order_confirmed_until_staff_confirms():
    """Chỉ khách hàng xác nhận -> đơn CHƯA sang Đang thuê; nhân viên xác nhận tiếp -> mới sang Đang thuê."""
    db, _ = _setup_db()
    order = _seed_order(db, order_status=STATUS_CONFIRMED)

    step1 = customer_confirm_handover(db, order_id=order.order_id, renter_id=20)
    assert step1["customer_confirmed"] is True
    assert step1["staff_confirmed"] is False
    assert step1["both_confirmed"] is False
    assert step1["waiting_for"] == "staff"
    assert step1["order_status"] == STATUS_CONFIRMED

    step2 = staff_confirm_handover(db, order_id=order.order_id, staff_id=10)
    assert step2["both_confirmed"] is True
    assert step2["order_status"] == STATUS_ACTIVE_RENTAL
    db.close()


def test_role_guard_and_invalid_order_status_blocked():
    """Kiểm tra phân quyền chặt 2 role (403) và chặn đơn chưa Đã xác nhận (409)."""
    db, _ = _setup_db()
    order = _seed_order(db, order_status=STATUS_CONFIRMED)
    unconfirmed_order = _seed_order(db, order_status="Chờ thanh toán")

    # Khách thuê không được tự bấm xác nhận thay nhân viên -> 403
    with pytest.raises(Exception) as exc_staff_403:
        staff_confirm_handover(db, order_id=order.order_id, staff_id=20)
    assert getattr(exc_staff_403.value, "status_code", None) == 403

    # Nhân viên cửa hàng khác không được bấm xác nhận -> 403
    with pytest.raises(Exception) as exc_other_store:
        staff_confirm_handover(db, order_id=order.order_id, staff_id=11)
    assert getattr(exc_other_store.value, "status_code", None) == 403

    # Khách khác không được bấm xác nhận nhận xe thay chủ đơn -> 403
    with pytest.raises(Exception) as exc_cust_403:
        customer_confirm_handover(db, order_id=order.order_id, renter_id=21)
    assert getattr(exc_cust_403.value, "status_code", None) == 403

    # Đơn chưa ở trạng thái Đã xác nhận -> 409
    with pytest.raises(Exception) as exc_409:
        staff_confirm_handover(db, order_id=unconfirmed_order.order_id, staff_id=10)
    assert getattr(exc_409.value, "status_code", None) == 409
    db.close()


def test_api_dual_handover_confirmation_flow():
    """Kiểm tra toàn luồng API GET handover + staff-confirm + customer-confirm."""
    db, SessionLocal = _setup_db()
    order = _seed_order(db, order_status=STATUS_CONFIRMED)

    def override_get_db():
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app)
        from app.core.security import create_access_token

        staff_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': 'nv_a@vrp.vn', 'email': 'nv_a@vrp.vn', 'user_id': 10, 'role_id': [4]})}"
        }
        renter_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': 'khach@vrp.vn', 'email': 'khach@vrp.vn', 'user_id': 20, 'role_id': [2]})}"
        }

        # 1. Xem trạng thái ban đầu: chưa bên nào xác nhận
        r0 = client.get(f"/orders/{order.order_id}/handover", headers=renter_headers)
        assert r0.status_code == 200
        assert r0.json()["data"]["both_confirmed"] is False
        assert r0.json()["data"]["order_status"] == STATUS_CONFIRMED

        # 2. Nhân viên xác nhận -> vẫn Đã xác nhận
        r1 = client.post(
            f"/orders/{order.order_id}/handover/staff-confirm",
            headers=staff_headers,
            json={"condition_note": "Đầy xăng, không trầy xước"},
        )
        assert r1.status_code == 200
        assert r1.json()["data"]["staff_confirmed"] is True
        assert r1.json()["data"]["order_status"] == STATUS_CONFIRMED

        # 3. Khách xác nhận -> chuyển sang Đang thuê
        r2 = client.post(
            f"/orders/{order.order_id}/handover/customer-confirm",
            headers=renter_headers,
            json={"condition_note": "Đồng ý tình trạng xe"},
        )
        assert r2.status_code == 200
        assert r2.json()["data"]["both_confirmed"] is True
        assert r2.json()["data"]["order_status"] == STATUS_ACTIVE_RENTAL
    finally:
        app.dependency_overrides.clear()
        db.close()
