"""Password reset via email verification code."""

from fastapi.testclient import TestClient

from app.main import app


def test_password_reset_with_verification_code() -> None:
    with TestClient(app) as client:
        email = "reset_code_user@test.com"
        password = "OldPass123!"
        new_password = "NewPass456!"

        client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": password,
                "username": "resetcode",
                "verification_code": "",
            },
        )

        send = client.post("/api/auth/send-password-reset-code", json={"email": email})
        assert send.status_code == 200, send.text
        body = send.json()
        assert body["dev_code"], "expected dev_code when SMTP is not configured"
        code = body["dev_code"]

        bad = client.post(
            "/api/auth/reset-password-with-code",
            json={"email": email, "verification_code": "000000", "new_password": new_password},
        )
        assert bad.status_code == 400

        reset = client.post(
            "/api/auth/reset-password-with-code",
            json={"email": email, "verification_code": code, "new_password": new_password},
        )
        assert reset.status_code == 200, reset.text

        old_login = client.post("/api/auth/login", json={"email": email, "password": password})
        assert old_login.status_code == 401

        new_login = client.post("/api/auth/login", json={"email": email, "password": new_password})
        assert new_login.status_code == 200, new_login.text
