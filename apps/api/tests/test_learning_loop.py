from uuid import uuid4

from fastapi.testclient import TestClient
from redis import Redis

from app.main import app


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


def _register_user(client: TestClient, *, email: str, username: str) -> dict:
    send = client.post("/api/auth/send-verification-code", json={"email": email})
    assert send.status_code == 200
    dev_code = send.json().get("dev_code")
    assert dev_code

    register = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "ChangeMe123!",
            "username": username,
            "verification_code": dev_code,
        },
    )
    assert register.status_code == 201
    return register.json()


def test_pattern_mining_and_vocabulary_after_message() -> None:
    redis_client = _configure_rate_limit_bypass()
    email = f"mining-{uuid4().hex[:8]}@example.com"

    with TestClient(app) as client:
        register = _register_user(client, email=email, username="mining-user")
        headers = {"Authorization": f"Bearer {register['access_token']}"}

        conversation = client.post(
            "/api/conversations",
            json={"title": "Vocab test", "topic": "migration", "native_language": "zh", "target_language": "en"},
            headers=headers,
        )
        conversation_id = conversation.json()["id"]

        message = client.post(
            f"/api/conversations/{conversation_id}/messages",
            json={"content": "欧洲生活让我感觉 suffocating", "content_language": "zh"},
            headers=headers,
        )
        assert message.status_code == 200
        assert message.json()["learning_items_added"]
        assert message.json()["user_message"]["translated_content"]
        assert message.json()["user_message"]["expression_versions"]["basic"]
        assert message.json()["user_message"]["expression_versions"]["advanced"]

        queue = client.get("/api/grammar/queue", headers=headers)
        assert queue.status_code == 200
        assert len(queue.json()) >= 1

        vocabulary = client.get("/api/vocabulary/today", headers=headers)
        assert vocabulary.status_code == 200
        assert any("stability" in item["word"] or item["word"] for item in vocabulary.json())

        memory = client.get("/api/profile/ai-memory", headers=headers)
        assert memory.status_code == 200
        assert len(memory.json()) >= 1

    redis_client.flushdb()
    _clear_rate_limit_bypass()


def test_thoughts_and_asset_versions_after_freeze() -> None:
    redis_client = _configure_rate_limit_bypass()
    email = f"thoughts-{uuid4().hex[:8]}@example.com"

    with TestClient(app) as client:
        register = _register_user(client, email=email, username="thoughts-user")
        headers = {"Authorization": f"Bearer {register['access_token']}"}

        conversation = client.post(
            "/api/conversations",
            json={"title": "Freeze thoughts", "topic": "career", "native_language": "zh", "target_language": "en"},
            headers=headers,
        )
        conversation_id = conversation.json()["id"]

        freeze = client.post(
            f"/api/conversations/{conversation_id}/freeze",
            json={"title": "Freeze thoughts"},
            headers=headers,
        )
        assert freeze.status_code == 200
        asset_id = freeze.json()["id"]

        thoughts = client.get("/api/thoughts", headers=headers)
        assert thoughts.status_code == 200
        assert len(thoughts.json()) == 1

        thought_id = thoughts.json()[0]["id"]
        detail = client.get(f"/api/thoughts/{thought_id}", headers=headers)
        assert detail.status_code == 200
        assert detail.json()["variants"]["speech_1min"]

        versions = client.get(f"/api/thoughts/{thought_id}/versions", headers=headers)
        assert versions.status_code == 200
        assert len(versions.json()) >= 1

        regen = client.post(f"/api/assets/{asset_id}/generate-variants", headers=headers)
        assert regen.status_code == 200
        assert regen.json()["current_version"] == 2

        asset_versions = client.get(f"/api/assets/{asset_id}/versions", headers=headers)
        assert asset_versions.status_code == 200
        assert len(asset_versions.json()) >= 2

    redis_client.flushdb()
    _clear_rate_limit_bypass()
