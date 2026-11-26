from datetime import date, datetime
from decimal import Decimal
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
from app.models.weekly_reconciliation import WeeklyReconciliation
from app.services.reconciliation_services import (
    calculate_commission_br09,
    generate_weekly_reconciliation,
    get_weekly_reconciliation_report,
)


def _setup_db():
    """Khởi tạo DB SQLite mẫu gồm 2 cửa hàng và các xe tương ứng."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    city = City(city_id=1, city_name="Đà Nẵng")
    owner1 = User(user_id=10, fullname="Chủ Cửa Hàng A", email="a@vrp.vn", phone_number="0901000010")
    owner2 = User(user_id=11, fullname="Chủ Cửa Hàng B", email="b@vrp.vn", phone_number="0901000011")
    renter = User(user_id=20, fullname="Khách Thuê", email="k@vrp.vn", phone_number="0909000020")
    store1 = Store(store_id=100, owner_id=10, city_id=1, store_name="Cửa hàng Minh Thư", status="Đã duyệt")
    store2 = Store(store_id=101, owner_id=11, city_id=1, store_name="Cửa hàng Biển Xanh", status="Đã duyệt")
    v1 = Vehicle(vehicle_id=200, store_id=100, brand="Honda", model="Vision", license_plate="43A1-10001", type="Xe tay ga", status="Sẵn sàng")
    v2 = Vehicle(vehicle_id=201, store_id=101, brand="Yamaha", model="Exciter", license_plate="43A1-10002", type="Xe số", status="Sẵn sàng")
    p1 = PriceTable(price_id=300, vehicle_id=200, amount=Decimal("500000.00"))
    p2 = PriceTable(price_id=301, vehicle_id=201, amount=Decimal("400000.00"))
    db.add_all([city, owner1, owner2, renter, store1, store2, v1, v2, p1, p2])
    db.commit()
    return db, SessionLocal


def _seed_order(
    db,
    *,
    vehicle_id: int,
    price_id: int,
    end_time: datetime,
    rental_amount: Decimal,
    delivery_fee: Decimal,
    order_status: str = "Hoàn thành",
) -> Order:
    """Tạo nhanh đơn thuê mẫu với tiền thuê và phí giao nhận tách biệt."""
    order = Order(
        renter_id=20,
        vehicle_id=vehicle_id,
        price_id=price_id,
        start_time=datetime(end_time.year, end_time.month, end_time.day, 8, 0),
        end_time=end_time,
        delivery_method="Giao tận nơi" if delivery_fee > 0 else "Nhận tại cửa hàng",
        rental_amount=rental_amount,
        delivery_fee=delivery_fee,
        total_amount=rental_amount + delivery_fee,
        deposit_amount=Decimal("200000.00"),
        remaining_amount=(rental_amount + delivery_fee) - Decimal("200000.00"),
        order_status=order_status,
        created_at=end_time,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_calculate_commission_br09_excludes_delivery_fee():
    """BR-09: Hoa hồng 12% chỉ tính trên tiền thuê, tuyệt đối KHÔNG tính trên phí giao nhận."""
    res = calculate_commission_br09(
        rental_amount=Decimal("1000000.00"),
        delivery_fee=Decimal("80000.00"),
    )
    assert res["commission_rate"] == Decimal("12.00")
    # 12% của 1.000.000đ = 120.000đ (KHÔNG phải 12% của 1.080.000đ = 129.600đ)
    assert res["commission_amount"] == Decimal("120000.00")
    assert res["gross_revenue"] == Decimal("1080000.00")
    # Thực nhận cửa hàng = 1.000.000 - 120.000 + 80.000 = 960.000đ
    assert res["net_payout"] == Decimal("960000.00")


def test_weekly_reconciliation_groups_per_store_and_excludes_cancelled():
    """Tổng hợp đối soát theo tuần tách riêng từng cửa hàng và loại bỏ đơn đã hủy / từ chối."""
    db, _ = _setup_db()
    # Tuần 47/2026: Thứ 2 2026-11-16 đến Chủ Nhật 2026-11-22
    _seed_order(db, vehicle_id=200, price_id=300, end_time=datetime(2026, 11, 17, 18, 0), rental_amount=Decimal("1000000.00"), delivery_fee=Decimal("60000.00"), order_status="Hoàn thành")
    _seed_order(db, vehicle_id=200, price_id=300, end_time=datetime(2026, 11, 19, 18, 0), rental_amount=Decimal("500000.00"), delivery_fee=Decimal("40000.00"), order_status="Hoàn tất")
    # Đơn đã hủy của store 100 -> không được tính vào doanh thu/hoa hồng
    _seed_order(db, vehicle_id=200, price_id=300, end_time=datetime(2026, 11, 20, 18, 0), rental_amount=Decimal("800000.00"), delivery_fee=Decimal("50000.00"), order_status="Đã hủy")
    # Đơn của store 101 trong cùng tuần
    _seed_order(db, vehicle_id=201, price_id=301, end_time=datetime(2026, 11, 18, 18, 0), rental_amount=Decimal("400000.00"), delivery_fee=Decimal("30000.00"), order_status="Hoàn thành")

    report = get_weekly_reconciliation_report(db, week_start=date(2026, 11, 16), weeks=1)
    by_store = {item["store_id"]: item for item in report["stores"]}

    s1 = by_store[100]["weeks"][0]
    assert s1["order_count"] == 2
    assert s1["total_rental_amount"] == 1500000.0
    assert s1["total_delivery_fee"] == 100000.0
    assert s1["commission_amount"] == 180000.0  # 12% của 1.500.000đ
    assert s1["net_payout"] == 1420000.0        # 1.500.000 - 180.000 + 100.000

    s2 = by_store[101]["weeks"][0]
    assert s2["order_count"] == 1
    assert s2["total_rental_amount"] == 400000.0
    assert s2["total_delivery_fee"] == 30000.0
    assert s2["commission_amount"] == 48000.0   # 12% của 400.000đ
    assert s2["net_payout"] == 382000.0
    db.close()


def test_api_generate_and_query_weekly_reconciliation():
    """Kiểm tra API chốt đối soát tuần (lưu DB weekly_reconciliations) và API xem đối soát cửa hàng."""
    db, SessionLocal = _setup_db()
    order = _seed_order(
        db,
        vehicle_id=200,
        price_id=300,
        end_time=datetime(2026, 11, 18, 18, 0),
        rental_amount=Decimal("2000000.00"),
        delivery_fee=Decimal("100000.00"),
        order_status="Hoàn thành",
    )

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

        admin_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': 'a@vrp.vn', 'email': 'a@vrp.vn', 'user_id': 10, 'role_id': [1]})}"
        }
        owner_headers = {
            "Authorization": f"Bearer {create_access_token({'sub': 'a@vrp.vn', 'email': 'a@vrp.vn', 'user_id': 10, 'role_id': [4]})}"
        }

        # 1. Chốt đối soát tuần cho cửa hàng 100
        res_gen = client.post(
            "/reconciliation/weekly/generate",
            headers=admin_headers,
            json={"store_id": 100, "week_start": "2026-11-16"},
        )
        assert res_gen.status_code == 200
        records = res_gen.json()["data"]["records"]
        assert len(records) == 1
        assert records[0]["commission_amount"] == 240000.0  # 12% * 2.000.000
        assert records[0]["net_payout"] == 1860000.0        # 2.000.000 - 240.000 + 100.000

        # Kiểm tra đã lưu vào bảng weekly_reconciliations & orders.commission_amount
        db.expire_all()
        saved = db.query(WeeklyReconciliation).filter(WeeklyReconciliation.store_id == 100).first()
        assert saved is not None
        assert saved.commission_amount == Decimal("240000.00")
        refreshed_order = db.query(Order).filter(Order.order_id == order.order_id).first()
        assert refreshed_order.commission_amount == Decimal("240000.00")

        # 2. Xem đối soát tuần của cửa hàng 100
        res_store = client.get(
            "/stores/100/reconciliation/weekly",
            headers=owner_headers,
            params={"week_start": "2026-11-16", "weeks": 1},
        )
        assert res_store.status_code == 200
        store_data = res_store.json()["data"]
        assert store_data["store_id"] == 100
        assert store_data["summary"]["total_commission_amount"] == 240000.0
        assert store_data["summary"]["total_delivery_fee"] == 100000.0
    finally:
        app.dependency_overrides.clear()
        db.close()
