from datetime import date
import pytest
from app.models.user import User
from dependencies.middleware import get_current_user


@pytest.fixture
def authenticated_user(client, db_session):
    user = User(
        fullname="Nguyen Van A",
        email="user_test@gmail.com",
        phone_number="0912345678",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    client.app.dependency_overrides[get_current_user] = lambda: user
    return user

def test_get_my_profile_success(client, authenticated_user):
    response = client.get("/users/me/profile")
    assert response.status_code == 200

def test_get_my_profile_unauthorized(client):
    response = client.get("/users/me/profile")
    assert response.status_code == 401

def test_update_my_profile_success(client, authenticated_user, db_session):
    payload = {
        "fullname": "Tran Van B",
        "date_of_birth": "2000-01-01",
        "address": "Da Nang",
        "phone_number": "0987654321",
        "gender": "Nam",
    }

    response = client.put("/users/me/profile", json=payload)
    assert response.status_code == 200
    db_session.refresh(authenticated_user)
    assert authenticated_user.fullname == "Tran Van B"
    assert authenticated_user.phone_number == "0987654321"
    assert authenticated_user.address == "Da Nang"
    assert authenticated_user.date_of_birth == date(2000, 1, 1)

def test_update_my_profile_invalid_age(client, authenticated_user):
    payload = {
        "fullname": "Nguyen Van A",
        "date_of_birth": "2015-01-01",
        "address": "Da Nang",
        "phone_number": "0912345678",
    }
    response = client.put("/users/me/profile", json=payload)
    assert response.status_code == 422

def test_update_my_profile_invalid_phone(client, authenticated_user):
    payload = {
        "fullname": "Nguyen Van A",
        "date_of_birth": "2000-01-01",
        "address": "Da Nang",
        "phone_number": "phone123",
    }
    response = client.put("/users/me/profile", json=payload)
    assert response.status_code == 422

def test_update_my_profile_empty_fullname(client, authenticated_user):
    payload = {
        "fullname": "   ",
        "date_of_birth": "2000-01-01",
        "address": "Da Nang",
        "phone_number": "0912345678",
    }
    response = client.put("/users/me/profile", json=payload)
    assert response.status_code == 422

def test_update_my_profile_duplicate_phone(
    client,
    authenticated_user,
    db_session,
):
    another_user = User(
        fullname="Nguyen Van C",
        email="another_test@gmail.com",
        phone_number="0900000000",
    )
    db_session.add(another_user)
    db_session.commit()
    payload = {
        "fullname": "Nguyen Van A",
        "date_of_birth": "2000-01-01",
        "address": "Da Nang",
        "phone_number": "0900000000",
    }
    response = client.put("/users/me/profile", json=payload)
    assert response.status_code == 400
