"""Conversation soft-delete, moderation scan, and admin visibility."""

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import Conversation, ConversationActivityLog, ConversationMessage, User


def _register(client: TestClient) -> tuple[str, str]:
    email = f"conv-{uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "testpass123", "username": "tester"},
    )
    resp = client.post("/api/auth/login", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        return token, user.id


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _admin_headers(client: TestClient) -> dict[str, str]:
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
    )
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _create_conversation_with_message(client: TestClient, token: str, content: str) -> str:
    headers = _auth(token)
    created = client.post(
        "/api/conversations",
        headers=headers,
        json={"title": "测试对话", "topic": "free-talk", "mode": "socratic"},
    )
    assert created.status_code == 200, created.text
    conv_id = created.json()["id"]
    with SessionLocal() as db:
        db.add(
            ConversationMessage(
                conversation_id=conv_id,
                user_id=None,
                role="user",
                content=content,
            )
        )
        db.commit()
    return conv_id


def test_user_soft_delete_hidden_from_list_but_visible_in_admin() -> None:
    with TestClient(app) as client:
        token, user_id = _register(client)
        headers = _auth(token)
        conv_id = _create_conversation_with_message(client, token, "hello world")

        listed = client.get("/api/conversations", headers=headers)
        assert listed.status_code == 200
        assert any(item["id"] == conv_id for item in listed.json())

        deleted = client.delete(f"/api/conversations/{conv_id}", headers=headers)
        assert deleted.status_code == 200, deleted.text
        assert deleted.json()["soft"] is True

        listed_after = client.get("/api/conversations", headers=headers)
        assert all(item["id"] != conv_id for item in listed_after.json())

        get_after = client.get(f"/api/conversations/{conv_id}", headers=headers)
        assert get_after.status_code == 404

        admin_list = client.get(
            f"/api/admin/data/conversations?include_deleted=true&user_id={user_id}",
            headers=_admin_headers(client),
        )
        assert admin_list.status_code == 200, admin_list.text
        match = next((item for item in admin_list.json()["items"] if item["id"] == conv_id), None)
        assert match is not None
        assert match["deleted_at"] is not None

        with SessionLocal() as db:
            logs = list(
                db.scalars(
                    select(ConversationActivityLog).where(
                        ConversationActivityLog.conversation_id == conv_id,
                        ConversationActivityLog.action == "conversation_soft_deleted",
                    )
                )
            )
            assert len(logs) == 1


def test_create_conversation_writes_activity_log() -> None:
    with TestClient(app) as client:
        token, user_id = _register(client)
        headers = _auth(token)
        created = client.post(
            "/api/conversations",
            headers=headers,
            json={"title": "审计测试", "topic": "free-talk", "mode": "socratic"},
        )
        assert created.status_code == 200
        conv_id = created.json()["id"]
        with SessionLocal() as db:
            logs = list(
                db.scalars(
                    select(ConversationActivityLog).where(
                        ConversationActivityLog.conversation_id == conv_id,
                        ConversationActivityLog.action == "conversation_created",
                    )
                )
            )
            assert len(logs) == 1
            assert logs[0].user_id == user_id


def test_admin_detail_includes_activity_and_messages() -> None:
    with TestClient(app) as client:
        token, _user_id = _register(client)
        conv_id = _create_conversation_with_message(client, token, "记录完整性测试")
        detail = client.get(
            f"/api/admin/data/conversations/{conv_id}",
            headers=_admin_headers(client),
        )
        assert detail.status_code == 200
        body = detail.json()
        assert len(body["messages"]) >= 1
        assert any(a["action"] == "conversation_created" for a in body.get("activity", []))


def test_admin_search_and_batch_scan_flags_sensitive_content() -> None:
    with TestClient(app) as client:
        token, _user_id = _register(client)
        conv_id = _create_conversation_with_message(client, token, "这里有诈骗信息请转账")

        admin_headers = _admin_headers(client)
        search = client.get(
            "/api/admin/data/conversations?q=诈骗",
            headers=admin_headers,
        )
        assert search.status_code == 200
        assert any(item["id"] == conv_id for item in search.json()["items"])

        scan = client.post(
            "/api/admin/data/conversations/batch-scan",
            headers=admin_headers,
            json={"ids": [conv_id], "use_llm": False},
        )
        assert scan.status_code == 200, scan.text
        assert scan.json()["flagged_conversations"] >= 1

        detail = client.get(f"/api/admin/data/conversations/{conv_id}", headers=admin_headers)
        assert detail.status_code == 200
        assert detail.json()["moderation_status"] == "flagged"

        block = client.post(
            "/api/admin/data/conversations/batch-block",
            headers=admin_headers,
            json={"ids": [conv_id], "reason": "违规测试"},
        )
        assert block.status_code == 200
        assert block.json()["blocked"] == 1

        with SessionLocal() as db:
            conv = db.get(Conversation, conv_id)
            assert conv is not None
            assert conv.moderation_status == "blocked"
