
import pytest
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


# ==========================================
# FR-01: TEST ĐĂNG KÝ TÀI KHOẢN
# ==========================================

def test_register_success():
    """Đăng ký tài khoản với số điện thoại hợp lệ."""

    response = client.post(
        "/auth/register",
        json={
            "phone": "0912345678",
            "password": "Password123"
        }
    )

    assert response.status_code == 201


def test_register_duplicate_phone():
    """Không cho phép đăng ký số điện thoại đã tồn tại."""

    payload = {
        "phone": "0912345678",
        "password": "Password123"
    }

    client.post("/auth/register", json=payload)

    response = client.post("/auth/register", json=payload)

    assert response.status_code == 409


def test_register_invalid_phone():
    """Không chấp nhận số điện thoại sai định dạng."""

    response = client.post(
        "/auth/register",
        json={
            "phone": "123",
            "password": "Password123"
        }
    )

    assert response.status_code == 422


# ==========================================
# FR-01: TEST XÁC THỰC OTP
# ==========================================

def test_verify_otp_success():
    """Xác thực OTP chính xác."""

    # Giả sử tài khoản đã đăng ký và OTP đã được gửi.
    response = client.post(
        "/auth/verify-otp",
        json={
            "phone": "0912345678",
            "otp": "123456"
        }
    )

    assert response.status_code == 200


def test_verify_otp_invalid():
    """Từ chối OTP không chính xác."""

    response = client.post(
        "/auth/verify-otp",
        json={
            "phone": "0912345678",
            "otp": "000000"
        }
    )

    assert response.status_code == 400


# ==========================================
# FR-02: TEST ĐĂNG NHẬP
# ==========================================

def test_login_success():
    """Đăng nhập với thông tin chính xác."""

    response = client.post(
        "/auth/login",
        json={
            "phone": "0912345678",
            "password": "Password123"
        }
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password():
    """Đăng nhập với mật khẩu sai."""

    response = client.post(
        "/auth/login",
        json={
            "phone": "0912345678",
            "password": "WrongPassword"
        }
    )

    assert response.status_code == 401


def test_login_nonexistent_account():
    """Đăng nhập bằng tài khoản không tồn tại."""

    response = client.post(
        "/auth/login",
        json={
            "phone": "0999999999",
            "password": "Password123"
        }
    )

    assert response.status_code == 401


def test_forgot_password_success():
    """Yêu cầu gửi OTP để đặt lại mật khẩu."""

    response = client.post(
        "/auth/forgot-password",
        json={
            "phone": "0912345678"
        }
    )

    assert response.status_code == 200


def test_reset_password_success():
    """Đặt lại mật khẩu bằng OTP hợp lệ."""

    response = client.post(
        "/auth/reset-password",
        json={
            "phone": "0912345678",
            "otp": "123456",
            "new_password": "NewPassword123"
        }
    )

    assert response.status_code == 200


def test_reset_password_invalid_otp():
    """Không cho phép đổi mật khẩu bằng OTP sai."""

    response = client.post(
        "/auth/reset-password",
        json={
            "phone": "0912345678",
            "otp": "000000",
            "new_password": "NewPassword123"
        }
    )

    assert response.status_code == 400
