from uuid import uuid4
import time
from unittest.mock import patch

from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import ConversationMessage, Thought
from app.services.llm import MockLLMProvider


def _seed_conversation_messages(conversation_id: str, *lines: tuple[str, str]) -> None:
    with SessionLocal() as db:
        for role, content in lines:
            db.add(
                ConversationMessage(
                    conversation_id=conversation_id,
                    role=role,
                    content=content,
                    content_language="zh",
                )
            )
        db.commit()


def _poll_freeze_asset(client: TestClient, conversation_id: str, headers: dict) -> dict:
    deadline = time.time() + 30
    while time.time() < deadline:
        status = client.get(
            f"/api/conversations/{conversation_id}/freeze/status",
            headers=headers,
        )
        assert status.status_code == 200
        payload = status.json()
        if payload["status"] == "done":
            assert payload.get("asset")
            return payload["asset"]
        if payload["status"] == "failed":
            raise AssertionError(payload.get("error") or "freeze failed")
        time.sleep(0.3)
    raise AssertionError("freeze timed out")


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

        _seed_conversation_messages(
            conversation_id,
            ("user", "为什么很多人想移民欧洲？"),
            ("assistant", "Many people seek stability and opportunity abroad."),
        )

        with patch(
            "app.services.conversation_freeze_service.require_llm_provider",
            return_value=MockLLMProvider(),
        ), patch(
            "app.services.conversation_freeze_service.assert_real_llm_usage",
        ):
            freeze = client.post(
                f"/api/conversations/{conversation_id}/freeze",
                json={"title": "Why Europe"},
                headers=headers,
            )
            assert freeze.status_code == 200
            assert freeze.json()["status"] in {"processing", "done"}

            payload = _poll_freeze_asset(client, conversation_id, headers)
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