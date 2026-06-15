from uuid import uuid4

from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import Thought


def _configure_rate_limit_bypass() -> Redis:
    redis_client = Redis.from_url("redis://localhost:7074/2", decode_responses=True)
    redis_client.flushdb()
    app.state.rate_limit_redis = redis_client
    app.state.rate_limit_ip_limits = {"anonymous": 100, "authenticated": 100}
    app.state.rate_limit_user_limits = {
        "free": 100,
        "vip": 100,
        "pro": 100,
        "premium": 100,
        "admin": 100,
        "super_admin": 100,
    }
    return redis_client


def _clear_rate_limit_bypass() -> None:
    for attr in ["rate_limit_redis", "rate_limit_ip_limits", "rate_limit_user_limits"]:
        if hasattr(app.state, attr):
            delattr(app.state, attr)


def test_freeze_generates_full_asset_package_and_persists_snapshot() -> None:
    redis_client = _configure_rate_limit_bypass()
    email = f"freeze-{uuid4().hex[:8]}@example.com"

    with TestClient(app) as client:
        register = client.post(
            "/api/auth/register",
            json={"email": email, "password": "ChangeMe123!", "username": "freeze-user"},
        )
        assert register.status_code == 201
        headers = {"Authorization": f"Bearer {register.json()['access_token']}"}

        conversation = client.post(
            "/api/conversations",
            json={"title": "Why Europe", "topic": "migration", "native_language": "zh", "target_language": "en"},
            headers=headers,
        )
        assert conversation.status_code == 200
        conversation_id = conversation.json()["id"]

        freeze = client.post(
            f"/api/conversations/{conversation_id}/freeze",
            json={"title": "Why Europe"},
            headers=headers,
        )
        assert freeze.status_code == 200

        payload = freeze.json()
        assert len(payload["variants"]) >= 10
        assert payload["variants"]["speech_1min"]
        assert payload["variants"]["speech_3min"]
        assert payload["variants"]["golden_quote"]

        with SessionLocal() as db:
            thought = db.scalar(
                select(Thought).where(Thought.conversation_id == conversation_id).order_by(Thought.created_at.desc())
            )
            assert thought is not None
            assert thought.freeze_payload["expression_versions"]["speech_3min"]
            assert thought.freeze_payload["golden_quote"]
            assert thought.freeze_payload["keywords"]

    redis_client.flushdb()
    _clear_rate_limit_bypass()