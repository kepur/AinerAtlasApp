"""Automatic post-deploy bootstrap — no manual admin curls required."""

from __future__ import annotations

import asyncio
import logging

from app.db.session import SessionLocal
from app.services.voice_platform_config import apply_recommended_vad_patch, get_voice_coach_batch_settings

logger = logging.getLogger(__name__)

_STARTUP_DELAY_SECONDS = 2.0


async def run_api_startup_bootstrap() -> None:
    """Apply voice platform defaults and generate missing Voice Coach profiles."""
    await asyncio.sleep(_STARTUP_DELAY_SECONDS)

    with SessionLocal() as db:
        if apply_recommended_vad_patch(db):
            logger.info("Startup bootstrap: applied recommended voice platform VAD (silence_ms=1200)")
        batch = get_voice_coach_batch_settings(db)

    if not batch["startup_bootstrap"] or batch["schedule"] == "off":
        logger.info(
            "Startup bootstrap: voice coach batch skipped (startup=%s schedule=%s)",
            batch["startup_bootstrap"],
            batch["schedule"],
        )
        return

    try:
        from app.tasks.scheduler import run_voice_coach_batch_analysis

        await run_voice_coach_batch_analysis(source="startup")
        logger.info("Startup bootstrap: voice coach profiles refreshed for users due for analysis")
    except Exception as exc:
        logger.warning("Startup bootstrap: voice coach analysis skipped (%s)", exc)


def schedule_api_startup_bootstrap() -> None:
    """Fire-and-forget background task from FastAPI lifespan."""
    asyncio.create_task(run_api_startup_bootstrap())
