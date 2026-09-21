"""Async learning HUD: dialogue ships first, analysis lands afterwards.

Also covers the pluggable language contract that replaced the English-only
prompts, so adding a language means adding a catalog row, not editing engines.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models import GameSession
from app.services.game_hud_worker import hud_request_for_turn
from app.services.language_contract import contract, pick_native, pick_target
from app.services.learning_hud import (
    HudRequest,
    build_system_prompt,
    generate_hud,
    is_pending,
    normalize_hud,
    pending_hud,
)


# ---------------------------------------------------------------------------
# Language contract
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "code,name,script",
    [("ja", "Japanese", "japanese"), ("ko", "Korean", "hangul"),
     ("ar", "Arabic", "arabic"), ("sr", "Serbian", "cyrillic-latin")],
)
def test_contract_describes_each_target_language(code: str, name: str, script: str) -> None:
    lc = contract(code, "zh")
    assert lc.target_name == name
    assert lc.script == script
    assert lc.native_name == "Chinese (Simplified)"


def test_contract_teaching_rules_are_language_specific() -> None:
    """The whole point: a Japanese learner must not get English grammar rules."""
    ja = contract("ja", "zh").teaching_rules()
    en = contract("en", "zh").teaching_rules()
    assert ja != en
    assert "助詞" in ja or "助词" in ja  # particles, not auxiliaries
    assert "Where is" in en


def test_contract_falls_back_for_languages_without_a_feature_pack() -> None:
    """An unlisted language still yields usable guidance instead of crashing."""
    lc = contract("bn", "zh")
    assert lc.target_name == "Bengali"
    assert lc.teaching_rules()  # typology fallback
    assert lc.focus


def test_arabic_is_marked_right_to_left() -> None:
    assert contract("ar", "zh").rtl is True
    assert contract("en", "zh").rtl is False


def test_localize_retargets_legacy_english_prompts() -> None:
    lc = contract("ja", "zh")
    out = lc.localize("请用英语回答")
    assert "英语" not in out.split("【语言契约】")[0]
    assert "Japanese" in out


def test_pick_target_and_native_read_legacy_field_names() -> None:
    assert pick_target({"text_en": "hello"}, "text") == "hello"
    assert pick_target({"text": "hola", "text_en": "hello"}, "text") == "hola"
    assert pick_native({"comment_zh": "你好"}, "comment") == "你好"
    assert pick_target({}, "text", "fallback") == "fallback"


def test_hud_prompt_binds_to_the_session_language() -> None:
    req = HudRequest(user_input="他在撒谎吗？", coach_role="海龟汤提问教练")
    ja = build_system_prompt(req, contract("ja", "zh"))
    es = build_system_prompt(req, contract("es", "zh"))
    assert "Japanese" in ja and "Spanish" not in ja
    assert "Spanish" in es and "Japanese" not in es


# ---------------------------------------------------------------------------
# Async HUD contract
# ---------------------------------------------------------------------------

def test_pending_hud_is_recognised() -> None:
    assert is_pending(pending_hud())
    assert not is_pending({"main_expression": "hi", "analysis_status": "ready"})
    assert not is_pending({})
    assert not is_pending(None)


def test_normalize_hud_accepts_model_field_variations() -> None:
    hud = normalize_hud({
        "expression": "Where were you?",
        "meaning": "你在哪里？",
        "agents": [{"name": "Logic", "result": "ok"}],
    })
    assert hud["main_expression"] == "Where were you?"
    assert hud["meaning_native"] == "你在哪里？"
    assert hud["agents"][0]["agent"] == "Logic"
    assert hud["analysis_status"] == "ready"


def test_normalize_hud_marks_empty_output_as_failed() -> None:
    """An empty analysis must say so, not render as blank cards."""
    assert normalize_hud({})["analysis_status"] == "failed"
    assert normalize_hud(None)["analysis_status"] == "failed"


@pytest.mark.anyio
async def test_generate_hud_never_raises_when_the_provider_is_down() -> None:
    provider = AsyncMock()
    provider.complete_json = AsyncMock(side_effect=RuntimeError("provider down"))
    with patch("app.services.llm.require_llm_provider", return_value=provider):
        hud = await generate_hud(
            MagicMock(),
            target_language="ja",
            native_language="zh",
            request=HudRequest(user_input="こんにちは"),
        )
    assert hud["analysis_status"] == "failed"


# ---------------------------------------------------------------------------
# Engine wiring
# ---------------------------------------------------------------------------

def _session(game_type: str) -> GameSession:
    return GameSession(
        id="s1", user_id="u1", game_type=game_type, title="t",
        target_language="ja", native_language="zh", phase="questioning", state={},
    )


@pytest.mark.parametrize(
    "game_type,action,expect",
    [
        ("turtle_soup", "question", True),
        ("turtle_soup", "start", False),      # nothing to learn from a menu action
        ("detective", "interrogate", True),
        ("roleplay", "message", True),
        ("roleplay", "choice", False),
    ],
)
def test_engines_describe_which_turns_are_teachable(
    game_type: str, action: str, expect: bool
) -> None:
    turn = SimpleNamespace(
        action_type=action, user_input="他昨晚在哪里？", ai_response={"answer": "YES"},
    )
    assert (hud_request_for_turn(_session(game_type), turn) is not None) is expect


def test_roleplay_skips_bare_choice_labels() -> None:
    """A one-letter menu pick is not a sentence worth analysing."""
    turn = SimpleNamespace(action_type="message", user_input="A", ai_response={})
    assert hud_request_for_turn(_session("roleplay"), turn) is None


def test_turtle_soup_request_quotes_the_verdict_for_context() -> None:
    turn = SimpleNamespace(
        action_type="question",
        user_input="他是凶手吗？",
        ai_response={"answer": "NO", "comment": "方向偏了"},
    )
    req = hud_request_for_turn(_session("turtle_soup"), turn)
    assert req is not None
    assert "NO" in req.context and "方向偏了" in req.context
    assert req.prompt_key == "turtle_soup.hud"


# ---------------------------------------------------------------------------
# End-to-end over HTTP: the turn endpoint and its catch-up
# ---------------------------------------------------------------------------

def _token(client) -> str:
    resp = client.post(
        "/api/auth/login",
        json={"email": "demo@ainerspeak.com", "password": "Demo123!"},
    )
    if resp.status_code != 200:
        resp = client.post(
            "/api/auth/login",
            json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
        )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def test_turn_returns_dialogue_before_analysis_then_catches_up() -> None:
    """A turtle-soup question answers immediately and gains its HUD after."""
    from fastapi.testclient import TestClient

    from app.main import app

    judge = {"answer": "YES", "clue_found": False, "comment": "问得好"}
    hud = {
        "main_expression": "Did he leave the train on purpose?",
        "meaning_native": "他是故意离开火车的吗？",
        "variants": {"natural_spoken": "Did he get off on purpose?"},
        "why_this_expression": [{"point": "on purpose", "explanation": "表示故意"}],
        "patterns_v2": [{"pattern": "Did he ...?", "example": "Did he leave?", "add_to_crush": True}],
        "vocabulary": ["on purpose"],
        "agents": [{"agent": "Question Coach", "result": "方向对了"}],
    }

    provider = AsyncMock()
    provider.complete_json = AsyncMock(side_effect=[judge, hud])

    with patch("app.services.turtle_soup_engine._provider_for", return_value=provider), \
         patch("app.services.llm.require_llm_provider", return_value=provider):
        with TestClient(app) as client:
            headers = {"Authorization": f"Bearer {_token(client)}"}

            created = client.post(
                "/api/games/sessions",
                headers=headers,
                json={"game_type": "turtle_soup", "config": {"case_id": "passenger"}},
            )
            assert created.status_code == 200, created.text
            sid = created.json()["id"]

            turn = client.post(
                f"/api/games/sessions/{sid}/turns",
                headers=headers,
                json={"action_type": "question", "user_input": "他是故意下车的吗？"},
            )
            assert turn.status_code == 200, turn.text
            body = turn.json()

            # The judge's verdict is already here...
            assert body["turn"]["ai_response"]["answer"] == "YES"
            # ...while the learning analysis is still pending on the response.
            assert body["turn"]["hud"]["analysis_status"] == "pending"

            # BackgroundTasks has run by the time TestClient returns, so the
            # catch-up endpoint serves the finished analysis.
            turn_id = body["turn"]["id"]
            caught = client.get(
                f"/api/games/sessions/{sid}/turns/{turn_id}/hud", headers=headers
            )
            assert caught.status_code == 200, caught.text
            got = caught.json()["hud"]
            assert got["main_expression"] == hud["main_expression"]
            assert got["analysis_status"] == "ready"


# ---------------------------------------------------------------------------
# Freeze: one pipeline, two sources
# ---------------------------------------------------------------------------

def _stub_session(*, id: str = "g1", user_id: str = "u1", turns=()) -> SimpleNamespace:
    """A game session shaped like the ORM row, without the ORM."""
    return SimpleNamespace(
        id=id, user_id=user_id, game_type="turtle_soup", title="消失的乘客",
        target_language="en", native_language="zh", turns=list(turns),
    )


def test_game_source_collects_dialogue_and_taught_expressions() -> None:
    """The frozen transcript covers what was said AND what the HUD taught."""
    from app.services.conversation_freeze_service import game_source

    session = _stub_session(
        turns=[
            SimpleNamespace(
                user_input="他是故意下车的吗？",
                hud={"main_expression": "Did he get off on purpose?",
                     "meaning_native": "他是故意下车的吗？"},
                feed_items=[
                    {"type": "user_question", "text": "他是故意下车的吗？"},  # echo, skipped
                    {"type": "judge_answer", "answer": "YES", "speaker": "裁判"},
                ],
            ),
        ],
    )

    db = MagicMock()
    db.get.return_value = session
    source = game_source(db, "g1", "u1")

    assert source.kind == "game"
    assert source.source_id == "g1"
    assert source.target_language == "en"
    assert "user: 他是故意下车的吗？" in source.text
    assert "learned: Did he get off on purpose?" in source.text
    assert "裁判: YES" in source.text
    # The player's own line appears once, not twice.
    assert source.text.count("他是故意下车的吗？") == 2  # user line + its gloss


def test_game_source_rejects_an_unplayed_session() -> None:
    from app.services.conversation_freeze_service import game_source

    session = _stub_session(id="g2", turns=[])
    db = MagicMock()
    db.get.return_value = session

    with pytest.raises(ValueError, match="游戏内容为空"):
        game_source(db, "g2", "u1")


def test_game_source_refuses_another_users_session() -> None:
    from app.services.conversation_freeze_service import game_source

    session = _stub_session(id="g3", user_id="someone-else", turns=[])
    db = MagicMock()
    db.get.return_value = session

    with pytest.raises(ValueError, match="Session not found"):
        game_source(db, "g3", "u1")


def test_freeze_job_scopes_do_not_collide() -> None:
    """A conversation and a game sharing an id must not overwrite each other."""
    from app.services.freeze_job_store import freeze_job_store

    freeze_job_store.set("conversation", "same-id", "u1", {"status": "processing"})
    freeze_job_store.set("game", "same-id", "u1", {"status": "done", "asset": {"id": "a1"}})

    assert freeze_job_store.get("conversation", "same-id", "u1")["status"] == "processing"
    assert freeze_job_store.get("game", "same-id", "u1")["status"] == "done"


def test_game_freeze_produces_a_thought_asset_over_http() -> None:
    """Playing a game and freezing it yields the same asset shape as Chat."""
    from fastapi.testclient import TestClient

    from app.main import app
    from app.schemas import ConversationAIResult

    judge = {"answer": "YES", "clue_found": False, "comment": "好问题"}
    hud = {
        "main_expression": "Did he get off on purpose?",
        "meaning_native": "他是故意下车的吗？",
        "variants": {"natural_spoken": "Did he get off on purpose?"},
        "why_this_expression": [{"point": "on purpose", "explanation": "表示故意"}],
        "patterns_v2": [{"pattern": "Did he ...?", "example": "Did he leave?", "add_to_crush": True}],
        "vocabulary": ["on purpose"],
        "agents": [{"agent": "Question Coach", "result": "方向对了"}],
    }

    provider = AsyncMock()
    provider.complete_json = AsyncMock(side_effect=[judge, hud])
    provider.generate_expression_asset = AsyncMock(
        return_value=ConversationAIResult(
            main_reply_native="你在练习是非问句",
            main_reply_target="Did he get off on purpose?",
            suggested_expression="Did he get off on purpose?",
            keywords=["on purpose"],
            patterns=["Did he ...?"],
        )
    )

    with patch("app.services.turtle_soup_engine._provider_for", return_value=provider), \
         patch("app.services.llm.require_llm_provider", return_value=provider), \
         patch(
             # The freeze service binds these at import time, so the module's own
             # names must be patched, not app.services.llm's.
             "app.services.conversation_freeze_service.require_llm_provider",
             return_value=provider,
         ), \
         patch(
             "app.services.conversation_freeze_service.assert_real_llm_usage",
             return_value=None,
         ), \
         patch(
             # Token-cost accounting reads numeric usage off the provider; it is
             # not part of what freezing does, so keep it out of the way.
             "app.services.conversation_freeze_service._write_usage_log",
             return_value=None,
         ):
        with TestClient(app) as client:
            headers = {"Authorization": f"Bearer {_token(client)}"}
            sid = client.post(
                "/api/games/sessions",
                headers=headers,
                json={"game_type": "turtle_soup", "config": {"case_id": "passenger"}},
            ).json()["id"]

            client.post(
                f"/api/games/sessions/{sid}/turns",
                headers=headers,
                json={"action_type": "question", "user_input": "他是故意下车的吗？"},
            )

            started = client.post(
                f"/api/games/sessions/{sid}/freeze", headers=headers, json={"title": None}
            )
            assert started.status_code == 200, started.text

            # BackgroundTasks has already run under TestClient.
            status = client.get(
                f"/api/games/sessions/{sid}/freeze/status", headers=headers
            )
            assert status.status_code == 200, status.text
            body = status.json()
            assert body["status"] == "done", body
            assert body["asset"]["title"]
            assert body["asset"]["target_language"] == "en"

            # The transcript the LLM saw includes the taught expression.
            source_text = provider.generate_expression_asset.await_args.args[0]
            assert "user: 他是故意下车的吗？" in source_text
            assert "learned: Did he get off on purpose?" in source_text


def test_game_freeze_rejects_an_unplayed_session() -> None:
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as client:
        headers = {"Authorization": f"Bearer {_token(client)}"}
        sid = client.post(
            "/api/games/sessions",
            headers=headers,
            json={"game_type": "turtle_soup", "config": {"case_id": "passenger"}},
        ).json()["id"]

        resp = client.post(
            f"/api/games/sessions/{sid}/freeze", headers=headers, json={"title": None}
        )
        assert resp.status_code == 400
        assert "无法 Freeze" in resp.json()["detail"]
