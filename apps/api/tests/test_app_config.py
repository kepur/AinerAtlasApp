from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_public_app_config():
    with TestClient(app) as client:
        response = client.get("/api/config/app")
        assert response.status_code == 200
        data = response.json()
        assert "enabled_locales" in data
        assert "zh" in data["enabled_locales"]
        assert "sr" in data["enabled_locales"]
        assert len(data["enabled_locales"]) >= 10
        assert data["default_theme"] in {"dark", "light"}
