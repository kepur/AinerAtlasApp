"""Admin topic/circle delete and conversation soft-delete."""

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models import CircleRoom, Conversation, Topic, User


def _admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_admin_delete_topic_cascades_circle() -> None:
    with TestClient(app) as client:
        headers = _admin_headers(client)
        with SessionLocal() as db:
            admin = db.query(User).filter(User.email == "admin@ainerspeak.com").first()
            assert admin is not None
            topic = Topic(creator_id=admin.id, title="Delete Me Topic")
            db.add(topic)
            db.flush()
            circle = CircleRoom(creator_id=admin.id, topic_id=topic.id, title="Linked Circle")
            db.add(circle)
            db.commit()
            topic_id = topic.id
            circle_id = circle.id

        resp = client.delete(f"/api/admin/topics/{topic_id}", headers=headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["deleted"] is True

        with SessionLocal() as db:
            assert db.get(Topic, topic_id) is None
            assert db.get(CircleRoom, circle_id) is None


def test_admin_soft_delete_conversation() -> None:
    with TestClient(app) as client:
        headers = _admin_headers(client)
        with SessionLocal() as db:
            admin = db.query(User).filter(User.email == "admin@ainerspeak.com").first()
            assert admin is not None
            conv = Conversation(user_id=admin.id, title="Soft delete target", mode="chat")
            db.add(conv)
            db.commit()
            conv_id = conv.id

        resp = client.post(f"/api/admin/data/conversations/{conv_id}/soft-delete", headers=headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["soft"] is True

        with SessionLocal() as db:
            row = db.get(Conversation, conv_id)
            assert row is not None
            assert row.deleted_at is not None
            assert row.deleted_by == "admin"

        hard = client.delete(f"/api/admin/data/conversations/{conv_id}", headers=headers)
        assert hard.status_code == 200
        with SessionLocal() as db:
            assert db.get(Conversation, conv_id) is None
