import pytest
from fastapi import HTTPException
from app.models.user import User
from app.models.store import Store
from app.models.city import City
from app.models.role import Role
from app.models.user_role import UserRole
from dependencies.middleware import get_current_user, _get_token


@pytest.fixture
def store_city(db_session):
    city = City(city_name="Da Nang")
    db_session.add(city)
    db_session.commit()
    db_session.refresh(city)
    return city


@pytest.fixture
def store_owner(client, db_session):
    user = User(
        fullname="Store Owner",
        email="store_owner_test@gmail.com",
        phone_number="0901111111",
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    client.app.dependency_overrides[get_current_user] = lambda: user

    return user


@pytest.fixture
def normal_user(client, db_session):
    user = User(
        fullname="Normal User",
        email="normal_user_test@gmail.com",
        phone_number="0902222222",
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    client.app.dependency_overrides[get_current_user] = lambda: user
    client.app.dependency_overrides[_get_token] = lambda: None

    return user


@pytest.fixture
def admin_user(client, db_session):
    user = User(
        fullname="Admin User",
        email="admin_store_test@gmail.com",
        phone_number="0903333333",
    )

    admin_role = Role(
        role_id=1,
        role_name="Admin",
        description="System administrator",
    )

    db_session.add_all([user, admin_role])
    db_session.commit()
    db_session.refresh(user)

    user_role = UserRole(
        user_id=user.user_id,
        role_id=admin_role.role_id,
    )

    db_session.add(user_role)
    db_session.commit()
    db_session.refresh(user)

    print("USER ROLES:", [(ur.user_id, ur.role_id) for ur in user.user_roles])

    from dependencies.middleware import get_user_role_ids
    print("ROLE IDS:", get_user_role_ids(user))

    client.app.dependency_overrides[get_current_user] = lambda: user
    client.app.dependency_overrides[_get_token] = lambda: None

    return user


@pytest.fixture
def sample_store(db_session, store_city):
    owner = User(
        fullname="Sample Store Owner",
        email="sample_store_owner@gmail.com",
        phone_number="0904444444",
    )

    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)

    store = Store(
        owner_id=owner.user_id,
        store_name="Test Store",
        address="Da Nang",
        contact="0904444444",
        city_id=store_city.city_id,
        business_license="uploads/business_licenses/test.pdf",
        bank_account_number="123456789",
        bank_name="Test Bank",
        account_holder="SAMPLE STORE OWNER",
        status="Đang chờ duyệt",
    )

    db_session.add(store)
    db_session.commit()
    db_session.refresh(store)

    return store


def register_store_request(client, city_id, filename="license.pdf",content=b"%PDF-1.4 test license",content_type="application/pdf"):

    data = {
        "store_name": "New Test Store",
        "address": "Da Nang",
        "contact": "0901234567",
        "city_id": str(city_id),
        "bank_account_number": "123456789",
        "bank_name": "Test Bank",
        "account_holder": "NGUYEN VAN A",
    }

    files = {
        "business_license": (filename, content, content_type)
    }

    return client.post(
        "/stores/register",
        data=data,
        files=files,
    )


def test_register_store_success(client, store_owner, store_city):
    response = register_store_request(client, store_city.city_id)

    assert response.status_code == 201
    assert response.json()["store_name"] == "New Test Store"
    assert response.json()["status"] == "Đang chờ duyệt"


def test_register_store_duplicate(client, store_owner, store_city, db_session):
    existing_store = Store(
        owner_id=store_owner.user_id,
        store_name="Existing Store",
        address="Da Nang",
        contact="0901111111",
        city_id=store_city.city_id,
        status="Đang chờ duyệt",
    )

    db_session.add(existing_store)
    db_session.commit()

    response = register_store_request(client, store_city.city_id)

    assert response.status_code == 400


def test_register_store_invalid_extension(client, store_owner, store_city):
    response = register_store_request(
        client,
        store_city.city_id,
        filename="license.exe",
        content=b"invalid",
        content_type="application/octet-stream",
    )

    assert response.status_code == 400


def test_register_store_invalid_content_type(client, store_owner, store_city):
    response = register_store_request(
        client,
        store_city.city_id,
        filename="license.pdf",
        content=b"%PDF-1.4 test",
        content_type="image/png",
    )

    assert response.status_code == 400


def test_register_store_invalid_file_signature(client, store_owner, store_city):
    response = register_store_request(
        client,
        store_city.city_id,
        filename="license.pdf",
        content=b"This is not a PDF file",
        content_type="application/pdf",
    )

    assert response.status_code == 400


def test_register_store_unauthorized(client, store_city):
    response = register_store_request(client, store_city.city_id)

    assert response.status_code == 401


def test_get_my_store_success(client, store_owner, db_session, store_city):
    store = Store(
        owner_id=store_owner.user_id,
        store_name="My Test Store",
        address="Da Nang",
        contact="0901111111",
        city_id=store_city.city_id,
        business_license="uploads/business_licenses/test.pdf",
        bank_account_number="123456789",
        bank_name="Test Bank",
        account_holder="STORE OWNER",
        status="Đang chờ duyệt",
    )

    db_session.add(store)
    db_session.commit()

    response = client.get("/stores/my-store")

    assert response.status_code == 200
    assert response.json()["store_name"] == "My Test Store"


def test_get_my_store_not_found(client, store_owner):
    response = client.get("/stores/my-store")

    assert response.status_code == 404


def test_get_my_store_unauthorized(client):
    response = client.get("/stores/my-store")

    assert response.status_code == 401


# =========================
# ADMIN: PENDING STORES
# =========================

def test_get_pending_stores_success(client, admin_user, sample_store):
    response = client.get("/stores/pending")

    print("STATUS:", response.status_code)
    print("RESPONSE:", response.json())

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["status"] == "Đang chờ duyệt"


def test_get_pending_stores_forbidden(client, normal_user):
    response = client.get("/stores/pending")

    assert response.status_code == 403


def test_get_pending_stores_unauthorized(client):
    response = client.get("/stores/pending")

    assert response.status_code == 401



def test_approve_store_success(client, admin_user, sample_store):
    response = client.patch(
        f"/stores/{sample_store.store_id}/approve"
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Đã duyệt"


def test_approve_store_not_found(client, admin_user):
    response = client.patch("/stores/99999/approve")

    assert response.status_code == 404


def test_approve_store_invalid_status(
    client, admin_user, sample_store, db_session
):
    sample_store.status = "Đã duyệt"
    db_session.commit()

    response = client.patch(
        f"/stores/{sample_store.store_id}/approve"
    )

    assert response.status_code == 400


def test_approve_store_forbidden(client, normal_user, sample_store):
    response = client.patch(
        f"/stores/{sample_store.store_id}/approve"
    )

    assert response.status_code == 403



def test_reject_store_success(client, admin_user, sample_store):
    response = client.patch(
        f"/stores/{sample_store.store_id}/reject"
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Bị từ chối"


def test_reject_store_not_found(client, admin_user):
    response = client.patch("/stores/99999/reject")

    assert response.status_code == 404


def test_reject_store_invalid_status(
    client, admin_user, sample_store, db_session
):
    sample_store.status = "Đã duyệt"
    db_session.commit()

    response = client.patch(
        f"/stores/{sample_store.store_id}/reject"
    )

    assert response.status_code == 400


def test_reject_store_forbidden(client, normal_user, sample_store):
    response = client.patch(
        f"/stores/{sample_store.store_id}/reject"
    )

    assert response.status_code == 403


def test_get_public_stores_only_approved(
    client, db_session, store_owner, store_city
):
    approved_store = Store(
        owner_id=store_owner.user_id,
        store_name="Approved Store",
        address="Da Nang",
        contact="0901111111",
        city_id=store_city.city_id,
        status="Đã duyệt",
    )

    pending_store = Store(
        owner_id=store_owner.user_id + 100,
        store_name="Pending Store",
        address="Da Nang",
        contact="0902222222",
        city_id=store_city.city_id,
        status="Đang chờ duyệt",
    )

    db_session.add_all([approved_store, pending_store])
    db_session.commit()
    response = client.get("/stores/public")
    assert response.status_code == 200
    store_names = [store["store_name"] for store in response.json()]
    assert "Approved Store" in store_names
    assert "Pending Store" not in store_names
