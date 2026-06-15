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
    assert data["google_trial_enabled"] is True
    assert data["google_trial_days"] == 30


@pytest.mark.enable_email_verification
def test_register_with_verification_code_flow() -> None:
    with SessionLocal() as db:
        settings = db.get(AuthSettings, "default")
        if not settings:
            settings = AuthSettings(id="default")
            db.add(settings)
        settings.email_verification_enabled = True
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
