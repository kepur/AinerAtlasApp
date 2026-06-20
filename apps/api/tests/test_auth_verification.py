import pytest
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models import AuthSettings

client = TestClient(app)


def test_registration_preview_google_email() -> None:
    response = client.get("/api/auth/registration-preview", params={"email": "test@gmail.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["is_google_email"] is True
    assert data["registration_trial_enabled"] is True
    assert data["registration_trial_days"] == 30
    assert data["registration_trial_membership_level"] == "vip"


def test_registration_preview_any_email() -> None:
    response = client.get("/api/auth/registration-preview", params={"email": "user@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["is_google_email"] is False
    assert data["registration_trial_enabled"] is True
    assert data["registration_trial_days"] == 30
    assert data["registration_trial_membership_level"] == "vip"


@pytest.mark.enable_email_verification
def test_register_with_verification_code_flow() -> None:
    with SessionLocal() as db:
        settings = db.get(AuthSettings, "default")
        if not settings:
            settings = AuthSettings(id="default")
            db.add(settings)
        settings.email_verification_enabled = True
        settings.registration_trial_enabled = True
        settings.registration_trial_days = 30
        settings.registration_trial_membership_level = "vip"
        db.commit()

    email = "verify-user@gmail.com"
    send = client.post("/api/auth/send-verification-code", json={"email": email})
    assert send.status_code == 200
    dev_code = send.json()["dev_code"]
    assert dev_code

    register = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "ChangeMe123!",
            "username": "verify-user",
            "verification_code": dev_code,
        },
    )
    assert register.status_code == 201
    body = register.json()
    assert body["user"]["membership_level"] == "vip"
    assert body["user"]["membership_expires_at"] is not None


def test_register_non_google_gets_registration_trial() -> None:
    with SessionLocal() as db:
        settings = db.get(AuthSettings, "default")
        if not settings:
            settings = AuthSettings(id="default")
            db.add(settings)
        settings.email_verification_enabled = False
        settings.registration_trial_enabled = True
        settings.registration_trial_days = 5
        settings.registration_trial_membership_level = "vip"
        db.commit()

    email = "plain-user@example.com"
    register = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "ChangeMe123!",
            "username": "plain-user",
            "verification_code": "",
        },
    )
    assert register.status_code == 201
    body = register.json()
    assert body["user"]["membership_level"] == "vip"
    assert body["user"]["membership_expires_at"] is not None


def test_register_without_trial_is_free() -> None:
    with SessionLocal() as db:
        settings = db.get(AuthSettings, "default")
        if not settings:
            settings = AuthSettings(id="default")
            db.add(settings)
        settings.email_verification_enabled = False
        settings.registration_trial_enabled = False
        settings.google_trial_enabled = False
        db.commit()

    email = "free-user@example.com"
    register = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "ChangeMe123!",
            "username": "free-user",
            "verification_code": "",
        },
    )
    assert register.status_code == 201
    body = register.json()
    assert body["user"]["membership_level"] == "free"
    assert body["user"]["membership_expires_at"] is None
