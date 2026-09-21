"""Tests for romance social engine — async chat_v2 HUD and clean feed."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models import GameSession
from app.services.romance_engine import RomanceEngine


def _romance_session() -> GameSession:
    return GameSession(
        id="sess-1",
        user_id="u1",
        game_type="romance",
        title="Test",
        target_language="en",
        native_language="zh",
        phase="icebreaker",
        state={
            "target": {"id": "ethan", "name": "Ethan", "name_en": "Ethan", "gender": "male", "voice": "male_warm"},
            "relationship_score": 10,
            "max_score": 100,
            "feed": [],
        },
    )


_PARSED_REPLY = {
    "character_reply": "That sounds lovely!",
    "character_reply_zh": "听起来很棒！",
    "emotion": "开心",
    "emotion_emoji": "😊",
    "relationship_change": 3,
}

_MOCK_HUD = {
    "v2": True,
    "main_expression": "I really enjoy talking with you.",
    "meaning_native": "我很享受和你聊天。",
    "why_this_expression": [
        {"point": "enjoy + gerund", "explanation": "enjoy 后接动名词 talking，表示喜欢做某事。"},
    ],
}


@pytest.mark.anyio
async def test_romance_finalize_returns_reply_without_waiting_for_analysis() -> None:
    """The character replies and the score moves immediately; the HUD is pending."""
    engine = RomanceEngine()
    session = _romance_session()

    result = await engine._finalize(
        session, session.state, session.state["target"], _PARSED_REPLY, "我也很开心", MagicMock(),
    )

    feed_types = [item["type"] for item in result["feed_items"]]
    assert feed_types == ["user_msg", "char_msg"]
    assert "hint_card" not in feed_types
    char = result["feed_items"][1]
    assert "learning_point" not in char

    # Relationship state is instant; the grammar analysis has not run yet.
    assert result["hud"]["relationship_score"] == 13
    assert result["hud"]["analysis_status"] == "pending"
    assert "main_expression" not in result["hud"]


@pytest.mark.anyio
async def test_romance_analyze_turn_hud_uses_chat_v2() -> None:
    """The background analyzer reuses the chat_v2 romance pipeline."""
    engine = RomanceEngine()
    session = _romance_session()
    turn = SimpleNamespace(user_input="我也很开心", hud={"analysis_status": "pending"})

    with patch(
        "app.services.romance_engine.analyze_romance_user_message",
        new_callable=AsyncMock,
        return_value=dict(_MOCK_HUD),
    ) as analyze:
        hud = await engine.analyze_turn_hud(MagicMock(), session, turn)

    analyze.assert_awaited_once()
    assert hud["main_expression"] == _MOCK_HUD["main_expression"]
    assert hud["analysis_status"] == "ready"


@pytest.mark.anyio
async def test_romance_learning_calls_grammar_analysis_route() -> None:
    from app.services.romance_learning import analyze_romance_user_message

    session = GameSession(
        id="sess-2",
        user_id="u1",
        game_type="romance",
        title="Test",
        target_language="en",
        native_language="zh",
        phase="icebreaker",
        state={},
    )
    mock_provider = MagicMock()
    mock_provider.chat_v2 = AsyncMock(return_value={
        "main_expression": "Nice to meet you.",
        "meaning_native": "很高兴认识你。",
        "why_this_expression": [],
        "variants": {},
        "patterns": [],
        "vocabulary": [],
        "agents": [],
        "next_question": {},
    })
    db = MagicMock()

    with patch("app.services.romance_learning.resolve_llm_provider_for_task", return_value="deepseek"), patch(
        "app.services.romance_learning.require_llm_provider",
        return_value=mock_provider,
    ):
        hud = await analyze_romance_user_message(
            db, session, "你好", target={"name": "Mia", "category": "恋爱社交"},
        )

    mock_provider.chat_v2.assert_awaited_once()
    assert hud.get("main_expression") == "Nice to meet you."
