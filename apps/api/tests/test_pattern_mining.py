from uuid import uuid4

from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.deps import get_quota_manager
from app.api.routes import auth, conversations, grammar
from app.db.session import SessionLocal
from app.models import GrammarPattern, UserMastery


class UnlimitedQuotaManager:
    def consume_ai_dialogue(self, user, amount: int = 1):
        return None

    def consume_voice_minutes(self, user, minutes: int = 1):
        return None


def _override_quota_manager():
    yield UnlimitedQuotaManager()


def _build_test_app() -> FastAPI:
    app = FastAPI()
    api_router = APIRouter(prefix="/api")
    api_router.include_router(auth.router)
    api_router.include_router(conversations.router)
    api_router.include_router(grammar.router)
    app.include_router(api_router)
    return app


def _clear_overrides() -> None:
    return None


def test_dialogue_mining_populates_grammar_queue_and_pattern_table() -> None:
    app = _build_test_app()
    app.dependency_overrides[get_quota_manager] = _override_quota_manager
    email = f"mining-{uuid4().hex[:8]}@example.com"

    with TestClient(app) as client:
        register = client.post(
            "/api/auth/register",
            json={"email": email, "password": "ChangeMe123!", "username": "mining-user"},
        )
        assert register.status_code == 201
        headers = {"Authorization": f"Bearer {register.json()['access_token']}"}

        conversation = client.post(
            "/api/conversations",
            json={"title": "Mining", "topic": "migration", "native_language": "zh", "target_language": "en"},
            headers=headers,
        )
        assert conversation.status_code == 200
        conversation_id = conversation.json()["id"]

        message = client.post(
            f"/api/conversations/{conversation_id}/messages",
            json={"content": "我觉得移民更重要的是稳定和自由", "content_language": "zh"},
            headers=headers,
        )
        assert message.status_code == 200
        assert message.json()["learning_items_added"]

        queue = client.get("/api/grammar/queue", headers=headers)
        assert queue.status_code == 200
        queue_items = queue.json()
        assert any(item["item_type"] == "pattern" for item in queue_items)
        assert any(item["mastery_score"] == 20 for item in queue_items)

        with SessionLocal() as db:
            pattern = db.scalar(
                select(GrammarPattern).where(GrammarPattern.name == "not merely... but...")
            )
            mastery = db.scalar(
                select(UserMastery).where(
                    UserMastery.user_id == register.json()["user"]["id"],
                    UserMastery.item_type == "pattern",
                )
            )
            assert pattern is not None
            assert mastery is not None
            assert mastery.mastery_score == 20

            _clear_overrides()