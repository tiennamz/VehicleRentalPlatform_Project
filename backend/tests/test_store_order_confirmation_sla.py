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
from app.services.store_order_confirmation_services import (
    STATUS_CONFIRMED,
    STATUS_ESCALATED_OPERATOR,
    STATUS_PENDING_CONFIRMATION,
    STATUS_REJECTED,
    confirm_store_order,
    escalate_overdue_orders,
    reject_store_order,
)


def _setup_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    city = City(city_id=1, city_name="Vũng Tàu")
    owner1 = User(user_id=10, fullname="Chủ Cửa Hàng A", email="owner_a@vrp.vn", phone_number="0901000001")
    owner2 = User(user_id=11, fullname="Chủ Cửa Hàng B", email="owner_b@vrp.vn", phone_number="0901000002")
    renter = User(user_id=20, fullname="Nguyễn Văn Khách", email="khach@vrp.vn", phone_number="0909888777")
    store1 = Store(store_id=100, owner_id=10, city_id=1, store_name="Cửa hàng Minh Thư", status="Đã duyệt")
    store2 = Store(store_id=101, owner_id=11, city_id=1, store_name="Cửa hàng Biển Xanh", status="Đã duyệt")
    vehicle1 = Vehicle(
        vehicle_id=200,
        store_id=100,
        brand="Honda",
        model="Vision 2024",
        license_plate="72A1-12345",
        type="Xe tay ga",
        status="Sẵn sàng",
    )
    price1 = PriceTable(price_id=300, vehicle_id=200, amount=Decimal("150000.00"))
    db.add_all([city, owner1, owner2, renter, store1, store2, vehicle1, price1])
    db.commit()
    return db, SessionLocal


def _create_order(db, *, minutes_ago: int, status: str = STATUS_PENDING_CONFIRMATION) -> Order:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    created_at = now - timedelta(minutes=minutes_ago)
    deadline = created_at + timedelta(minutes=15)
    order = Order(
        renter_id=20,
        vehicle_id=200,
        price_id=300,
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=3),
        delivery_method="Nhận tại cửa hàng",
        rental_amount=Decimal("300000.00"),
        delivery_fee=Decimal("0.00"),
        total_amount=Decimal("300000.00"),
        deposit_amount=Decimal("200000.00"),
        remaining_amount=Decimal("100000.00"),
        order_status=status,
        created_at=created_at,
        confirmation_deadline=deadline,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_store_confirms_order_within_15_minutes():
    db, _ = _setup_db()
    order = _create_order(db, minutes_ago=5)

    updated = confirm_store_order(db, order_id=order.order_id, owner_id=10)
    assert updated.order_status == STATUS_CONFIRMED
    assert updated.store_responded_at is not None
    assert updated.escalated_at is None
    db.close()


def test_store_rejects_order_with_reason_within_15_minutes():
    db, _ = _setup_db()
    order = _create_order(db, minutes_ago=8)

    updated = reject_store_order(
        db,
        order_id=order.order_id,
        owner_id=10,
        rejection_reason="Xe đang bảo trì phanh đột xuất",
    )
    assert updated.order_status == STATUS_REJECTED
    assert updated.rejection_reason == "Xe đang bảo trì phanh đột xuất"
    assert updated.store_responded_at is not None
    db.close()


def test_late_confirmation_auto_escalates_to_operator_and_returns_409():
    db, _ = _setup_db()
    overdue_order = _create_order(db, minutes_ago=16)

    with pytest.raises(Exception) as exc_info:
        confirm_store_order(db, order_id=overdue_order.order_id, owner_id=10)
    assert getattr(exc_info.value, "status_code", None) == 409

    db.refresh(overdue_order)
    assert overdue_order.order_status == STATUS_ESCALATED_OPERATOR
    assert overdue_order.escalated_at is not None
    db.close()


def test_other_store_owner_cannot_confirm_or_reject_returns_403():
    db, _ = _setup_db()
    order = _create_order(db, minutes_ago=3)

    with pytest.raises(Exception) as exc_info:
        confirm_store_order(db, order_id=order.order_id, owner_id=11)
    assert getattr(exc_info.value, "status_code", None) == 403
    db.close()


def test_escalate_overdue_orders_sweeps_only_expired_pending():
    db, _ = _setup_db()
    fresh_order = _create_order(db, minutes_ago=4)
    expired_order = _create_order(db, minutes_ago=20)

    escalated = escalate_overdue_orders(db)
    assert len(escalated) == 1
    assert escalated[0].order_id == expired_order.order_id
    assert escalated[0].order_status == STATUS_ESCALATED_OPERATOR

    db.refresh(fresh_order)
    assert fresh_order.order_status == STATUS_PENDING_CONFIRMATION
    db.close()


def test_api_store_orders_confirm_reject_and_operator_escalation():
    db, SessionLocal = _setup_db()
    order_confirm = _create_order(db, minutes_ago=2)
    order_reject = _create_order(db, minutes_ago=4)
    order_overdue = _create_order(db, minutes_ago=18)

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

        owner_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': 'owner_a@vrp.vn', 'email': 'owner_a@vrp.vn', 'user_id': 10, 'role_id': [4]})}"
        }
        op_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': 'owner_a@vrp.vn', 'email': 'owner_a@vrp.vn', 'user_id': 10, 'role_id': [3]})}"
        }

        # 1. GET /stores/orders auto-escalates overdue orders
        res_list = client.get("/stores/orders", params={"store_id": 100}, headers=owner_headers)
        assert res_list.status_code == 200
        rows = {item["order_id"]: item for item in res_list.json()["data"]}
        assert rows[order_overdue.order_id]["order_status"] == STATUS_ESCALATED_OPERATOR
        assert rows[order_confirm.order_id]["remaining_seconds"] > 0

        # 2. Confirm within 15 min
        res_confirm = client.post(
            f"/stores/orders/{order_confirm.order_id}/confirm",
            headers=owner_headers,
        )
        assert res_confirm.status_code == 200
        assert res_confirm.json()["data"]["order_status"] == STATUS_CONFIRMED

        # 3. Reject without reason -> 422
        res_bad_reject = client.post(
            f"/stores/orders/{order_reject.order_id}/reject",
            headers=owner_headers,
            json={"rejection_reason": "  "},
        )
        assert res_bad_reject.status_code == 422

        # 4. Reject with valid reason -> 200
        res_reject = client.post(
            f"/stores/orders/{order_reject.order_id}/reject",
            headers=owner_headers,
            json={"rejection_reason": "Trùng lịch thuê trực tiếp tại cửa hàng"},
        )
        assert res_reject.status_code == 200
        assert res_reject.json()["data"]["order_status"] == STATUS_REJECTED
        assert res_reject.json()["data"]["rejection_reason"] == "Trùng lịch thuê trực tiếp tại cửa hàng"

        # 5. Late reject on already-escalated order -> 409
        res_late = client.post(
            f"/stores/orders/{order_overdue.order_id}/reject",
            headers=owner_headers,
            json={"rejection_reason": "Quá hạn nhưng vẫn bấm từ chối"},
        )
        assert res_late.status_code == 409

        # 6. Operator endpoint returns escalated orders
        res_op = client.get("/operator/orders/escalated", headers=op_headers)
        assert res_op.status_code == 200
        op_ids = [item["order_id"] for item in res_op.json()["data"]]
        assert order_overdue.order_id in op_ids
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_booking_blocked_when_vehicle_status_rented_and_released_after_rejection():
    from datetime import date
    from app.models.drivers_license import DriverLicense
    from app.schemas.booking_eligibility_schemas import OrderCreateSchema
    from app.services.booking_eligibility_services import create_rental_order

    db, _ = _setup_db()
    # Cập nhật đủ tuổi 18+ và GPLX hợp lệ cho khách thuê
    renter = db.query(User).filter(User.user_id == 20).first()
    renter.date_of_birth = date(1998, 5, 10)
    db.add(
        DriverLicense(
            user_id=20,
            license_number="720199800001",
            license_class="A1",
            verification_status="Đã xác thực",
            expiry_date=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=365),
        )
    )
    db.commit()

    start_t = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2)
    end_t = start_t + timedelta(days=2)

    # 1. Xe đang có trạng thái vật lý 'Đang thuê' -> chặn tạo đơn (409)
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == 200).first()
    vehicle.status = "Đang thuê"
    db.commit()
    with pytest.raises(Exception) as exc_rented:
        create_rental_order(
            db,
            OrderCreateSchema(
                renter_id=20,
                vehicle_id=200,
                start_time=start_t,
                end_time=end_t,
                delivery_method="Nhận tại cửa hàng",
            ),
        )
    assert getattr(exc_rented.value, "status_code", None) == 409

    # 2. Mở lại xe 'Sẵn sàng', tạo đơn 1 -> bị cửa hàng từ chối -> lịch được giải phóng để đặt đơn 2
    vehicle.status = "Sẵn sàng"
    db.commit()
    order1 = create_rental_order(
        db,
        OrderCreateSchema(
            renter_id=20,
            vehicle_id=200,
            start_time=start_t,
            end_time=end_t,
            delivery_method="Nhận tại cửa hàng",
        ),
    )
    reject_store_order(db, order_id=order1.order_id, owner_id=10, rejection_reason="Xe cần kiểm tra nhanh")

    order2 = create_rental_order(
        db,
        OrderCreateSchema(
            renter_id=20,
            vehicle_id=200,
            start_time=start_t,
            end_time=end_t,
            delivery_method="Nhận tại cửa hàng",
        ),
    )
    assert order2.order_id != order1.order_id
    db.close()
