from fastapi.testclient import TestClient

from app.main import create_app


def _configure_rate_limits(test_app) -> None:
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

    test_app.state.rate_limit_redis = FakeRedis()
    test_app.state.rate_limit_ip_limits = {"anonymous": 10000, "authenticated": 10000}
    test_app.state.rate_limit_user_limits = {
        "free": 10000,
        "vip": 10000,
        "pro": 10000,
        "premium": 10000,
        "admin": 10000,
        "super_admin": 10000,
    }


def test_error_middleware_returns_500_with_request_id() -> None:
    app = create_app()
    _configure_rate_limits(app)

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("boom")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/boom")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert response.headers.get("x-request-id")