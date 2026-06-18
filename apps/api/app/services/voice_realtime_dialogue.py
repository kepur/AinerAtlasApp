"""LLM dialogue follow-up for realtime voice sessions."""

from __future__ import annotations

from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserProfile
from app.schemas import ConversationAIResult, ProfileRead
from app.services.llm import LLMUnavailableError, get_llm_provider
from app.services.runtime_config import resolve_default_llm_provider


def _load_profile(db: Session | None, user_id: str | None) -> ProfileRead | None:
    if not db or not user_id:
        return None
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    if not profile:
        return None
    return ProfileRead.model_validate(profile)


def _result_to_response(result: ConversationAIResult) -> dict[str, Any]:
    grammar_tips = [
        {
            "pattern": tip.pattern,
            "explanation": tip.explanation,
            "importance": tip.importance,
        }
        for tip in result.grammar_tips
    ]
    reply_native = result.main_reply_native.strip()
    reply_target = result.main_reply_target.strip()
    text = reply_native or reply_target
    if reply_native and reply_target and reply_native != reply_target:
        text = f"{reply_native}\n\n{reply_target}"

    # natural_rewrite = the natural/corrected version of what the USER said,
    # used by the lyric-style karaoke overlay (highlighted word by word).
    natural_rewrite = (
        (result.corrected_sentence or "").strip()
        or result.suggested_expression.strip()
        or reply_target
    )
    rewrite_words = natural_rewrite.split() if natural_rewrite else []

    return {
        "type": "response",
        "text": text,
        "text_native": reply_native,
        "text_target": reply_target,
        "natural_rewrite": natural_rewrite,
        "rewrite_words": rewrite_words,
        "question": result.question,
        "challenge": result.challenge,
        "suggested_expression": result.suggested_expression,
        "grammar_tips": grammar_tips,
        "patterns": result.patterns,
        "vocabulary": result.vocabulary,
    }


async def generate_voice_dialogue_response(
    db: Session | None,
    user_id: str | None,
    utterance: str,
    *,
    topic: str = "voice chat",
) -> dict[str, Any]:
    cleaned = utterance.strip()
    if not cleaned:
        return {"type": "error", "message": "Empty transcript"}

    profile = _load_profile(db, user_id)
    native_language = profile.native_language if profile else "zh"
    target_language = profile.primary_target_language if profile else "en"

    try:
        llm = get_llm_provider(
            resolve_default_llm_provider(db),
            db,
            allow_mock_fallback=True,
        )
    except LLMUnavailableError as exc:
        return {"type": "error", "message": exc.message}

    try:
        result = await llm.thought_dialogue(
            user_input=cleaned,
            profile=profile,
            native_language=native_language,
            target_language=target_language,
            mode="voice-realtime",
            topic=topic,
            detect_target_language_input=True,
        )
    except LLMUnavailableError as exc:
        return {"type": "error", "message": exc.message}
    except Exception as exc:  # pragma: no cover - provider/network errors
        logger.exception("Realtime voice LLM failed")
        return {"type": "error", "message": f"LLM 调用失败：{exc}"}

    return _result_to_response(result)
