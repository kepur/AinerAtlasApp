"""LLM dialogue follow-up for realtime voice sessions."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
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


def _partial_hud_from_grammar(grammar_data: dict[str, Any]) -> dict[str, Any] | None:
    if not grammar_data:
        return None
    corrected = str(grammar_data.get("corrected_sentence") or "").strip()
    tips = grammar_data.get("grammar_tips") or []
    patterns_raw = grammar_data.get("patterns") or []
    patterns_v2 = []
    for item in patterns_raw:
        if isinstance(item, dict):
            patterns_v2.append(
                {
                    "pattern": item.get("pattern", ""),
                    "example": item.get("example", ""),
                    "add_to_crush": bool(item.get("add_to_crush", False)),
                }
            )
        elif isinstance(item, str) and item.strip():
            patterns_v2.append({"pattern": item.strip(), "example": corrected, "add_to_crush": False})
    if not corrected and not tips and not patterns_v2:
        return None
    return {
        "main_expression": corrected,
        "corrected_sentence": corrected,
        "grammar_tips": tips,
        "patterns_v2": patterns_v2,
        "patterns": [p.get("pattern", "") for p in patterns_v2 if p.get("pattern")],
    }


def _partial_hud_from_expression(expression_data: dict[str, Any]) -> dict[str, Any] | None:
    if not expression_data:
        return None
    variants = expression_data.get("expression_versions") or {}
    if not isinstance(variants, dict):
        variants = {}
    suggested = str(expression_data.get("suggested_expression") or "").strip()
    main_expression = suggested or str(variants.get("natural_spoken") or variants.get("basic") or "").strip()
    vocab = expression_data.get("vocabulary") or []
    if not main_expression and not variants and not vocab:
        return None
    return {
        "main_expression": main_expression,
        "variants": variants,
        "expression_versions": variants,
        "vocabulary": vocab,
        "suggested_expression": suggested,
    }


def _learning_payload(
    event_type: str,
    *,
    cleaned: str,
    hud: dict[str, Any] | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": event_type,
        "user_text": cleaned,
        "hud": hud,
    }
    if hud:
        payload["grammar_tips"] = hud.get("grammar_tips", [])
        payload["natural_rewrite"] = (
            (hud.get("corrected_sentence") or hud.get("main_expression") or "").strip()
        )
    return payload


async def iter_voice_learning_events(
    db: Session | None,
    user_id: str | None,
    utterance: str,
    *,
    topic: str = "voice chat",
) -> AsyncIterator[dict[str, Any]]:
    """Stream learning HUD in phases: quick grammar → expression → full chat_v2."""
    cleaned = utterance.strip()
    if not cleaned:
        yield {"type": "learning_hud", "hud": None, "user_text": ""}
        return

    from app.api.routes.conversations import _build_chat_v2_response
    from app.services.llm import LLMUnavailableError, require_llm_provider
    from app.services.llm_openai import language_name
    from app.services.runtime_config import resolve_llm_provider_for_task

    profile = _load_profile(db, user_id)
    native_language = profile.native_language if profile else "zh"
    target_language = profile.primary_target_language if profile else "en"
    native_name = language_name(native_language)
    target_name = language_name(target_language)
    explanation_code = profile.explanation_language if profile and profile.explanation_language else native_language
    if explanation_code == target_language:
        explanation_code = native_language
    explanation_name = language_name(explanation_code)

    yield {"type": "learning_analyzing", "user_text": cleaned}

    try:
        provider = require_llm_provider(resolve_llm_provider_for_task("grammar_analysis", db), db=db)
    except LLMUnavailableError as exc:
        logger.warning("Voice learning HUD unavailable: {}", exc.message)
        yield {"type": "learning_hud", "hud": None, "user_text": cleaned, "error": exc.message}
        return

    grammar_task: asyncio.Task[dict[str, Any]] | None = None
    expression_task: asyncio.Task[dict[str, Any]] | None = None
    if hasattr(provider, "_grammar_agent"):
        grammar_task = asyncio.create_task(
            provider._grammar_agent(cleaned, native_name, target_name, True)  # type: ignore[attr-defined]
        )
    if hasattr(provider, "_expression_agent"):
        expression_task = asyncio.create_task(
            provider._expression_agent(cleaned, target_name, explanation_name)  # type: ignore[attr-defined]
        )

    full_task = asyncio.create_task(
        provider.chat_v2(
            user_input=cleaned,
            profile=profile,
            native_language=native_language,
            target_language=target_language,
            mode="voice-realtime",
            topic=topic,
            detect_target_language_input=True,
        )
    )

    pending: list[asyncio.Task[dict[str, Any]]] = []
    if grammar_task:
        pending.append(grammar_task)
    if expression_task:
        pending.append(expression_task)
    pending.append(full_task)

    while pending:
        done, pending_set = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        pending = list(pending_set)
        for task in done:
            if task is grammar_task:
                try:
                    partial = _partial_hud_from_grammar(task.result())
                    if partial:
                        yield _learning_payload("learning_hud_partial", cleaned=cleaned, hud=partial)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Voice quick grammar failed: {}", exc)
            elif task is expression_task:
                try:
                    partial = _partial_hud_from_expression(task.result())
                    if partial:
                        yield _learning_payload("learning_hud_partial", cleaned=cleaned, hud=partial)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Voice quick expression failed: {}", exc)
            elif task is full_task:
                try:
                    data = task.result()
                    v2 = _build_chat_v2_response(data)
                    hud = v2.to_legacy_analysis()
                    yield _learning_payload("learning_hud", cleaned=cleaned, hud=hud)
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Voice learning HUD failed")
                    yield {"type": "learning_hud", "hud": None, "user_text": cleaned, "error": str(exc)}


async def generate_voice_learning_hud(
    db: Session | None,
    user_id: str | None,
    utterance: str,
    *,
    topic: str = "voice chat",
) -> dict[str, Any]:
    """Backward-compatible single-shot learning HUD (returns final event)."""
    final: dict[str, Any] = {"type": "learning_hud", "hud": None, "user_text": utterance.strip()}
    async for event in iter_voice_learning_events(db, user_id, utterance, topic=topic):
        if event.get("type") in {"learning_hud_partial", "learning_hud"}:
            final = event
    return final
