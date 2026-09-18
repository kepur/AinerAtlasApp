from uuid import uuid4

from fastapi.testclient import TestClient

import app.services.tts_cache as tts_cache
from app.db.session import SessionLocal
from app.main import app
from app.models import (
    AIProvider,
    AppSettings,
    LanguageCourseProgress,
    LanguagePracticeAttempt,
    LLMCallLog,
    VocabularyItem,
)
from app.services.realtime_availability import (
    all_llm_providers_recently_failed,
    realtime_dialogue_status,
)
from app.services.voice_edge_tts import _pitch_hz, _rate_percent, edge_voice_for


def _register(client: TestClient) -> tuple[dict[str, str], str]:
    email = f"sprint-{uuid4().hex[:8]}@test.com"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "testpass123", "username": "sprinter"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body["user"]["id"]


def test_survival_sprint_contains_question_set_and_persists_gap() -> None:
    with TestClient(app) as client:
        headers, user_id = _register(client)
        response = client.get("/api/survival-sprint", headers=headers)
        assert response.status_code == 200
        body = response.json()
        concepts = {item["concept_id"] for item in body["engine_items"]}
        assert {
            "Q_WHO",
            "Q_WHAT",
            "Q_WHERE",
            "Q_WHEN",
            "Q_WHY",
            "Q_HOW",
            "Q_WHICH",
            "Q_HOW_MUCH",
            "Q_WHOSE",
        }.issubset(concepts)
        assert len(body["scenarios"]) >= 3

        saved = client.post(
            "/api/survival-sprint/review-gap",
            headers=headers,
            json={"concept_id": "REPAIR_REPEAT"},
        )
        assert saved.status_code == 200
        with SessionLocal() as db:
            row = db.query(VocabularyItem).filter_by(
                user_id=user_id,
                topic="survival:REPAIR_REPEAT",
            ).one()
            assert row.language_code == "sr"
            assert row.mastery_status == "reviewing"


def test_vocabulary_ladder_counts_real_unique_mastery() -> None:
    with TestClient(app) as client:
        headers, user_id = _register(client)
        with SessionLocal() as db:
            db.add_all([
                VocabularyItem(
                    user_id=user_id,
                    word="voda",
                    meaning="水",
                    language_code="sr",
                    mastery_status="mastered",
                    mastery_score=92,
                ),
                VocabularyItem(
                    user_id=user_id,
                    word="hleb",
                    meaning="面包",
                    language_code="sr",
                    mastery_status="usable",
                    mastery_score=78,
                ),
                VocabularyItem(
                    user_id=user_id,
                    word="stanica",
                    meaning="车站",
                    language_code="sr",
                    mastery_status="reviewing",
                    mastery_score=40,
                ),
            ])
            db.commit()

        response = client.get("/api/vocabulary/ladder?language=sr-RS", headers=headers)
        assert response.status_code == 200
        body = response.json()
        assert body["collected_count"] == 3
        assert body["active_count"] == 2
        assert body["mastered_count"] == 1
        assert body["next_target"] == 500
        assert body["remaining_to_next"] == 499
        assert [row["target"] for row in body["milestones"]] == [500, 800, 1200]
        assert body["milestones"][0]["status"] == "current"


def test_multilingual_course_switch_progress_and_mistakes_are_persistent() -> None:
    with TestClient(app) as client:
        headers, user_id = _register(client)

        catalog = client.get("/api/survival-sprint/catalog", headers=headers)
        assert catalog.status_code == 200
        codes = {item["code"] for item in catalog.json()["languages"]}
        assert {"sr", "en", "es", "fr", "de", "ja", "ko"}.issubset(codes)

        selected = client.post(
            "/api/survival-sprint/select-language",
            headers=headers,
            json={"language": "es"},
        )
        assert selected.status_code == 200
        assert selected.json()["selected_language"] == "es"

        course = client.get("/api/survival-sprint?language=es", headers=headers)
        assert course.status_code == 200
        assert course.json()["course"]["locale"] == "es-ES"
        assert course.json()["course"]["voice"] == "es-ES-ElviraNeural"
        assert any(item["target"] == "qué" for item in course.json()["engine_items"])

        saved = client.put(
            "/api/survival-sprint/progress",
            headers=headers,
            json={
                "language": "es",
                "current_step": 3,
                "scenario_index": 1,
                "turn_index": 2,
            },
        )
        assert saved.status_code == 200
        assert saved.json()["current_step"] == 3

        wrong = client.post(
            "/api/survival-sprint/attempt",
            headers=headers,
            json={
                "language": "es",
                "activity_type": "scenario",
                "item_id": "REPAIR_REPEAT",
                "correct": False,
                "expected_answer": "¿Puede repetirlo?",
                "native_meaning": "请再说一次。",
            },
        )
        assert wrong.status_code == 200
        assert wrong.json()["today_count"] == 1
        assert wrong.json()["mistake_count"] == 1
        assert wrong.json()["due_review_count"] == 1

        reopened = client.get("/api/survival-sprint?language=es", headers=headers)
        progress = reopened.json()["learner"]["progress"]
        assert progress["current_step"] == 3
        assert progress["scenario_index"] == 1
        assert progress["turn_index"] == 2
        assert progress["due_review_count"] == 1

        untouched = client.get("/api/survival-sprint?language=fr", headers=headers)
        assert untouched.json()["learner"]["progress"]["current_step"] == 0

        batch = client.get(
            "/api/vocabulary/practice/batch?size=10&language=es",
            headers=headers,
        )
        assert batch.status_code == 200
        assert {item["language_code"] for item in batch.json()["items"]} == {"es"}
        assert "People often say" not in batch.json()["exercises"][0]["exercise"]["sentence"]

        with SessionLocal() as db:
            progress_rows = db.query(LanguageCourseProgress).filter_by(user_id=user_id).all()
            assert {row.language_code for row in progress_rows} == {"es", "fr"}
            assert db.query(LanguagePracticeAttempt).filter_by(user_id=user_id).count() == 1
            vocab = db.query(VocabularyItem).filter_by(
                user_id=user_id,
                language_code="es",
                topic="course:survival-sprint:REPAIR_REPEAT",
            ).one()
            assert vocab.mastery_status == "reviewing"


def test_vocabulary_queue_can_be_scoped_to_course_language() -> None:
    with TestClient(app) as client:
        headers, user_id = _register(client)
        with SessionLocal() as db:
            db.add_all([
                VocabularyItem(
                    user_id=user_id,
                    word="gracias",
                    meaning="谢谢",
                    language_code="es",
                    mastery_status="reviewing",
                ),
                VocabularyItem(
                    user_id=user_id,
                    word="merci",
                    meaning="谢谢",
                    language_code="fr",
                    mastery_status="reviewing",
                ),
            ])
            db.commit()

        queue = client.get("/api/vocabulary/queue?language=es", headers=headers)
        assert queue.status_code == 200
        assert [row["word"] for row in queue.json()] == ["gracias"]


def test_tts_cache_persists_as_frontend_static_asset(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(tts_cache, "CACHE_DIR", tmp_path)
    monkeypatch.setattr(tts_cache, "PUBLIC_URL_PREFIX", "/audio/tts")
    text = f"cached-{uuid4().hex}"
    tts_cache.set_cached_audio(text, b"ID3-audio", voice="es_edge", speed="1.0")
    response = tts_cache.cache_hit_as_response(text, voice="es_edge", speed="1.0")
    assert response is not None
    assert response["provider"] == "static-cache"
    assert response["audio_base64"] == ""
    assert response["audio_url"].startswith("/audio/tts/")
    assert list(tmp_path.glob("*.mp3"))[0].read_bytes() == b"ID3-audio"


def test_realtime_dialogue_admin_switch_disables_feature() -> None:
    with SessionLocal() as db:
        settings = AppSettings(
            id="default",
            voice_platform_config={"realtime_dialogue_enabled": False},
        )
        db.add(settings)
        db.commit()
        status = realtime_dialogue_status(db)
        assert status["enabled"] is False
        assert status["reason"] == "disabled_by_admin"


def test_edge_tts_voice_and_controls() -> None:
    assert edge_voice_for("sr-RS") == "sr-RS-SophieNeural"
    assert edge_voice_for("en-US", "en-US-GuyNeural") == "en-US-GuyNeural"
    assert _rate_percent(0.9) == "-10%"
    assert _pitch_hz(1.1) == "+5Hz"


def test_recent_failure_of_every_llm_provider_trips_runtime_circuit() -> None:
    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="qwen",
                provider_type="llm",
                api_key_encrypted="configured",
                enabled=True,
            )
        )
        db.add(
            LLMCallLog(
                provider_name="qwen",
                model_name="qwen-plus",
                method_name="analyze_voice_coach",
                status="failed",
                error="NotFoundError: 404",
            )
        )
        db.commit()
        assert all_llm_providers_recently_failed(db) is True
