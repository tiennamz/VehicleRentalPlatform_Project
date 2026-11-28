import pytest
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.store import Store
from app.models.vehicle import Vehicle
from app.models.price_table import PriceTable

from dependencies.middleware import get_current_user, _get_token


@pytest.fixture
def vehicle_owner(client, db_session):
    role = db_session.query(Role).filter(Role.role_id == 4).first()

    if not role:
        role = Role(
            role_id=4,
            role_name="Chủ cửa hàng",
            description="Store owner"
        )
        db_session.add(role)
        db_session.commit()

    user = User(
        fullname="Vehicle Owner",
        email="vehicle_owner_test@gmail.com",
        phone_number="0905555555"
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    db_session.add(
        UserRole(
            user_id=user.user_id,
            role_id=4
        )
    )
    db_session.commit()

    store = Store(
        owner_id=user.user_id,
        store_name="Vehicle Test Store",
        address="Da Nang",
        contact="0905555555",
        status="Đã duyệt",
        allow_store_pickup=True,
        allow_home_delivery=True
    )

    db_session.add(store)
    db_session.commit()
    db_session.refresh(store)

    client.app.dependency_overrides[get_current_user] = lambda: user
    client.app.dependency_overrides[_get_token] = lambda: None

    return user


@pytest.fixture
def other_owner(db_session):
    user = User(
        fullname="Other Owner",
        email="other_vehicle_owner@gmail.com",
        phone_number="0906666666"
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    store = Store(
        owner_id=user.user_id,
        store_name="Other Store",
        address="Da Nang",
        contact="0906666666",
        status="Đã duyệt",
        allow_store_pickup=True,
        allow_home_delivery=True
    )

    db_session.add(store)
    db_session.commit()
    db_session.refresh(store)

    return user, store


@pytest.fixture
def sample_vehicle(db_session, vehicle_owner):
    store = db_session.query(Store).filter(
        Store.owner_id == vehicle_owner.user_id
    ).first()

    vehicle = Vehicle(
        store_id=store.store_id,
        brand="Honda",
        model="Vision",
        license_plate="43A12345",
        manufacture_year=2024,
        type="Xe tay ga",
        engine_capacity=125,
        description="Test vehicle",
        status="Sẵn sàng"
    )

    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)

    db_session.add(
        PriceTable(
            vehicle_id=vehicle.vehicle_id,
            amount=100000,
            price_type="HOURLY"
        )
    )

    db_session.commit()
    db_session.refresh(vehicle)

    return vehicle


def test_get_my_store_vehicles_success(
    client, vehicle_owner, sample_vehicle
):
    response = client.get("/vehicles/my-store")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["license_plate"] == "43A12345"

def test_get_vehicles_unauthorized(client):
    from fastapi import HTTPException

    def reject_user():
        raise HTTPException(
            status_code=401,
            detail="Test authentication"
        )

    client.app.dependency_overrides[get_current_user] = reject_user

    response = client.get("/vehicles/owner")

    assert response.status_code == 401

def test_update_vehicle_success(
    client, vehicle_owner, sample_vehicle
):
    response = client.put(
        f"/vehicles/{sample_vehicle.vehicle_id}",
        json={
            "brand": "Yamaha",
            "price": 120000
        }
    )

    assert response.status_code == 200
    assert response.json()["brand"] == "Yamaha"
    assert response.json()["price"] == 120000


def test_update_vehicle_invalid_price(
    client, vehicle_owner, sample_vehicle
):
    response = client.put(
        f"/vehicles/{sample_vehicle.vehicle_id}",
        json={"price": -100}
    )

    assert response.status_code == 422


def test_update_vehicle_invalid_year(
    client, vehicle_owner, sample_vehicle
):
    response = client.put(
        f"/vehicles/{sample_vehicle.vehicle_id}",
        json={"manufacture_year": 1800}
    )

    assert response.status_code == 422


def test_update_vehicle_not_owner(
    client, vehicle_owner, other_owner, db_session
):
    other_user, other_store = other_owner

    vehicle = Vehicle(
        store_id=other_store.store_id,
        brand="Honda",
        model="Air Blade",
        license_plate="43A99999",
        manufacture_year=2024,
        type="Xe tay ga",
        engine_capacity=150,
        status="Sẵn sàng"
    )

    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)

    response = client.put(
        f"/vehicles/{vehicle.vehicle_id}",
        json={"brand": "Changed"}
    )

    assert response.status_code == 404


def test_delete_vehicle_success(
    client, vehicle_owner, sample_vehicle, db_session
):
    response = client.delete(
        f"/vehicles/{sample_vehicle.vehicle_id}"
    )

    assert response.status_code == 200

    db_session.refresh(sample_vehicle)
    assert sample_vehicle.status == "Đã xóa"


def test_delete_vehicle_not_owner(
    client, vehicle_owner, other_owner, db_session
):
    other_user, other_store = other_owner

    vehicle = Vehicle(
        store_id=other_store.store_id,
        brand="Honda",
        model="Air Blade",
        license_plate="43A88888",
        manufacture_year=2024,
        type="Xe tay ga",
        engine_capacity=150,
        status="Sẵn sàng"
    )

    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)

    response = client.delete(
        f"/vehicles/{vehicle.vehicle_id}"
    )

    assert response.status_code == 404


def test_pause_vehicle_success(
    client, vehicle_owner, sample_vehicle
):
    response = client.patch(
        f"/vehicles/{sample_vehicle.vehicle_id}/pause"
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Bảo trì"


def test_pause_vehicle_unauthorized(client, db_session):
    user = User(
        fullname="Temporary Owner",
        email="temporary_owner@gmail.com",
        phone_number="0907777777"
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    store = Store(
        owner_id=user.user_id,
        store_name="Temporary Store",
        address="Da Nang",
        contact="0907777777",
        status="Đã duyệt",
        allow_store_pickup=True,
        allow_home_delivery=True
    )

    db_session.add(store)
    db_session.commit()
    db_session.refresh(store)

    vehicle = Vehicle(
        store_id=store.store_id,
        brand="Honda",
        model="Vision",
        license_plate="43A77777",
        manufacture_year=2024,
        type="Xe tay ga",
        engine_capacity=125,
        status="Sẵn sàng"
    )

    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)

    response = client.patch(
        f"/vehicles/{vehicle.vehicle_id}/pause"
    )

    assert response.status_code == 401
