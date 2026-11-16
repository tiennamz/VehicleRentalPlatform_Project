import jwt
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core import security
from app.services import auth_services


class FakeQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *_args):
        return self

    def first(self):
        return self.result


class FakeDatabase:
    def __init__(self, user):
        self.user = user

    def query(self, *_args):
        return FakeQuery(self.user)


def test_login_issues_token_with_profile_and_roles(monkeypatch):
    user = SimpleNamespace(
        email="renter@example.com",
        fullname="Renter User",
        user_roles=[
            SimpleNamespace(role=SimpleNamespace(role_name="Khách hàng"))
        ]
    )
    monkeypatch.setattr(auth_services, "FIREBASE_PROJECT_ID", "test-project")
    monkeypatch.setattr(auth_services, "get_app", lambda: object())
    monkeypatch.setattr(
        auth_services.auth,
        "verify_id_token",
        lambda *_args, **_kwargs: {
            "email": "renter@example.com",
            "email_verified": True
        }
    )
    test_secret = "a-test-secret-at-least-32-characters-long"
    monkeypatch.setattr(security, "SECRET_KEY", test_secret)
    monkeypatch.setattr(security, "ACCESS_TOKEN_EXPIRE_MINUTES", "5")

    token = auth_services.login_service("firebase-id-token", FakeDatabase(user))
    payload = jwt.decode(token, test_secret, algorithms=["HS256"])

    assert payload["sub"] == "renter@example.com"
    assert payload["name"] == "Renter User"
    assert payload["email"] == "renter@example.com"
    assert payload["role"] == ["Khách hàng"]


def test_login_defaults_unassigned_users_to_customer(monkeypatch):
    user = SimpleNamespace(
        email="renter@example.com",
        fullname="Renter User",
        user_roles=[]
    )
    monkeypatch.setattr(auth_services, "FIREBASE_PROJECT_ID", "test-project")
    monkeypatch.setattr(auth_services, "get_app", lambda: object())
    monkeypatch.setattr(
        auth_services.auth,
        "verify_id_token",
        lambda *_args, **_kwargs: {
            "email": "renter@example.com",
            "email_verified": True
        }
    )
    test_secret = "a-test-secret-at-least-32-characters-long"
    monkeypatch.setattr(security, "SECRET_KEY", test_secret)
    monkeypatch.setattr(security, "ACCESS_TOKEN_EXPIRE_MINUTES", "5")

    token = auth_services.login_service("firebase-id-token", FakeDatabase(user))
    payload = jwt.decode(token, test_secret, algorithms=["HS256"])

    assert payload["role"] == ["Khách hàng"]


def test_login_rejects_unverified_firebase_email(monkeypatch):
    monkeypatch.setattr(auth_services, "FIREBASE_PROJECT_ID", "test-project")
    monkeypatch.setattr(auth_services, "get_app", lambda: object())
    monkeypatch.setattr(
        auth_services.auth,
        "verify_id_token",
        lambda *_args, **_kwargs: {
            "email": "renter@example.com",
            "email_verified": False
        }
    )

    with pytest.raises(HTTPException) as exc_info:
        auth_services.login_service("firebase-id-token", FakeDatabase(None))

    assert exc_info.value.status_code == 403
