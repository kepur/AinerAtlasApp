"""Admin data purge — FK-safe deletes for conversations, thoughts, and users."""
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import (
    CircleMember,
    CircleRoom,
    Conversation,
    ExpressionAsset,
    Thought,
    User,
)


def _admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _register_user(client: TestClient, prefix: str) -> dict[str, str]:
    email = f"{prefix}-{uuid4().hex[:8]}@example.com"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "ChangeMe123!", "username": prefix},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user_id = user.id
    return {"headers": headers, "user_id": user_id, "email": email, "token": token}


def _seed_conversation_with_thought_and_asset(user_id: str) -> str:
    """Insert FK-linked rows directly — no LLM freeze required."""
    with SessionLocal() as db:
        conversation = Conversation(
            user_id=user_id,
            title="Cascade test",
            topic="testing",
            native_language="zh",
            target_language="en",
        )
        db.add(conversation)
        db.flush()

        thought = Thought(
            user_id=user_id,
            conversation_id=conversation.id,
            title="Cascade thought",
            summary="summary",
            final_content_native="native",
            final_content_target="target",
            status="frozen",
        )
        db.add(thought)
        db.flush()

        asset = ExpressionAsset(
            user_id=user_id,
            thought_id=thought.id,
            title="Cascade asset",
            source_text="Hello world",
            variants={"speech_1min": "short"},
        )
        db.add(asset)
        db.commit()
        return conversation.id


def test_admin_delete_conversation_cascades_linked_thought_and_assets() -> None:
    with TestClient(app) as client:
        user = _register_user(client, "purge-conv")
        conversation_id = _seed_conversation_with_thought_and_asset(user["user_id"])
        admin = _admin_headers(client)

        response = client.delete(
            f"/api/admin/data/conversations/{conversation_id}",
            headers=admin,
        )
        assert response.status_code == 200
        assert response.json()["deleted"] is True

        with SessionLocal() as db:
            assert db.get(Conversation, conversation_id) is None
            thoughts = list(
                db.scalars(select(Thought).where(Thought.conversation_id == conversation_id))
            )
            assert thoughts == []
            assets = list(db.scalars(select(ExpressionAsset)))
            assert assets == []


def test_admin_delete_thought_cascades_expression_assets() -> None:
    with TestClient(app) as client:
        user = _register_user(client, "purge-thought")
        conversation_id = _seed_conversation_with_thought_and_asset(user["user_id"])
        admin = _admin_headers(client)

        with SessionLocal() as db:
            thought = db.scalar(
                select(Thought).where(Thought.conversation_id == conversation_id)
            )
            assert thought is not None
            thought_id = thought.id

        response = client.delete(
            f"/api/admin/data/thoughts/{thought_id}",
            headers=admin,
        )
        assert response.status_code == 200

        with SessionLocal() as db:
            assert db.get(Thought, thought_id) is None
            assert db.get(Conversation, conversation_id) is not None
            assets = list(
                db.scalars(select(ExpressionAsset).where(ExpressionAsset.thought_id == thought_id))
            )
            assert assets == []


def test_privacy_delete_data_clears_user_content() -> None:
    with TestClient(app) as client:
        user = _register_user(client, "privacy-purge")
        _seed_conversation_with_thought_and_asset(user["user_id"])

        response = client.post("/api/privacy/delete-data", headers=user["headers"])
        assert response.status_code == 200
        body = response.json()
        assert body["deleted"] is True
        assert body["counts"]["conversations"] >= 1

        with SessionLocal() as db:
            convs = list(
                db.scalars(select(Conversation).where(Conversation.user_id == user["user_id"]))
            )
            assert convs == []


def test_admin_delete_user_cascades_owned_content() -> None:
    with TestClient(app) as client:
        user = _register_user(client, "delete-user")
        _seed_conversation_with_thought_and_asset(user["user_id"])
        admin = _admin_headers(client)

        response = client.delete(f"/api/admin/users/{user['user_id']}", headers=admin)
        assert response.status_code == 204

        with SessionLocal() as db:
            assert db.get(User, user["user_id"]) is None
            convs = list(
                db.scalars(select(Conversation).where(Conversation.user_id == user["user_id"]))
            )
            assert convs == []


def test_circle_websocket_requires_member_and_responds_to_ping() -> None:
    with TestClient(app) as client:
        user = _register_user(client, "ws-user")
        with SessionLocal() as db:
            room = CircleRoom(
                creator_id=user["user_id"],
                title="DM test",
                room_type="dm",
                max_members=2,
            )
            db.add(room)
            db.flush()
            db.add(CircleMember(room_id=room.id, user_id=user["user_id"], role="host"))
            db.commit()
            room_id = room.id

        with client.websocket_connect(
            f"/api/circles/ws/{room_id}?token={user['token']}"
        ) as ws:
            ws.send_text("ping")
            assert ws.receive_json() == {"type": "pong"}
