
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ==========================================
# FR-01: TEST ĐĂNG KÝ
# ==========================================

def test_register_success():
    """Đăng ký thành công với email và password hợp lệ."""

    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "Password123"
        }
    )

    assert response.status_code == 201


def test_register_duplicate_email():
    """Không cho phép đăng ký email đã tồn tại."""

    payload = {
        "email": "test@example.com",
        "password": "Password123"
    }

    client.post("/auth/register", json=payload)

    response = client.post("/auth/register", json=payload)

    assert response.status_code == 409


def test_register_invalid_email():
    """Không chấp nhận email sai định dạng."""

    response = client.post(
        "/auth/register",
        json={
            "email": "invalid-email",
            "password": "Password123"
        }
    )

    assert response.status_code == 422


def test_register_missing_password():
    """Không cho phép đăng ký khi thiếu password."""

    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com"
        }
    )

    assert response.status_code == 422


# ==========================================
# FR-02: TEST ĐĂNG NHẬP
# ==========================================

def test_login_success():
    """Đăng nhập thành công."""

    response = client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "Password123"
        }
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password():
    """Đăng nhập với password sai."""

    response = client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "WrongPassword123"
        }
    )

    assert response.status_code == 401


def test_login_nonexistent_email():
    """Đăng nhập bằng email chưa đăng ký."""

    response = client.post(
        "/auth/login",
        json={
            "email": "unknown@example.com",
            "password": "Password123"
        }
    )

    assert response.status_code == 401


def test_login_invalid_email():
    """Đăng nhập với email sai định dạng."""

    response = client.post(
        "/auth/login",
        json={
            "email": "invalid-email",
            "password": "Password123"
        }
    )

    assert response.status_code == 422


# ==========================================
# FR-02: TEST QUÊN MẬT KHẨU
# ==========================================

def test_forgot_password_success():
    """Yêu cầu đặt lại mật khẩu thành công."""

    response = client.post(
        "/auth/forgot-password",
        json={
            "email": "test@example.com"
        }
    )

    assert response.status_code == 200


def test_forgot_password_nonexistent_email():
    """Yêu cầu đặt lại mật khẩu bằng email không tồn tại."""

    response = client.post(
        "/auth/forgot-password",
        json={
            "email": "unknown@example.com"
        }
    )

    assert response.status_code == 404


# ==========================================
# TEST PHÂN QUYỀN
# ==========================================

def test_access_protected_api_without_token():
    """Không cho phép truy cập API cần đăng nhập khi thiếu token."""

    response = client.get("/users/me")

    assert response.status_code == 401
