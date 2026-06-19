"""Realtime call summary API and generator (not Freeze assets)."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.services.voice_call_summary import generate_realtime_call_summary


def test_generate_realtime_call_summary_from_turns() -> None:
    turns = [
        {
            "user_text": "I want live in Europe",
            "ai_reply": "You could say: I want to live in Europe.",
            "hud": {
                "grammar_tips": [{"pattern": "want to", "explanation": "use infinitive"}],
                "corrected_sentence": "I want to live in Europe",
                "patterns_v2": [{"pattern": "I want to …"}],
            },
        }
    ]
    report = generate_realtime_call_summary(
        session_id="sess-test",
        provider="qwen-omni-realtime",
        duration_seconds=90,
        turns=turns,
        mode="free",
    )
    assert report["turn_count"] == 1
    assert report["grammar_issues"] == 1
    assert report["naturalness_suggestions"] == 1
    assert "I want to …" in report["patterns_for_crush"]
    assert "Freeze" in report["summary"] or "通话小结" in report["summary"]
    assert report["scores"]["fluency"] > 0


def test_realtime_summary_api_persists_session() -> None:
    with TestClient(app) as client:
        email = f"rt-summary-{uuid4().hex[:8]}@example.com"
        auth = client.post(
            "/api/auth/register",
            json={"email": email, "password": "ChangeMe123!", "username": "rt-summary"},
        )
        assert auth.status_code == 201
        headers = {"Authorization": f"Bearer {auth.json()['access_token']}"}

        resp = client.post(
            "/api/voice/realtime/summary",
            headers=headers,
            json={
                "duration_seconds": 60,
                "mode": "free",
                "provider": "qwen-omni-realtime",
                "turns": [
                    {
                        "user_text": "Hello coach",
                        "ai_reply": "Hi! How are you today?",
                        "hud": {"patterns_v2": [{"pattern": "How are you"}]},
                    }
                ],
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["session_id"]
        assert body["turn_count"] == 1
        assert body["patterns_for_crush"] == ["How are you"]
        assert body["summary"]


def test_apply_recommended_vad_admin_endpoint() -> None:
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
        )
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        resp = client.post("/api/admin/voice-platform/apply-recommended-vad", headers=headers, json={})
        assert resp.status_code == 200
        body = resp.json()
        cfg = body["voice_platform_config"]
        assert cfg["omni_silence_ms"] == 1000
        assert cfg["omni_vad_type"] == "semantic_vad"
        # Second call is idempotent
        again = client.post("/api/admin/voice-platform/apply-recommended-vad", headers=headers, json={})
        assert again.status_code == 200
        assert again.json().get("applied") is False
