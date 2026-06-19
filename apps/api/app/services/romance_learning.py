"""Romance social learning HUD — same chat_v2 pipeline as Chat / Circle."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models import GameSession
from app.services.llm import LLMUnavailableError, require_llm_provider
from app.services.runtime_config import resolve_llm_provider_for_task

logger = logging.getLogger(__name__)


async def analyze_romance_user_message(
    db: Session,
    session: GameSession,
    user_input: str,
    *,
    target: dict[str, Any],
) -> dict[str, Any]:
    """Analyze the user's line with chat_v2 (native explains target language)."""
    from app.api.routes.conversations import _build_chat_v2_response

    cleaned = user_input.strip()
    if not cleaned:
        return {}

    try:
        provider = require_llm_provider(
            resolve_llm_provider_for_task("grammar_analysis", db),
            db,
        )
    except LLMUnavailableError:
        return {}

    native = session.native_language or "zh"
    target_lang = session.target_language or "en"
    topic = f"{target.get('name', '')} · {target.get('category', '恋爱社交')} · {target.get('initial_scene', '')}"

    try:
        data = await provider.chat_v2(
            user_input=cleaned,
            profile=None,
            native_language=native,
            target_language=target_lang,
            mode="dating_coach",
            topic=topic,
            detect_target_language_input=True,
        )
        v2 = _build_chat_v2_response(data)
        return v2.to_legacy_analysis()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Romance chat_v2 analysis failed: %s", exc)
        return {}
