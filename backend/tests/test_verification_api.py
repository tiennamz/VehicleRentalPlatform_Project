import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.security import create_access_token
from app.main import app
from app.database.database import Base, get_db
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.models.drivers_license import DriverLicense
from app.models.verifiable_information import VerifiableInformation
from app.models.personal_data_access_log import PersonalDataAccessLog

# Use in-memory SQLite for API tests with StaticPool
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


def _auth_headers(user_id: int, email: str, role_id: int) -> dict:
    token = create_access_token({
        "sub": email,
        "email": email,
        "user_id": user_id,
        "role_id": [role_id],
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def setup_database():
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

    admin = User(user_id=1, fullname="Quản trị viên", email="admin@motogo.local")
    customer = User(user_id=2, fullname="Nguyễn Văn A", email="nguyenvana@gmail.com", phone_number="0987654321")
    staff = User(user_id=3, fullname="Vận hành viên B", email="staff@motogo.local")
    store_owner = User(user_id=4, fullname="Chủ cửa hàng C", email="owner@motogo.local")
    db.add_all([admin, customer, staff, store_owner])
    db.flush()
    db.add_all([
        UserRole(user_id=1, role_id=1),
        UserRole(user_id=2, role_id=2),
        UserRole(user_id=3, role_id=3),
        UserRole(user_id=4, role_id=4),
    ])

    license_rec = DriverLicense(
        drivers_license_id=10,
        user_id=2,
        license_number="GPLX-99999",
        license_class="B1",
        issue_date=datetime.now(timezone.utc).replace(tzinfo=None),
        img_license_front="https://res.cloudinary.com/g1pkyb87/image/private/v1/kyc/u_2/gplx_front.png",
        verification_status="Đang chờ",
    )
    id_card = VerifiableInformation(
        information_id=2,
        img_id_card_before="https://res.cloudinary.com/g1pkyb87/image/private/v1/kyc/u_2/cccd_front.png",
        img_id_card_after="https://res.cloudinary.com/g1pkyb87/image/private/v1/kyc/u_2/cccd_back.png",
        status="Đang chờ",
    )
    db.add_all([license_rec, id_card])
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides = prev_overrides


def test_api_kyc_and_audit_reject_unauthenticated_and_non_operators():
    # Unauthenticated -> 401
    assert client.get("/admin/verification/customers/2/kyc?staff_id=1").status_code == 401
    assert client.post("/admin/verification/licenses/10/review?staff_id=1", json={"action": "APPROVE"}).status_code == 401
    assert client.get("/admin/audit-logs/personal-data").status_code == 401
    assert client.delete("/admin/audit-logs/personal-data/purge").status_code == 401

    # Customer & Store Owner (even with spoofed staff_id=1 and X-Staff-Id: 1) -> 403
    for headers in [
        {**_auth_headers(2, "nguyenvana@gmail.com", 2), "X-Staff-Id": "1"},
        {**_auth_headers(4, "owner@motogo.local", 4), "X-Staff-Id": "1"},
    ]:
        assert client.get("/admin/verification/customers/2/kyc?staff_id=1", headers=headers).status_code == 403
        assert client.post(
            "/admin/verification/licenses/10/review?staff_id=1",
            headers=headers,
            json={"action": "APPROVE"},
        ).status_code == 403
        assert client.get("/admin/audit-logs/personal-data", headers=headers).status_code == 403
        assert client.delete("/admin/audit-logs/personal-data/purge", headers=headers).status_code == 403


def test_api_get_customer_kyc_by_staff_records_jwt_accessor_id():
    staff_headers = {**_auth_headers(3, "staff@motogo.local", 3), "X-Staff-Id": "1"}
    response = client.get("/admin/verification/customers/2/kyc?staff_id=1", headers=staff_headers)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["statusCode"] == 200
    assert res_json["data"]["user_id"] == 2
    assert res_json["data"]["driver_license"]["license_number"] == "GPLX-99999"
    assert res_json["data"]["id_card"]["img_id_card_before"] is not None
    assert res_json["data"]["driver_license"]["img_license_front"] is not None

    # Verify audit log recorded real JWT accessor_id=3 (NOT spoofed staff_id=1)
    db = TestingSessionLocal()
    logs = db.query(PersonalDataAccessLog).filter(PersonalDataAccessLog.target_user_id == 2).all()
    assert len(logs) == 1
    assert logs[0].accessor_id == 3
    assert logs[0].action == "VIEW"
    db.close()


def test_api_review_driver_license_reject_without_reason_returns_422():
    admin_headers = _auth_headers(1, "admin@motogo.local", 1)
    response = client.post(
        "/admin/verification/licenses/10/review",
        headers=admin_headers,
        json={"action": "REJECT", "rejected_reason": ""},
    )
    assert response.status_code == 422


def test_api_review_driver_license_reject_with_reason_returns_200():
    staff_headers = _auth_headers(3, "staff@motogo.local", 3)
    response = client.post(
        "/admin/verification/licenses/10/review",
        headers=staff_headers,
        json={"action": "REJECT", "rejected_reason": "Ảnh GPLX bị lóa sáng không đọc được họ tên"},
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["statusCode"] == 200
    assert res_json["data"]["verification_status"] == "Bị từ chối"
    assert res_json["data"]["verified_by"] == 3
    assert res_json["data"]["rejected_reason"] == "Ảnh GPLX bị lóa sáng không đọc được họ tên"


def test_api_review_driver_license_approve_returns_200():
    admin_headers = _auth_headers(1, "admin@motogo.local", 1)
    response = client.post(
        "/admin/verification/licenses/10/review",
        headers=admin_headers,
        json={"action": "APPROVE"},
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["data"]["verification_status"] == "Đã xác thực"
    assert res_json["data"]["verified_by"] == 1


def test_api_review_id_card_approve_returns_200():
    admin_headers = _auth_headers(1, "admin@motogo.local", 1)
    response = client.post(
        "/admin/verification/id-cards/2/review",
        headers=admin_headers,
        json={"action": "APPROVE"},
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["data"]["status"] == "Đã xác thực"
    assert res_json["data"]["verified_by"] == 1


def test_api_query_audit_logs_and_purge_permissions():
    staff_headers = _auth_headers(3, "staff@motogo.local", 3)
    admin_headers = _auth_headers(1, "admin@motogo.local", 1)

    # Trigger a view action as staff
    client.get("/admin/verification/customers/2/kyc", headers=staff_headers)

    # Staff can query audit logs
    response = client.get("/admin/audit-logs/personal-data?target_user_id=2", headers=staff_headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1

    # Staff CANNOT purge audit logs -> 403
    old_cutoff = (datetime.now(timezone.utc) - timedelta(days=400)).isoformat()
    assert client.delete(
        f"/admin/audit-logs/personal-data/purge?cutoff_date={old_cutoff}",
        headers=staff_headers,
    ).status_code == 403

    # Admin attempting to purge logs under 12 months -> 403
    recent_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_res = client.delete(
        f"/admin/audit-logs/personal-data/purge?cutoff_date={recent_date}",
        headers=admin_headers,
    )
    assert recent_res.status_code == 403
    assert "tối thiểu 12 tháng" in recent_res.json()["error"]

    # Admin purging logs older than 12 months -> 200
    purge_res = client.delete(
        f"/admin/audit-logs/personal-data/purge?cutoff_date={old_cutoff}",
        headers=admin_headers,
    )
    assert purge_res.status_code == 200
