from collections.abc import Iterator

import pytest

import app.models  # noqa: F401
import app.api.deps as deps_module
import app.api.routes.auth as auth_routes
import app.db.redis as redis_module
from app.db.session import Base, SessionLocal, engine
from app.main import app
from app.models import AuthSettings


class FakeRedis:
    def __init__(self) -> None:
        self.storage: dict[str, int] = {}

    def ping(self) -> bool:
        return True

    def incrby(self, key: str, amount: int) -> int:
        self.storage[key] = self.storage.get(key, 0) + amount
        return self.storage[key]

    def decrby(self, key: str, amount: int) -> int:
        self.storage[key] = self.storage.get(key, 0) - amount
        return self.storage[key]

    def expire(self, key: str, seconds: int) -> bool:
        return True

    def expireat(self, key: str, when) -> bool:
        return True

    def get(self, key: str):
        val = self.storage.get(key)
        return str(val) if val is not None else None


@pytest.fixture(autouse=True)
def fresh_test_database() -> Iterator[None]:
    engine.dispose()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def configure_test_rate_limits(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    fake_redis = FakeRedis()
    app.dependency_overrides.clear()
    for attr in ["rate_limit_redis", "rate_limit_ip_limits", "rate_limit_user_limits"]:
        if hasattr(app.state, attr):
            delattr(app.state, attr)

    app.state.rate_limit_redis = fake_redis
    app.state.rate_limit_ip_limits = {"anonymous": 10000, "authenticated": 10000}
    app.state.rate_limit_user_limits = {
        "free": 10000,
        "vip": 10000,
        "pro": 10000,
        "premium": 10000,
        "admin": 10000,
        "super_admin": 10000,
    }
    monkeypatch.setattr(redis_module, "get_redis", lambda: fake_redis)
    monkeypatch.setattr(deps_module, "get_redis", lambda: fake_redis)
    yield

    app.dependency_overrides.clear()
    for attr in ["rate_limit_redis", "rate_limit_ip_limits", "rate_limit_user_limits"]:
        if hasattr(app.state, attr):
            delattr(app.state, attr)


@pytest.fixture(autouse=True)
def configure_test_auth_settings(
    request: pytest.FixtureRequest,
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[None]:
    with SessionLocal() as db:
        settings = db.get(AuthSettings, "default")
        if not settings:
            settings = AuthSettings(id="default")
            db.add(settings)
        db.commit()

    if request.node.get_closest_marker("enable_email_verification"):
        yield
        return

    original_get_auth_settings = auth_routes.get_auth_settings

    def _get_test_auth_settings(db):
        settings = original_get_auth_settings(db)
        settings.email_verification_enabled = False
        return settings

    monkeypatch.setattr(auth_routes, "get_auth_settings", _get_test_auth_settings)
    yield


@pytest.fixture(autouse=True)
def cleanup_dependency_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()
