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


class FakeQuotaManager:
    def __init__(self) -> None:
        self.redis = FakeRedis()

    def reset(self) -> None:
        self.redis.storage.clear()

    def consume_ai_dialogue(self, user, amount: int = 1):
        from app.db.redis import QuotaManager

        return QuotaManager(self.redis).consume_ai_dialogue(user, amount)

    def consume_voice_minutes(self, user, minutes: int = 1):
        from app.db.redis import QuotaManager

        return QuotaManager(self.redis).consume_voice_minutes(user, minutes)


shared_quota_manager = FakeQuotaManager()


def override_quota_manager():
    yield shared_quota_manager


VOICE_REPORT_SCORE_KEYS = ("fluency", "grammar", "vocabulary", "naturalness", "confidence")


def _assert_voice_report_contract(body: dict, session_id: str) -> None:
    assert body["session_id"] == session_id
    assert isinstance(body["provider"], str) and body["provider"]
    assert isinstance(body["duration_seconds"], int)
    assert isinstance(body["transcript"], str)
    assert isinstance(body["summary"], str) and body["summary"]
    assert isinstance(body["top_corrections"], list)
    assert isinstance(body["highlights"], list)
    assert isinstance(body["filler_words"], list)
    assert isinstance(body["pause_feedback"], list) and body["pause_feedback"]
    assert isinstance(body["recommended_practice"], list) and body["recommended_practice"]

    scores = body["scores"]
    assert isinstance(scores, dict)
    for key in VOICE_REPORT_SCORE_KEYS:
        assert key in scores
        assert isinstance(scores[key], (int, float))


def _admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_user_detail_and_costs() -> None:
    with TestClient(app) as client:
        headers = _admin_headers(client)
        users = client.get("/api/admin/users", headers=headers)
        assert users.status_code == 200
        user_id = users.json()[0]["id"]

        detail = client.get(f"/api/admin/users/{user_id}", headers=headers)
        assert detail.status_code == 200
        body = detail.json()
        assert body["id"] == user_id
        assert "stats" in body
        assert "conversations" in body["stats"]

        costs = client.get("/api/admin/costs", headers=headers)
        assert costs.status_code == 200
        assert "today_total" in costs.json()
        assert "by_provider" in costs.json()


def test_membership_plan_update_and_audit_log() -> None:
    with TestClient(app) as client:
        headers = _admin_headers(client)
        plans = client.get("/api/admin/membership-plans", headers=headers)
        assert plans.status_code == 200
        free_plan = next(item for item in plans.json() if item["level"] == "free")

        updated = client.put(
            f"/api/admin/membership-plans/{free_plan['id']}",
            headers=headers,
            json={
                "display_name": "Free",
                "daily_ai_dialogue": 3,
                "daily_voice_minutes": 0,
                "daily_freeze_count": 1,
                "asset_limit": 20,
                "daily_match_cards": 1,
                "match_batch_size": 1,
                "enabled": True,
            },
        )
        assert updated.status_code == 200
        assert updated.json()["daily_ai_dialogue"] == 3

        logs = client.get("/api/admin/audit-logs", headers=headers)
        assert logs.status_code == 200
        log_items = logs.json().get("items", logs.json())
        assert any(log["action"] == "update_membership_plan" for log in log_items)


def test_voice_tts_transcribe_evaluate_and_report() -> None:
    shared_quota_manager.reset()
    app.dependency_overrides[get_quota_manager] = override_quota_manager
    try:
        with TestClient(app) as client:
            email = f"voice-{uuid4().hex[:8]}@example.com"
            auth = client.post(
                "/api/auth/register",
                json={"email": email, "password": "ChangeMe123!", "username": "voice-user"},
            )
            assert auth.status_code == 201
            token = auth.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            tts = client.post(
                "/api/voice/tts",
                json={"text": "Hello from AinerSpeak", "voice": "warm-neutral", "speed": 1.0},
            )
            assert tts.status_code == 200
            tts_body = tts.json()
            assert "text" in tts_body
            assert "provider" in tts_body

            transcribe = client.post(
                "/api/voice/transcribe",
                json={"audio_base64": "dGVzdA==", "language": "en"},
            )
            assert transcribe.status_code == 200
            assert transcribe.json()["text"]

            evaluate = client.post(
                "/api/voice/evaluate",
                json={
                    "audio_base64": "dGVzdA==",
                    "reference_text": "I think Europe has more freedom",
                },
            )
            assert evaluate.status_code == 200
            eval_body = evaluate.json()
            assert "fluency_score" in eval_body
            assert "accuracy_score" in eval_body

            session = client.post(
                "/api/voice/session",
                json={"target_language": "en", "mode": "push-to-talk"},
                headers=headers,
            )
            assert session.status_code == 429

        with TestClient(app) as admin_client:
            admin_headers = _admin_headers(admin_client)
            users = admin_client.get("/api/admin/users", headers=admin_headers)
            user = next(item for item in users.json() if item["email"] == email)
            admin_client.put(
                f"/api/admin/users/{user['id']}/membership",
                headers=admin_headers,
                json={"membership_level": "vip", "status": "active", "membership_expires_at": None},
            )

        with TestClient(app) as client:
            token = client.post(
                "/api/auth/login",
                json={"email": email, "password": "ChangeMe123!"},
            ).json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            session = client.post(
                "/api/voice/session",
                json={"target_language": "en", "mode": "push-to-talk"},
                headers=headers,
            )
            assert session.status_code == 200
            session_id = session.json()["id"]

            report = client.post(
                f"/api/voice/session/{session_id}/complete",
                headers=headers,
                json={
                    "duration_seconds": 42,
                    "transcript": "I think Europe has more freedom",
                    "evaluations": [
                        {
                            "fluency_score": 78,
                            "accuracy_score": 74,
                            "top_corrections": [{"word": "freedom", "spoken": "freedum"}],
                        }
                    ],
                },
            )
            assert report.status_code == 200
            report_body = report.json()
            _assert_voice_report_contract(report_body, session_id)
            assert report_body["scores"]["fluency"] == 78
            assert report_body["scores"]["grammar"] == 76.0
            assert report_body["top_corrections"] == [{"word": "freedom", "spoken": "freedum"}]
            assert report_body["highlights"]

            fetched = client.get(f"/api/voice/session/{session_id}/report", headers=headers)
            assert fetched.status_code == 200
            assert fetched.json() == report_body
    finally:
        app.dependency_overrides.clear()


def test_voice_report_persists_extended_evaluation_fields() -> None:
    shared_quota_manager.reset()
    app.dependency_overrides[get_quota_manager] = override_quota_manager
    try:
        with TestClient(app) as client:
            email = f"voice-ext-{uuid4().hex[:8]}@example.com"
            auth = client.post(
                "/api/auth/register",
                json={"email": email, "password": "ChangeMe123!", "username": "voice-ext"},
            )
            assert auth.status_code == 201
            token = auth.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

        with TestClient(app) as admin_client:
            admin_headers = _admin_headers(admin_client)
            users = admin_client.get("/api/admin/users", headers=admin_headers)
            user = next(item for item in users.json() if item["email"] == email)
            admin_client.put(
                f"/api/admin/users/{user['id']}/membership",
                headers=admin_headers,
                json={"membership_level": "vip", "status": "active", "membership_expires_at": None},
            )

        with TestClient(app) as client:
            token = client.post(
                "/api/auth/login",
                json={"email": email, "password": "ChangeMe123!"},
            ).json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            session_id = client.post(
                "/api/voice/session",
                json={"target_language": "en", "mode": "push-to-talk"},
                headers=headers,
            ).json()["id"]

            report = client.post(
                f"/api/voice/session/{session_id}/complete",
                headers=headers,
                json={
                    "duration_seconds": 55,
                    "transcript": "um I think um Europe has more freedom actually",
                    "evaluations": [
                        {
                            "fluency_score": 72,
                            "accuracy_score": 69,
                            "top_corrections": [{"word": "Europe", "spoken": "Yurop"}],
                            "filler_words": [{"phrase": "um", "count": 2}],
                            "pause_feedback": ["句首停顿偏长，可先预读首词再开口。"],
                        }
                    ],
                },
            )
            assert report.status_code == 200
            report_body = report.json()
            _assert_voice_report_contract(report_body, session_id)
            assert report_body["filler_words"] == [{"phrase": "um", "count": 2}]
            assert report_body["pause_feedback"] == ["句首停顿偏长，可先预读首词再开口。"]
            assert any("Europe" in item for item in report_body["recommended_practice"])

            fetched = client.get(f"/api/voice/session/{session_id}/report", headers=headers)
            assert fetched.status_code == 200
            assert fetched.json() == report_body
    finally:
        app.dependency_overrides.clear()
