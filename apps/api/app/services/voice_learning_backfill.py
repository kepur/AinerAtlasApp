"""Backfill learning HUD for voice turns that were still analyzing when the call ended."""

from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger
from sqlalchemy.orm import Session

from app.services.voice_realtime_dialogue import iter_voice_learning_events


def _hud_is_empty(hud: dict[str, Any] | None) -> bool:
    if not hud or not isinstance(hud, dict):
        return True
    if hud.get("main_expression") or hud.get("corrected_sentence"):
        return False
    if hud.get("grammar_tips") or hud.get("patterns_v2") or hud.get("patterns"):
        return False
    if hud.get("variants") or hud.get("expression_versions"):
        return False
    return True


async def _analyze_turn_hud(
    db: Session | None,
    user_id: str | None,
    user_text: str,
    *,
    topic: str,
    timeout_seconds: float = 25.0,
) -> dict[str, Any]:
    final_hud: dict[str, Any] | None = None

    async def _run() -> None:
        nonlocal final_hud
        async for event in iter_voice_learning_events(db, user_id, user_text, topic=topic):
            if event.get("type") == "learning_hud_partial" and event.get("hud"):
                final_hud = {**(final_hud or {}), **event["hud"]}
            elif event.get("type") == "learning_hud" and event.get("hud"):
                final_hud = event["hud"]

    try:
        await asyncio.wait_for(_run(), timeout=timeout_seconds)
    except asyncio.TimeoutError:
        logger.warning("Voice HUD backfill timed out for utterance: %s", user_text[:80])
    except Exception as exc:
        logger.warning("Voice HUD backfill failed: %s", exc)

    return final_hud or {}


async def backfill_turn_huds(
    db: Session | None,
    user_id: str | None,
    turns: list[dict[str, Any]],
    *,
    mode: str = "free",
    topic: str | None = None,
    timeout_per_turn: float = 20.0,
) -> list[dict[str, Any]]:
    session_topic = topic or (
        "English job interview practice"
        if mode == "interview"
        else "free natural conversation"
    )
    enriched: list[dict[str, Any]] = []
    for turn in turns:
        row = dict(turn)
        hud = row.get("hud") if isinstance(row.get("hud"), dict) else {}
        user_text = str(row.get("user_text") or "").strip()
        if user_text and _hud_is_empty(hud):
            row["hud"] = await _analyze_turn_hud(
                db,
                user_id,
                user_text,
                topic=session_topic,
                timeout_seconds=timeout_per_turn,
            )
        else:
            row["hud"] = hud
        enriched.append(row)
    return enriched
