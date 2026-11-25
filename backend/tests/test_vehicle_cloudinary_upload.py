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
from app.models.image import Image
from app.models.store import Store
from app.models.user import User
from app.utils.cloudinary_helper import upload_vehicle_image_to_cloudinary

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64

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
    db.add(User(
        user_id=10,
        fullname="Chủ cửa hàng",
        email="store-owner@example.com",
        phone_number="0901234567",
        date_of_birth=date(1990, 1, 1),
        status="Hoạt động",
    ))
    db.flush()
    db.add(Store(store_id=100, owner_id=10, store_name="Cửa hàng", address="Đà Nẵng", contact="0901234567"))
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides = prev_overrides


def _auth_headers():
    token = create_access_token({
        "sub": "store-owner@example.com",
        "email": "store-owner@example.com",
        "user_id": 10,
        "role_id": [4],
    })
    return {"Authorization": f"Bearer {token}"}


@patch("app.utils.cloudinary_helper.CLOUDINARY_CLOUD_NAME", "test-cloud")
@patch("app.utils.cloudinary_helper.CLOUDINARY_API_KEY", "test-key")
@patch("app.utils.cloudinary_helper.CLOUDINARY_API_SECRET", "test-secret")
@patch("app.utils.cloudinary_helper.httpx.Client")
def test_vehicle_image_helper_uploads_to_store_folder(mock_client):
    http_client = mock_client.return_value.__enter__.return_value
    response = http_client.post.return_value
    response.status_code = 200
    response.json.return_value = {
        "secure_url": "https://res.cloudinary.com/test-cloud/image/upload/vehicles/store_100/abc.png",
        "public_id": "vehicles/store_100/abc",
    }

    upload = upload_vehicle_image_to_cloudinary(
        content=PNG_BYTES,
        filename="vehicle.png",
        content_type="image/png",
        store_id=100,
    )

    assert upload == {
        "secure_url": "https://res.cloudinary.com/test-cloud/image/upload/vehicles/store_100/abc.png",
        "public_id": "vehicles/store_100/abc",
    }
    request = http_client.post.call_args
    assert request.args[0] == "https://api.cloudinary.com/v1_1/test-cloud/image/upload"
    assert request.kwargs["data"]["folder"] == "vehicles/store_100"


@patch("app.routers.vehicle.upload_vehicle_image_to_cloudinary")
def test_vehicle_creation_saves_cloudinary_urls_in_image_records(mock_upload):
    mock_upload.side_effect = [
        {"secure_url": f"https://res.cloudinary.com/test/image/upload/vehicles/{index}.png", "public_id": f"vehicles/{index}"}
        for index in range(4)
    ]

    response = client.post(
        "/vehicles",
        headers=_auth_headers(),
        data={
            "brand": "Honda",
            "model": "Vision",
            "license_plate": "43A-12345",
            "manufacture_year": "2024",
            "type": "Xe tay ga",
            "engine_capacity": "125",
        },
        files=[("files", (f"vehicle-{index}.png", PNG_BYTES, "image/png")) for index in range(4)],
    )

    assert response.status_code == 201, response.text
    db = TestingSessionLocal()
    try:
        images = db.query(Image).order_by(Image.image_id).all()
        assert len(images) == 4
        assert all(image.img_url.startswith("https://res.cloudinary.com/") for image in images)
        assert [image.img_url for image in images] == [
            f"https://res.cloudinary.com/test/image/upload/vehicles/{index}.png"
            for index in range(4)
        ]
    finally:
        db.close()


@patch("app.routers.vehicle.delete_cloudinary_image_by_public_id")
@patch("app.routers.vehicle.upload_vehicle_image_to_cloudinary")
def test_vehicle_creation_cleans_uploaded_images_if_later_upload_fails(mock_upload, mock_delete):
    from fastapi import HTTPException

    mock_upload.side_effect = [
        {"secure_url": "https://res.cloudinary.com/test/image/upload/vehicles/first.png", "public_id": "vehicles/first"},
        HTTPException(status_code=502, detail="Cloudinary upload failed"),
    ]

    response = client.post(
        "/vehicles",
        headers=_auth_headers(),
        data={
            "brand": "Honda",
            "model": "Vision",
            "license_plate": "43A-12345",
            "manufacture_year": "2024",
            "type": "Xe tay ga",
            "engine_capacity": "125",
        },
        files=[("files", (f"vehicle-{index}.png", PNG_BYTES, "image/png")) for index in range(4)],
    )

    assert response.status_code == 502
    mock_delete.assert_called_once_with("vehicles/first", delivery_type="upload")
    db = TestingSessionLocal()
    try:
        assert db.query(Image).count() == 0
    finally:
        db.close()
