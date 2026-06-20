"""Grammar crush batch — pre-generated exercises, AI only after 10 answers."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.models import UserMastery


def _register(client: TestClient) -> dict:
    email = f"grammar-{uuid4().hex[:8]}@test.com"
    send = client.post("/api/auth/send-verification-code", json={"email": email})
    code = send.json().get("dev_code")
    reg = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "testpass123",
            "username": "grammaruser",
            "verification_code": code,
        },
    )
    assert reg.status_code == 201
    return reg.json()


def test_grammar_batch_preloads_exercises_and_summary() -> None:
    with TestClient(app) as client:
        user = _register(client)
        headers = {"Authorization": f"Bearer {user['access_token']}"}
        me = client.get("/api/auth/me", headers=headers).json()

        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            item = UserMastery(
                user_id=me["id"],
                item_id="en:pattern:rather-than",
                item_type="pattern",
                title="Rather than doing...",
                language_code="en",
                examples=["Rather than doing nothing, we should act."],
                mastery_score=30.0,
                status="learning",
                priority=4,
            )
            db.add(item)
            db.commit()
            db.refresh(item)
            item_id = item.id
        finally:
            db.close()

        batch = client.get("/api/grammar/practice/batch?size=10", headers=headers)
        assert batch.status_code == 200
        body = batch.json()
        assert body["batch_size"] >= 1
        assert len(body["exercises"]) >= 1
        ex = body["exercises"][0]
        assert ex["exercise"]["exercise_type"] == "choose_natural"
        assert len(ex["exercise"]["options"]) == 4

        submit = client.post(
            f"/api/grammar/{item_id}/practice",
            headers=headers,
            json={"answer": ex["exercise"]["options"][0], "exercise_token": ex["exercise_token"]},
        )
        assert submit.status_code == 200
        assert submit.json()["correct"] in {True, False}

        summary = client.post(
            "/api/grammar/practice/batch-summary",
            headers=headers,
            json={
                "results": [
                    {
                        "item_id": item_id,
                        "title": "Rather than doing...",
                        "example": "Rather than doing nothing, we should act.",
                        "correct": True,
                        "user_answer": "Rather than doing...",
                    }
                ]
            },
        )
        assert summary.status_code == 200
        assert summary.json()["summary"]
