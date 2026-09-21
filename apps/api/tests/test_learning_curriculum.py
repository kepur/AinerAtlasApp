from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import (
    Conversation,
    ExpressionAsset,
    GameSession,
    LanguagePracticeAttempt,
    UserMastery,
    VocabularyItem,
)
from app.services.game_prompts import language_prompt
from app.services.learning_curriculum import MODULES, language_pack
from app.services.practice import generate_exercise
from app.services.vocab_practice import generate_vocab_exercise, grade_vocab_answer


def register(client):
    result = client.post(
        "/api/auth/register",
        json={
            "email": f"learning-{uuid4().hex}@test.com",
            "password": "testpass123",
            "username": "learner",
        },
    )
    assert result.status_code == 201, result.text
    user = result.json()
    return {"Authorization": f"Bearer {user['access_token']}"}, user["user"]["id"]


@pytest.mark.parametrize("code", ["sr", "en", "es", "fr", "de", "ja", "ko"])
def test_packs_are_complete_and_all_assessments_have_unique_answers(code):
    pack = language_pack(code)
    assert list(pack["lessons"]) == [m[0] for m in MODULES]
    for module, lessons in pack["lessons"].items():
        assert len(lessons) >= 5
        assert len({r["id"] for r in lessons}) == len(lessons)
        for lesson in lessons:
            assert len(lesson["options"]) == 4
            assert len(set(lesson["options"])) == 4
            assert lesson["answer"] in lesson["options"]
            item = UserMastery(
                item_id=f"curriculum:{code}:{module}:{lesson['id']}",
                language_code=code,
                title=lesson["answer"],
            )
            exercise = generate_exercise(item)
            assert exercise.correct_answer == lesson["answer"]
            assert not any("Maybe " in o or "I think about" in o for o in exercise.options)
    if code == "sr":
        assert {r["target"] for r in pack["lessons"]["structure"]} >= {
            "U Beogradu sam.",
            "Idem u Beograd.",
            "Dolazim iz Beograda.",
        }
    if code == "ja":
        assert any("助词" in r["rule"] for r in pack["lessons"]["structure"])


@pytest.mark.parametrize(
    "code,word,wrong", [("ja", "水", "切符"), ("ko", "물", "표"), ("sr", "čaj", "caj")]
)
def test_unicode_grading_never_collapses_different_answers(code, word, wrong):
    item = VocabularyItem(
        user_id="test", word=word, meaning="水 / 茶", language_code=code, examples=[word]
    )
    exercise = generate_vocab_exercise(item)
    assert grade_vocab_answer(exercise, word)
    assert not grade_vocab_answer(exercise, wrong)
    assert not grade_vocab_answer(exercise, "")
    assert "People often" not in exercise.hint
    assert "important" not in exercise.options


def test_ordered_progress_retries_reviews_and_language_isolation():
    with TestClient(app) as client:
        headers, uid = register(client)

        def get(path):
            r = client.get(path, headers=headers)
            assert r.status_code == 200, r.text
            return r.json()

        pack = language_pack("sr")
        path = get("/api/learning/path?language=sr")
        assert [m["unlocked"] for m in path["modules"]] == [True, False, False, False]

        def answer(module, lesson, value=None, request_id=None):
            return client.post(
                f"/api/learning/modules/{module}/answer",
                headers=headers,
                json={
                    "language": "sr",
                    "lesson_id": lesson["id"],
                    "answer": value or lesson["answer"],
                    "request_id": request_id or str(uuid4()),
                },
            )

        assert answer("structure", pack["lessons"]["structure"][0]).status_code == 409
        assert answer("foundations", pack["lessons"]["foundations"][1]).status_code == 409
        first = pack["lessons"]["foundations"][0]
        wrong = next(o for o in first["options"] if o != first["answer"])
        request_id = str(uuid4())
        response = answer("foundations", first, wrong, request_id)
        assert response.status_code == 200, response.text
        assert response.json()["correct"] is False
        assert answer("foundations", first, wrong, request_id).json() == response.json()
        state = get("/api/learning/modules/foundations?language=sr")
        assert state["state"]["mistakes"] == [first["id"]]
        assert "answer" not in state["lessons"][0]
        assert get("/api/learning/summary?language=sr")["practice"]["today_count"] == 1
        for module, *_ in MODULES:
            for lesson in pack["lessons"][module]:
                response = answer(module, lesson)
                assert response.status_code == 200, response.text
                assert response.json()["correct"] is True
        sr = get("/api/learning/path?language=sr")
        assert sr["completed"] == sr["total"]
        assert sr["practice"]["due_review_count"] == 0
        assert get("/api/learning/path?language=fr")["completed"] == 0
        other_headers, _ = register(client)
        assert (
            client.get("/api/learning/path?language=sr", headers=other_headers).json()["completed"]
            == 0
        )
        with SessionLocal() as db:
            assert (
                len(
                    db.scalars(
                        select(LanguagePracticeAttempt).where(
                            LanguagePracticeAttempt.user_id == uid
                        )
                    ).all()
                )
                == sr["total"] + 1
            )
            # Only word lessons become vocabulary, not grammar phrases.
            assert (
                len(db.scalars(select(VocabularyItem).where(VocabularyItem.user_id == uid)).all())
                == 10
            )
            assert (
                len(db.scalars(select(UserMastery).where(UserMastery.user_id == uid)).all())
                == sr["total"] - 10
            )


def test_global_language_scopes_all_lists_and_new_sessions():
    with TestClient(app) as client:
        headers, uid = register(client)
        with SessionLocal() as db:
            for code in ["en", "ja"]:
                db.add(VocabularyItem(user_id=uid, language_code=code, word=code, meaning=code))
                db.add(
                    UserMastery(
                        user_id=uid, language_code=code, title=code, item_id=f"{code}:pattern:test"
                    )
                )
                db.add(
                    ExpressionAsset(user_id=uid, title=code, source_text=code, target_language=code)
                )
                db.add(Conversation(user_id=uid, title=code, target_language=code))
                db.add(
                    GameSession(
                        user_id=uid,
                        game_type="romance",
                        title=code,
                        target_language=code,
                        state={"target": {"id": "mia"}},
                    )
                )
            db.commit()
        switched = client.post(
            "/api/survival-sprint/select-language", headers=headers, json={"language": "ja"}
        )
        assert switched.status_code == 200
        for endpoint, field in [
            ("/vocabulary", "language_code"),
            ("/vocabulary/queue", "language_code"),
            ("/grammar/queue", "language_code"),
            ("/grammar/mastery", "language_code"),
            ("/conversations", "target_language"),
            ("/assets", "target_language"),
            ("/games/sessions", "target_language"),
        ]:
            response = client.get("/api" + endpoint, headers=headers)
            assert response.status_code == 200, response.text
            assert response.json() and {r[field] for r in response.json()} == {"ja"}
        for endpoint in ["/grammar/practice/batch", "/vocabulary/practice/batch"]:
            response = client.get("/api" + endpoint, headers=headers).json()
            assert response["total_remaining"] == 1
            assert {r["language_code"] for r in response["items"]} == {"ja"}
        created = client.post("/api/conversations", headers=headers, json={"title": "日本語"})
        assert created.status_code == 200, created.text
        assert created.json()["target_language"] == "ja"
        created = client.post(
            "/api/games/sessions",
            headers=headers,
            json={"game_type": "romance", "config": {"target_id": "mia"}},
        )
        assert created.status_code == 200, created.text
        assert created.json()["target_language"] == "ja"
        resumed = client.get(
            "/api/games/sessions/resume?game_type=romance&target_id=mia", headers=headers
        )
        assert resumed.status_code == 200 and resumed.json()["target_language"] == "ja"
        report = client.get("/api/learning/summary", headers=headers).json()
        assert report["language"] == "ja" and report["assets"] == 1 and report["vocabulary"] == 1
        assert client.get("/api/learning/path?language=xx", headers=headers).status_code == 422
        candidate = client.post(
            "/api/grammar/candidate", headers=headers, json={"pattern": "これは何ですか。"}
        )
        assert candidate.status_code == 200, candidate.text
        assert candidate.json()["language_code"] == "ja"
        cached = client.post("/api/vocabulary/explain", headers=headers, json={"token": "ja"})
        assert cached.status_code == 200, cached.text
        assert cached.json()["meaning"] == "ja"


def test_game_prompt_contract_preserves_wire_keys_not_english_instruction():
    prompt = language_prompt('Your response in English. 英语教练。{"text_en":"英文回答"}', "ja")
    assert "text_en" in prompt
    assert "Your response in English" not in prompt
    assert "Japanese" in prompt and "助词" in prompt


def test_registered_language_pack_can_supply_its_own_module_order(monkeypatch):
    from app.services import learning_curriculum as curriculum

    monkeypatch.setattr(curriculum, "PACK_BUILDERS", dict(curriculum.PACK_BUILDERS))
    monkeypatch.setattr(curriculum, "COURSE_LANGUAGES", dict(curriculum.COURSE_LANGUAGES))
    curriculum.register_language_pack(
        "test",
        {"name": "测试语言", "native_name": "Test", "locale": "test", "voice": "test"},
        lambda code: {
            "modules": [("sound", "发音起步", "自定义前置模块", "hearing")],
            "lessons": {
                "sound": [
                    {
                        "id": "sound-1",
                        "title": "发音",
                        "target": "a",
                        "meaning": "a",
                        "rule": "a",
                        "prompt": "选 a",
                        "answer": "a",
                        "options": ["a", "b", "c", "d"],
                    }
                ]
            },
        },
    )
    pack = curriculum.language_pack("test")
    path = curriculum.path_payload(SimpleNamespace(state={}), pack)
    assert path["next_module"] == "sound" and path["total"] == 1
    assert path["modules"][0]["unlocked"]
    with pytest.raises(ValueError, match="already registered"):
        curriculum.register_language_pack("test", {}, lambda _: {})
