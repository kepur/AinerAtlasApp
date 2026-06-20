from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app


def test_demo_config_enabled_by_default():
    with TestClient(app) as client:
        response = client.get("/api/auth/demo-config")
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True
        assert data["email"] == get_settings().initial_demo_email
        assert data["password"] == get_settings().initial_demo_password


def test_demo_user_can_login():
    with TestClient(app) as client:
        config = client.get("/api/auth/demo-config").json()
        assert config["enabled"] is True

        login = client.post(
            "/api/auth/login",
            json={"email": config["email"], "password": config["password"]},
        )
        assert login.status_code == 200
        assert login.json()["access_token"]


def test_demo_mode_can_be_disabled():
    settings = get_settings()
    with TestClient(app) as client:
        admin_login = client.post(
            "/api/auth/login",
            json={
                "email": settings.initial_admin_email,
                "password": settings.initial_admin_password,
            },
        )
        assert admin_login.status_code == 200
        token = admin_login.json()["access_token"]

        client.put(
            "/api/admin/auth-settings",
            headers={"Authorization": f"Bearer {token}"},
            json={"demo_mode_enabled": False},
        )
        response = client.get("/api/auth/demo-config")
        assert response.status_code == 200
        assert response.json()["enabled"] is False
        assert response.json().get("email") is None
        assert response.headers.get("cache-control") == "no-store"


def test_demo_mode_patch_endpoint():
    settings = get_settings()
    with TestClient(app) as client:
        admin_login = client.post(
            "/api/auth/login",
            json={
                "email": settings.initial_admin_email,
                "password": settings.initial_admin_password,
            },
        )
        assert admin_login.status_code == 200
        token = admin_login.json()["access_token"]

        off = client.patch(
            "/api/admin/auth-settings/demo",
            headers={"Authorization": f"Bearer {token}"},
            json={"demo_mode_enabled": False},
        )
        assert off.status_code == 200
        assert off.json()["demo_mode_enabled"] is False
        assert client.get("/api/auth/demo-config").json()["enabled"] is False

        on = client.patch(
            "/api/admin/auth-settings/demo",
            headers={"Authorization": f"Bearer {token}"},
            json={"demo_mode_enabled": True},
        )
        assert on.status_code == 200
        assert on.json()["demo_mode_enabled"] is True
        config = client.get("/api/auth/demo-config").json()
        assert config["enabled"] is True
        assert config["email"]
