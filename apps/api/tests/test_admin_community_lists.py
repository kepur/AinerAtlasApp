"""Admin paginated topic/circle lists and batch delete."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models import CircleRoom, Topic, User


def _admin_headers(client: TestClient) -> dict[str, str]:
    resp = client.post(
        "/api/auth/login",
        json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
    )
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_admin_topics_paginated_and_batch_delete() -> None:
    with TestClient(app) as client:
        headers = _admin_headers(client)
        with SessionLocal() as db:
            admin = db.query(User).filter(User.email == "admin@ainerspeak.com").first()
            assert admin is not None
            for i in range(3):
                db.add(Topic(creator_id=admin.id, title=f"Batch Topic {i}-{uuid4().hex[:4]}"))
            db.commit()

        resp = client.get("/api/admin/topics?limit=2&offset=0", headers=headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "items" in body
        assert "total" in body
        assert len(body["items"]) <= 2

        ids = [item["id"] for item in body["items"][:2]]
        batch = client.post("/api/admin/topics/batch-delete", headers=headers, json={"ids": ids})
        assert batch.status_code == 200
        assert batch.json()["deleted"] == 2


def test_admin_circles_paginated_and_batch_delete() -> None:
    with TestClient(app) as client:
        headers = _admin_headers(client)
        with SessionLocal() as db:
            admin = db.query(User).filter(User.email == "admin@ainerspeak.com").first()
            assert admin is not None
            for i in range(2):
                db.add(CircleRoom(creator_id=admin.id, title=f"Batch Circle {i}-{uuid4().hex[:4]}"))
            db.commit()

        resp = client.get("/api/admin/circles?limit=10&q=Batch Circle", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] >= 2
        ids = [item["id"] for item in body["items"][:2]]
        batch = client.post("/api/admin/circles/batch-delete", headers=headers, json={"ids": ids})
        assert batch.status_code == 200
        assert batch.json()["deleted"] == 2


def test_expression_assets_list_with_username_filter() -> None:
    with TestClient(app) as client:
        headers = _admin_headers(client)
        resp = client.get("/api/admin/data/expression-assets?limit=5&username=admin", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body
