from datetime import date
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.database import Base, get_db
from app.main import app
from app.models.personal_data_access_log import PersonalDataAccessLog
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.utils.cloudinary_helper import (
    build_viewable_kyc_url,
    extract_cloudinary_public_id,
    generate_cloudinary_signature,
)

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 64

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    prev_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()
    db.add_all([
        Role(role_id=1, role_name="Admin", description="Admin"),
        Role(role_id=2, role_name="Khách hàng", description="Customer"),
        Role(role_id=3, role_name="Nhân viên", description="Staff"),
        Role(role_id=4, role_name="Chủ cửa hàng", description="Store Owner"),
    ])
    user1 = User(
        user_id=10,
        fullname="Nguyễn Văn Cũ",
        email="customer10@gmail.com",
        phone_number="0901234567",
        date_of_birth=date(1999, 5, 20),
        address="Hải Châu, Đà Nẵng",
        status="Hoạt động",
    )
    user2 = User(
        user_id=20,
        fullname="Trần Thị Khác",
        email="customer20@gmail.com",
        phone_number="0909999999",
        date_of_birth=date(1997, 8, 12),
        address="Sơn Trà, Đà Nẵng",
        status="Hoạt động",
    )
    store_owner = User(
        user_id=30,
        fullname="Chủ Cửa Hàng",
        email="owner30@gmail.com",
        phone_number="0908888888",
        date_of_birth=date(1990, 1, 1),
        address="Thanh Khê, Đà Nẵng",
        status="Hoạt động",
    )
    db.add_all([user1, user2, store_owner])
    db.flush()
    db.add_all([
        UserRole(user_id=10, role_id=2),
        UserRole(user_id=20, role_id=2),
        UserRole(user_id=30, role_id=4),
    ])
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides = prev_overrides


def _make_auth_headers(user_id: int, email: str, role_id: int = 2):
    token = create_access_token({
        "sub": email,
        "email": email,
        "user_id": user_id,
        "role_id": [role_id],
    })
    return {"Authorization": f"Bearer {token}"}


def test_private_cloudinary_signed_view_url():
    sig = generate_cloudinary_signature(
        {"folder": "kyc/u_10", "public_id": "cccd_front_abc", "timestamp": "1700000000", "type": "private"},
        "my_secret",
    )
    assert len(sig) == 40
    stored_private_url = "https://res.cloudinary.com/g1pkyb87/image/private/v1700000000/kyc/u_10/cccd_front_abc.png"
    assert extract_cloudinary_public_id(stored_private_url) == "kyc/u_10/cccd_front_abc"
    signed_view = build_viewable_kyc_url(stored_private_url)
    assert signed_view.startswith("https://api.cloudinary.com/v1_1/g1pkyb87/image/download?")
    assert "signature=" in signed_view and "expires_at=" in signed_view


def test_upload_kyc_image_uses_private_delivery_type():
    from app.utils import cloudinary_helper

    captured = {}

    class FakeResponse:
        status_code = 200
        text = "ok"

        def json(self):
            return {
                "secure_url": "https://res.cloudinary.com/testcloud/image/private/v1/kyc/u_10/cccd_front_1.png",
                "public_id": "kyc/u_10/cccd_front_1",
                "format": "png",
            }

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, data=None, files=None):
            captured["url"] = url
            captured["data"] = data
            return FakeResponse()

    with patch.object(cloudinary_helper, "CLOUDINARY_CLOUD_NAME", "testcloud"), \
         patch.object(cloudinary_helper, "CLOUDINARY_API_KEY", "testkey"), \
         patch.object(cloudinary_helper, "CLOUDINARY_API_SECRET", "testsecret"), \
         patch.object(cloudinary_helper.httpx, "Client", FakeClient):
        result = cloudinary_helper.upload_kyc_image_to_cloudinary(
            content=PNG_BYTES,
            filename="cccd.png",
            content_type="image/png",
            user_id=10,
            doc_tag="cccd_front",
        )

    assert captured["data"]["type"] == "private"
    assert "/image/private/" in result["secure_url"]


@patch("app.services.user_services.delete_cloudinary_image_by_url")
@patch("app.services.user_services.upload_kyc_image_to_cloudinary")
def test_kyc_document_urls_are_strictly_hidden_from_non_operators(mock_upload, mock_delete):
    counter = {"n": 0}

    def fake_upload(content, filename, content_type, user_id, doc_tag):
        counter["n"] += 1
        pid = f"kyc/u_{user_id}/{doc_tag}_{counter['n']}"
        raw = f"https://res.cloudinary.com/g1pkyb87/image/private/v1/{pid}.png"
        return {
            "secure_url": raw,
            "public_id": pid,
            "format": "png",
            "view_url": build_viewable_kyc_url(raw),
        }

    mock_upload.side_effect = fake_upload
    headers_owner = _make_auth_headers(10, "customer10@gmail.com", role_id=2)
    headers_other = _make_auth_headers(20, "customer20@gmail.com", role_id=2)
    headers_store_owner = _make_auth_headers(30, "owner30@gmail.com", role_id=4)

    # 1. Update personal profile
    prof_res = client.put(
        "/users/me/profile",
        headers=headers_owner,
        json={
            "fullname": "Nguyễn Văn Mới",
            "date_of_birth": "1998-10-15",
            "address": "123 Nguyễn Văn Linh, Đà Nẵng",
            "phone_number": "0912345678",
        },
    )
    assert prof_res.status_code == 200

    # 2. Owner saves CCCD -> URLs are strictly hidden (None), only boolean upload flags returned
    id_res = client.post(
        "/users/me/documents/id-card",
        headers=headers_owner,
        files={
            "front_image": ("cccd_front.png", PNG_BYTES, "image/png"),
            "back_image": ("cccd_back.jpg", JPEG_BYTES, "image/jpeg"),
        },
    )
    assert id_res.status_code == 200
    id_data = id_res.json()["data"]
    assert id_data["img_id_card_before"] is None
    assert id_data["img_id_card_after"] is None
    assert id_data["has_front_image"] is True
    assert id_data["has_back_image"] is True

    # 3. Owner saves Driver License -> URLs are strictly hidden (None), metadata & flags returned
    lic_res = client.post(
        "/users/me/documents/driver-license",
        headers=headers_owner,
        data={
            "license_number": "079099001234",
            "license_class": "A1",
        },
        files={
            "front_image": ("gplx_front.png", PNG_BYTES, "image/png"),
        },
    )
    assert lic_res.status_code == 200
    lic_data = lic_res.json()["data"]
    assert lic_data["img_license_front"] is None
    assert lic_data["img_license_back"] is None
    assert lic_data["has_front_image"] is True
    assert lic_data["has_back_image"] is False

    # 4. Owner reloads GET /users/me/profile -> still never receives document image URLs
    me_res = client.get("/users/me/profile", headers=headers_owner)
    assert me_res.status_code == 200
    me_data = me_res.json()["data"]
    assert me_data["id_card"]["img_id_card_before"] is None
    assert me_data["id_card"]["img_id_card_after"] is None
    assert me_data["id_card"]["has_front_image"] is True
    assert me_data["driver_license"]["img_license_front"] is None
    assert me_data["driver_license"]["has_front_image"] is True

    # 5. Another logged-in customer trying to view user 10's profile gets 403 Forbidden
    other_res = client.get("/users/10/profile", headers=headers_other)
    assert other_res.status_code == 403

    # 6. Store owner trying to view customer 10's profile/documents gets 403 Forbidden
    owner_res = client.get("/users/10/profile", headers=headers_store_owner)
    assert owner_res.status_code == 403

    # 7. Unauthenticated requests to /users/10/profile and /users/10/documents/id-card get 401
    anon_res = client.get("/users/10/profile")
    assert anon_res.status_code == 401

    anon_upload = client.post(
        "/users/10/documents/id-card",
        files={"front_image": ("cccd_front.png", PNG_BYTES, "image/png")},
    )
    assert anon_upload.status_code == 401

    db = TestingSessionLocal()
    logs = db.query(PersonalDataAccessLog).filter(PersonalDataAccessLog.target_user_id == 10).all()
    assert len(logs) >= 3
    db.close()
