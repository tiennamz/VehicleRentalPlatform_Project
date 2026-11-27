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
from app.models.transaction import Transaction
from app.models.user import User
from app.models.vehicle import Vehicle
from app.services.order_cancellation_history_services import (
    calculate_refund_br04,
    cancel_order_with_br04,
    list_customer_orders,
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
    owner = User(user_id=10, fullname="Chủ Cửa Hàng", email="store@vrp.vn", phone_number="0901000010")
    renter1 = User(user_id=20, fullname="Nguyễn Văn A", email="a@vrp.vn", phone_number="0909000020")
    renter2 = User(user_id=21, fullname="Trần Thị B", email="b@vrp.vn", phone_number="0909000021")
    store = Store(store_id=100, owner_id=10, city_id=1, store_name="VRP Đà Nẵng", status="Đã duyệt")
    vehicle = Vehicle(
        vehicle_id=200,
        store_id=100,
        brand="Honda",
        model="Vision 2024",
        license_plate="43A1-99999",
        type="Xe tay ga",
        status="Sẵn sàng",
    )
    price = PriceTable(price_id=300, vehicle_id=200, amount=Decimal("200000.00"))
    db.add_all([city, owner, renter1, renter2, store, vehicle, price])
    db.commit()
    return db, SessionLocal


def _seed_order(
    db,
    *,
    renter_id: int = 20,
    hours_until_pickup: float = 30.0,
    order_status: str = "Đã xác nhận",
    deposit_amount: Decimal = Decimal("400000.00"),
) -> Order:
    """Tạo nhanh đơn thuê mẫu cách thời điểm nhận xe đúng hours_until_pickup giờ."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_time = now + timedelta(hours=hours_until_pickup)
    end_time = start_time + timedelta(days=2)
    order = Order(
        renter_id=renter_id,
        vehicle_id=200,
        price_id=300,
        start_time=start_time,
        end_time=end_time,
        delivery_method="Nhận tại cửa hàng",
        rental_amount=Decimal("400000.00"),
        delivery_fee=Decimal("0.00"),
        deposit_amount=deposit_amount,
        remaining_amount=Decimal("0.00"),
        total_amount=Decimal("400000.00"),
        order_status=order_status,
        created_at=now - timedelta(hours=1),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_calculate_refund_br04_exact_boundaries():
    """Kiểm tra chính xác cả 3 mốc và các điểm biên 24h, 6h của quy tắc hoàn cọc BR-04."""
    now = datetime(2026, 11, 25, 10, 0, 0)
    deposit = Decimal("500000.00")

    # >= 24 giờ (30h và đúng biên 24h) -> hoàn 100%
    r_30h = calculate_refund_br04(now + timedelta(hours=30), deposit, cancelled_at=now)
    assert r_30h["refund_rate"] == Decimal("100.00")
    assert r_30h["refund_amount"] == Decimal("500000.00")

    r_24h = calculate_refund_br04(now + timedelta(hours=24), deposit, cancelled_at=now)
    assert r_24h["refund_rate"] == Decimal("100.00")
    assert r_24h["refund_amount"] == Decimal("500000.00")

    # Từ 6 đến dưới 24 giờ (12h và đúng biên 6h) -> hoàn 50%
    r_12h = calculate_refund_br04(now + timedelta(hours=12), deposit, cancelled_at=now)
    assert r_12h["refund_rate"] == Decimal("50.00")
    assert r_12h["refund_amount"] == Decimal("250000.00")

    r_6h = calculate_refund_br04(now + timedelta(hours=6), deposit, cancelled_at=now)
    assert r_6h["refund_rate"] == Decimal("50.00")
    assert r_6h["refund_amount"] == Decimal("250000.00")

    # Dưới 6 giờ (5h59p và 2h) -> hoàn 0%
    r_under6 = calculate_refund_br04(now + timedelta(hours=5, minutes=59), deposit, cancelled_at=now)
    assert r_under6["refund_rate"] == Decimal("0.00")
    assert r_under6["refund_amount"] == Decimal("0.00")


def test_cancel_order_creates_refund_transaction_and_blocks_unauthorized_or_completed():
    """Kiểm tra hủy đơn tạo giao dịch hoàn tiền, chặn người khác hủy (403) và chặn đơn đã hoàn thành (409)."""
    db, _ = _setup_db()
    order_50 = _seed_order(db, renter_id=20, hours_until_pickup=12.0, deposit_amount=Decimal("400000.00"))
    order_done = _seed_order(db, renter_id=20, hours_until_pickup=-24.0, order_status="Hoàn thành")

    # Người khác cố hủy đơn -> 403
    with pytest.raises(Exception) as exc_403:
        cancel_order_with_br04(db, order_id=order_50.order_id, renter_id=21, cancel_reason="Hủy nhầm")
    assert getattr(exc_403.value, "status_code", None) == 403

    # Hủy đơn đã hoàn thành -> 409
    with pytest.raises(Exception) as exc_409:
        cancel_order_with_br04(db, order_id=order_done.order_id, renter_id=20, cancel_reason="Hủy muộn")
    assert getattr(exc_409.value, "status_code", None) == 409

    # Chính chủ hủy trước 12h -> hoàn 50% (200.000đ) và ghi giao dịch hoàn tiền
    cancelled = cancel_order_with_br04(
        db,
        order_id=order_50.order_id,
        renter_id=20,
        cancel_reason="Đổi lịch công tác đột xuất",
    )
    assert cancelled.order_status == "Đã hủy"
    assert cancelled.refund_rate == Decimal("50.00")
    assert cancelled.refund_amount == Decimal("200000.00")
    assert cancelled.cancel_reason == "Đổi lịch công tác đột xuất"

    tx = db.query(Transaction).filter(Transaction.order_id == order_50.order_id).first()
    assert tx is not None
    assert tx.amount == Decimal("200000.00")
    assert tx.transaction_type == "Hoàn cọc BR-04"
    db.close()


def test_api_cancel_preview_cancel_and_customer_order_history():
    """Kiểm tra API xem trước hoàn cọc BR-04, hủy đơn và lọc danh sách đơn + lịch sử."""
    db, SessionLocal = _setup_db()
    order_active = _seed_order(db, renter_id=20, hours_until_pickup=30.0, order_status="Đã xác nhận", deposit_amount=Decimal("300000.00"))
    order_history = _seed_order(db, renter_id=20, hours_until_pickup=-48.0, order_status="Hoàn thành", deposit_amount=Decimal("200000.00"))

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

        renter_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': 'a@vrp.vn', 'email': 'a@vrp.vn', 'user_id': 20, 'role_id': [2]})}"
        }

        # 1. Xem trước hoàn cọc BR-04 (trước 30h -> 100%)
        res_preview = client.get(
            f"/orders/{order_active.order_id}/cancel-preview",
            headers=renter_headers,
        )
        assert res_preview.status_code == 200
        preview_data = res_preview.json()["data"]
        assert preview_data["refund_rate"] == 100.0
        assert preview_data["refund_amount"] == 300000.0

        # 2. Danh sách đơn hiện tại (scope=active) chỉ gồm order_active
        res_active = client.get("/orders/my", params={"scope": "active"}, headers=renter_headers)
        assert res_active.status_code == 200
        active_ids = [o["order_id"] for o in res_active.json()["data"]["orders"]]
        assert active_ids == [order_active.order_id]

        # 3. Hủy đơn order_active -> hoàn 100% cọc (300.000đ)
        res_cancel = client.post(
            f"/orders/{order_active.order_id}/cancel",
            headers=renter_headers,
            json={"cancel_reason": "Thay đổi kế hoạch du lịch"},
        )
        assert res_cancel.status_code == 200
        cancel_data = res_cancel.json()["data"]
        assert cancel_data["order_status"] == "Đã hủy"
        assert cancel_data["refund_rate"] == 100.0
        assert cancel_data["refund_amount"] == 300000.0

        # 4. Lịch sử đơn (scope=history) gồm cả order_active (đã hủy) và order_history (hoàn thành), có timeline sự kiện
        res_hist = client.get("/orders/my", params={"scope": "history"}, headers=renter_headers)
        assert res_hist.status_code == 200
        hist_payload = res_hist.json()["data"]
        hist_ids = {o["order_id"] for o in hist_payload["orders"]}
        assert hist_ids == {order_active.order_id, order_history.order_id}
        assert hist_payload["summary"]["cancelled"] == 1
        assert hist_payload["summary"]["completed"] == 1
        assert hist_payload["summary"]["total_refunded"] == 300000.0
        cancelled_item = next(o for o in hist_payload["orders"] if o["order_id"] == order_active.order_id)
        assert len(cancelled_item["history_events"]) >= 2
    finally:
        app.dependency_overrides.clear()
        db.close()
