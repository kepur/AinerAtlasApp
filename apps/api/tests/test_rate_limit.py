from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app


class FakeRedis:
    def __init__(self) -> None:
        self.storage: dict[str, int] = {}

    def incrby(self, key: str, amount: int) -> int:
        self.storage[key] = self.storage.get(key, 0) + amount
        return self.storage[key]

    def decrby(self, key: str, amount: int) -> int:
        self.storage[key] = self.storage.get(key, 0) - amount
        return self.storage[key]

    def expire(self, key: str, seconds: int) -> bool:
        return True


def _configure_rate_limit_test_app() -> FakeRedis:
    fake_redis = FakeRedis()
    app.state.rate_limit_redis = fake_redis
    app.state.rate_limit_ip_limits = {"anonymous": 2, "authenticated": 20}
    app.state.rate_limit_user_limits = {
        "free": 2,
        "vip": 20,
        "pro": 20,
        "premium": 20,
        "admin": 20,
        "super_admin": 20,
    }
    return fake_redis


def _clear_rate_limit_test_app() -> None:
    for attr in ["rate_limit_redis", "rate_limit_ip_limits", "rate_limit_user_limits"]:
        if hasattr(app.state, attr):
            delattr(app.state, attr)


def test_authenticated_user_limit_returns_429() -> None:
    _configure_rate_limit_test_app()
    email = f"rate-limit-user-{uuid4().hex[:8]}@example.com"

    with TestClient(app) as client:
        auth = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": "ChangeMe123!",
                "username": "rate-user",
            },
        )
        assert auth.status_code == 201
        headers = {"Authorization": f"Bearer {auth.json()['access_token']}"}

        assert client.get("/api/auth/me", headers=headers).status_code == 200
        assert client.get("/api/auth/me", headers=headers).status_code == 200
        assert client.get("/api/auth/me", headers=headers).status_code == 429

    _clear_rate_limit_test_app()


def test_anonymous_ip_limit_returns_429() -> None:
    _configure_rate_limit_test_app()

    with TestClient(app) as client:
        assert client.get("/api/auth/me").status_code == 401
        assert client.get("/api/auth/me").status_code == 401
        assert client.get("/api/auth/me").status_code == 429

    _clear_rate_limit_test_app()