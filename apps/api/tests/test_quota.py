from collections.abc import Iterator
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_quota_manager
from app.main import app


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

    def expireat(self, key: str, when) -> bool:
        return True

    def get(self, key: str):
        val = self.storage.get(key)
        return str(val) if val is not None else None


class FakeQuotaManager:
    def __init__(self) -> None:
        self.redis = FakeRedis()

    def reset(self) -> None:
        self.redis.storage.clear()

    def consume_ai_dialogue(self, user, amount: int = 1):
        from app.db.redis import QuotaManager

        return QuotaManager(self.redis, db=None).consume_ai_dialogue(user, amount)

    def consume_voice_minutes(self, user, minutes: int = 1):
        from app.db.redis import QuotaManager

        return QuotaManager(self.redis, db=None).consume_voice_minutes(user, minutes)

    def consume_match_card(self, user, amount: int = 1):
        from app.db.redis import QuotaManager

        return QuotaManager(self.redis, db=None).consume_match_card(user, amount)

    def snapshot_match_cards(self, user):
        from app.db.redis import QuotaManager

        return QuotaManager(self.redis, db=None).snapshot_match_cards(user)


def override_quota_manager() -> Iterator[FakeQuotaManager]:
    yield shared_quota_manager


shared_quota_manager = FakeQuotaManager()


def test_daily_ai_dialogue_quota_returns_429_after_limit() -> None:
    shared_quota_manager.reset()
    app.dependency_overrides[get_quota_manager] = override_quota_manager
    email = f"quota-free-{uuid4().hex[:8]}@example.com"

    with TestClient(app) as client:
        auth = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": "ChangeMe123!",
                "username": "quota-free",
            },
        )
        assert auth.status_code == 201
        token = auth.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        conversation = client.post(
            "/api/conversations",
            json={"title": "Quota Test", "topic": "limits", "native_language": "zh", "target_language": "en"},
            headers=headers,
        )
        assert conversation.status_code == 200
        conversation_id = conversation.json()["id"]

        for _ in range(5):
            response = client.post(
                f"/api/conversations/{conversation_id}/messages",
                json={"content": "我想测试额度", "content_language": "zh"},
                headers=headers,
            )
            assert response.status_code == 200

        exhausted = client.post(
            f"/api/conversations/{conversation_id}/messages",
            json={"content": "第六次调用", "content_language": "zh"},
            headers=headers,
        )
        assert exhausted.status_code == 429

    app.dependency_overrides.clear()


def test_free_voice_quota_returns_429() -> None:
    shared_quota_manager.reset()
    app.dependency_overrides[get_quota_manager] = override_quota_manager
    email = f"quota-voice-{uuid4().hex[:8]}@example.com"

    with TestClient(app) as client:
        auth = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": "ChangeMe123!",
                "username": "quota-voice",
            },
        )
        assert auth.status_code == 201
        token = auth.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            "/api/voice/session",
            json={"target_language": "en", "mode": "push-to-talk"},
            headers=headers,
        )
        assert response.status_code == 429

    app.dependency_overrides.clear()