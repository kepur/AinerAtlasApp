"""Circle discussion learning HUD — aligned with Chat v2 analysis pipeline."""

from __future__ import annotations

from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserProfile
from app.schemas import ProfileRead
from app.services.llm import LLMUnavailableError, require_llm_provider
from app.services.runtime_config import resolve_llm_provider_for_task


def _load_profile(db: Session | None, user_id: str | None) -> ProfileRead | None:
    if not db or not user_id:
        return None
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    if not profile:
        return None
    return ProfileRead.model_validate(profile)


async def analyze_circle_message(
    content: str,
    *,
    room_title: str,
    room_type: str = "roundtable",
    user_id: str | None = None,
    native_language: str = "zh",
    target_language: str = "en",
    moderator_instruction: str = "",
    db: Session | None = None,
) -> dict[str, Any]:
    """Run full chat_v2 learning analysis for a circle user message."""
    from app.api.routes.conversations import _build_chat_v2_response

    cleaned = content.strip()
    if not cleaned:
        return {
            "translated_content": "",
            "grammar_tips": [],
            "counter_question": "",
            "on_topic": True,
            "host_note": "",
        }

    profile = _load_profile(db, user_id)
    if profile:
        native_language = profile.native_language or native_language
        target_language = profile.primary_target_language or target_language

    if db is None:
        raise LLMUnavailableError()

    provider = require_llm_provider(
        resolve_llm_provider_for_task("grammar_analysis", db),
        db,
    )

    topic = room_title
    if moderator_instruction:
        topic = f"{room_title}\n\n[Moderator instruction: {moderator_instruction}]"

    data = await provider.chat_v2(
        user_input=cleaned,
        profile=profile,
        native_language=native_language,
        target_language=target_language,
        mode=room_type,
        topic=topic,
        detect_target_language_input=True,
    )
    v2 = _build_chat_v2_response(data)
    hud = v2.to_legacy_analysis()
    hud["user_input_translated"] = str(data.get("user_input_translated") or "").strip()
    hud["user_input_versions"] = data.get("user_input_versions") or {}

    translated = (
        hud.get("main_expression")
        or hud.get("corrected_sentence")
        or hud.get("user_input_translated")
        or ""
    )
    counter_question = (v2.next_question.target or v2.next_question.native or "").strip()
    if not counter_question:
        counter_question = str(data.get("conversational_reply") or "").strip()

    return {
        **hud,
        "translated_content": translated,
        "counter_question": counter_question,
        "on_topic": True,
        "host_note": "",
    }


async def safe_analyze_circle_message(
    content: str,
    *,
    room_title: str,
    room_type: str = "roundtable",
    user_id: str | None = None,
    moderator_instruction: str = "",
    db: Session | None = None,
) -> dict[str, Any]:
    """Analyze with graceful degradation when LLM is unavailable."""
    try:
        return await analyze_circle_message(
            content,
            room_title=room_title,
            room_type=room_type,
            user_id=user_id,
            moderator_instruction=moderator_instruction,
            db=db,
        )
    except LLMUnavailableError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Circle chat_v2 analysis failed")
        raise LLMUnavailableError(
            f"LLM 调用失败：{exc}。请到 Admin 检查 Provider 配置与 API Key。",
        ) from exc
