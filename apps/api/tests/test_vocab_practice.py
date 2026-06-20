"""Tests for vocabulary crush practice loop."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.models import VocabularyItem


def _register(client: TestClient) -> dict:
    email = f"vocab-{uuid4().hex[:8]}@test.com"
    send = client.post("/api/auth/send-verification-code", json={"email": email})
    code = send.json().get("dev_code")
    reg = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "testpass123",
            "username": "vocabuser",
            "verification_code": code,
        },
    )
    assert reg.status_code == 201
    return reg.json()


def test_vocab_pick_word_practice_and_batch_summary() -> None:
    with TestClient(app) as client:
        user = _register(client)
        headers = {"Authorization": f"Bearer {user['access_token']}"}
        me = client.get("/api/auth/me", headers=headers).json()

        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            item = VocabularyItem(
                user_id=me["id"],
                word="stability",
                meaning="稳定性",
                examples=["Long-term stability matters more than short-term gain."],
                mastery_status="seen",
                mastery_score=25.0,
                priority=4,
            )
            db.add(item)
            db.commit()
            db.refresh(item)
            item_id = item.id
        finally:
            db.close()

        batch = client.get("/api/vocabulary/practice/batch?size=10", headers=headers)
        assert batch.status_code == 200
        body = batch.json()
        assert body["batch_size"] >= 1
        assert len(body["items"]) >= 1
        assert len(body["exercises"]) >= 1
        assert body["exercises"][0]["exercise_token"]
        assert body["exercises"][0]["exercise"]["exercise_type"] == "pick_near_synonym"

        practice = client.get(f"/api/vocabulary/{item_id}/practice", headers=headers)
        assert practice.status_code == 200
        pdata = practice.json()
        assert pdata["exercise"]["exercise_type"] == "pick_near_synonym"
        assert "______" in pdata["exercise"]["sentence"]
        assert "稳定性" not in pdata["exercise"]["prompt"]
        assert pdata["exercise_token"]
        assert len(pdata["exercise"]["options"]) == 4
        assert "stability" in [o.lower() for o in pdata["exercise"]["options"]]
        assert "balance" in [o.lower() for o in pdata["exercise"]["options"]]

        wrong = client.post(
            f"/api/vocabulary/{item_id}/practice",
            headers=headers,
            json={"answer": "balance", "exercise_token": pdata["exercise_token"]},
        )
        assert wrong.status_code == 200
        assert wrong.json()["correct"] is False

        practice2 = client.get(f"/api/vocabulary/{item_id}/practice", headers=headers)
        token = practice2.json()["exercise_token"]

        right = client.post(
            f"/api/vocabulary/{item_id}/practice",
            headers=headers,
            json={"answer": "stability", "exercise_token": token},
        )
        assert right.status_code == 200
        assert right.json()["correct"] is True
        assert right.json()["item"]["mastery_score"] > 25.0

        summary = client.post(
            "/api/vocabulary/practice/batch-summary",
            headers=headers,
            json={
                "results": [
                    {
                        "item_id": item_id,
                        "word": "stability",
                        "meaning": "稳定性",
                        "sentence": pdata["exercise"]["sentence"],
                        "correct": True,
                        "user_answer": "stability",
                    }
                ]
            },
        )
        assert summary.status_code == 200
        sdata = summary.json()
        assert sdata["summary"]
        assert len(sdata["word_insights"]) >= 1
