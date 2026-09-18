"""Single source of truth for exposing realtime Voice Coach."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AIProvider, LLMCallLog
from app.services.provider_capabilities import _llm_capability, _realtime_voice_capability
from app.services.voice_platform_config import get_voice_platform_config


def all_llm_providers_recently_failed(db: Session, window_minutes: int = 15) -> bool:
    """Return True only when every configured LLM has a fresh failed result.

    A provider with no recent runtime evidence remains eligible. This avoids
    hiding Voice Coach merely because a newly configured model has not yet been
    called, while still closing it after all configured choices actually fail.
    """
    providers = list(
        db.scalars(
            select(AIProvider).where(
                AIProvider.enabled.is_(True),
                AIProvider.provider_type == "llm",
            )
        )
    )
    if not providers:
        return False

    cutoff = datetime.now(UTC) - timedelta(minutes=max(1, window_minutes))
    for provider in providers:
        latest = db.scalar(
            select(LLMCallLog)
            .where(LLMCallLog.provider_name == provider.provider_name)
            .order_by(LLMCallLog.created_at.desc())
            .limit(1)
        )
        if not latest or latest.status != "failed":
            return False
        created_at = latest.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)
        if created_at < cutoff:
            return False
    return True


def realtime_dialogue_status(db: Session) -> dict[str, object]:
    cfg = get_voice_platform_config(db)
    manual_enabled = bool(cfg.get("realtime_dialogue_enabled", True))
    if not manual_enabled:
        return {
            "enabled": False,
            "manual_enabled": False,
            "reason": "disabled_by_admin",
            "message": "实时语音教练已由后台关闭。",
        }

    voice = _realtime_voice_capability(db)
    if voice.status != "ready":
        return {
            "enabled": False,
            "manual_enabled": True,
            "reason": "voice_model_unavailable",
            "message": "没有可用的实时语音模型，系统已自动关闭实时对话。",
        }

    # Qwen Omni owns ASR + dialogue + TTS in one session. Other realtime ASR
    # engines still need a separate LLM for the coach response.
    if voice.active_provider != "qwen-omni-realtime":
        llm = _llm_capability(db)
        if llm.status != "ready":
            return {
                "enabled": False,
                "manual_enabled": True,
                "reason": "llm_unavailable",
                "message": "没有可用的 LLM 对话模型，系统已自动关闭实时对话。",
            }
        if all_llm_providers_recently_failed(db):
            return {
                "enabled": False,
                "manual_enabled": True,
                "reason": "llm_runtime_unavailable",
                "message": "所有 LLM 对话模型最近均调用失败，系统已自动关闭实时对话。",
            }

    return {
        "enabled": True,
        "manual_enabled": True,
        "reason": "ready",
        "message": "实时语音教练可用。",
        "provider": voice.active_provider,
    }
