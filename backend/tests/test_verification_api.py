import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.database.database import Base, get_db
from app.models.user import User
from app.models.drivers_license import DriverLicense
from app.models.verifiable_information import VerifiableInformation
from app.models.personal_data_access_log import PersonalDataAccessLog

# Use in-memory SQLite for API tests with StaticPool
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    admin = User(user_id=1, fullname="Quản trị viên", email="admin@motogo.local")
    customer = User(user_id=2, fullname="Nguyễn Văn A", email="nguyenvana@gmail.com", phone_number="0987654321")
    db.add_all([admin, customer])
    db.commit()

    license = DriverLicense(
        drivers_license_id=10,
        user_id=2,
        license_number="GPLX-99999",
        license_class="B1",
        issue_date=datetime.now(timezone.utc).replace(tzinfo=None),
        verification_status="Đang chờ"
    )
    id_card = VerifiableInformation(
        information_id=2,
        img_id_card_before="https://storage.local/cccd_front.png",
        img_id_card_after="https://storage.local/cccd_back.png",
        status="Đang chờ"
    )
    db.add_all([license, id_card])
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)

def test_api_get_customer_kyc():
    response = client.get("/admin/verification/customers/2/kyc?staff_id=1")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["statusCode"] == 200
    assert res_json["data"]["user_id"] == 2
    assert res_json["data"]["driver_license"]["license_number"] == "GPLX-99999"

def test_api_review_driver_license_reject_without_reason_returns_422():
    response = client.post(
        "/admin/verification/licenses/10/review?staff_id=1",
        json={"action": "REJECT", "rejected_reason": ""}
    )
    assert response.status_code == 422

def test_api_review_driver_license_reject_with_reason_returns_200():
    response = client.post(
        "/admin/verification/licenses/10/review?staff_id=1",
        json={"action": "REJECT", "rejected_reason": "Ảnh GPLX bị lóa sáng không đọc được họ tên"}
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["statusCode"] == 200
    assert res_json["data"]["verification_status"] == "Bị từ chối"
    assert res_json["data"]["rejected_reason"] == "Ảnh GPLX bị lóa sáng không đọc được họ tên"

def test_api_review_driver_license_approve_returns_200():
    response = client.post(
        "/admin/verification/licenses/10/review?staff_id=1",
        json={"action": "APPROVE"}
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["data"]["verification_status"] == "Đã xác thực"

def test_api_review_id_card_approve_returns_200():
    response = client.post(
        "/admin/verification/id-cards/2/review?staff_id=1",
        json={"action": "APPROVE"}
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["data"]["status"] == "Đã xác thực"

def test_api_query_audit_logs():
    # Trigger a view action
    client.get("/admin/verification/customers/2/kyc?staff_id=1")

    response = client.get("/admin/audit-logs/personal-data?target_user_id=2")
    assert response.status_code == 200
    res_json = response.json()
    assert len(res_json["data"]) >= 1

def test_api_purge_recent_audit_logs_forbidden():
    # Attempting to delete logs with recent cutoff returns 403
    recent_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    response = client.delete(f"/admin/audit-logs/personal-data/purge?cutoff_date={recent_date}")
    assert response.status_code == 403
    assert "tối thiểu 12 tháng" in response.json()["error"]

