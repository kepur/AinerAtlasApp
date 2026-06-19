"""Admin-controlled voice platform settings (Omni Realtime, NLS assessment, Crush LLM)."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from sqlalchemy.orm import Session

from app.models import AppSettings
from app.services.app_settings import get_app_settings

DEFAULT_OMNI_MODELS: tuple[str, ...] = (
    "qwen3.5-omni-flash-realtime",
    "qwen3.5-omni-plus-realtime",
    "qwen3.5-omni-flash-realtime-2026-03-15",
    "qwen3.5-omni-plus-realtime-2026-03-15",
    "qwen-omni-turbo-realtime",
)

RECOMMENDED_VAD_PATCH: dict[str, Any] = {
    "omni_silence_ms": 1000,
    "omni_vad_threshold": 0.68,
    "omni_vad_type": "semantic_vad",
    "omni_tap_to_end": True,
}

DEFAULT_VOICE_PLATFORM_CONFIG: dict[str, Any] = {
    # fun-asr | qwen-omni
    "realtime_engine": "fun-asr",
    "omni_models": list(DEFAULT_OMNI_MODELS),
    "omni_model_index": 0,
    "omni_voice": "Tina",
    "omni_instructions": (
        "You are AinerWise, a warm English expression coach. "
        "Keep spoken replies short (1-3 sentences). "
        "Wait until the user has clearly finished speaking before you respond. "
        "Leave a brief natural pause (about one second) after they stop talking. "
        "Gently correct grammar when helpful."
    ),
    "omni_turn_detection": True,
    "omni_vad_type": "semantic_vad",
    "omni_vad_threshold": 0.68,
    "omni_silence_ms": 1000,
    "omni_tap_to_end": True,
    # Qwen-Omni-Realtime must use Beijing; Singapore MAAS is for Fun-ASR only.
    "omni_realtime_url": "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    # Aliyun Intelligent Speech Interaction (口语评测)
    "speech_assessment_enabled": True,
    "nls_app_key": "",
    "nls_access_key_id": "",
    "nls_access_key_secret": "",
    "nls_region": "cn-shanghai",
    # Crush / explain LLM models (DashScope compatible-mode)
    "crush_llm_model": "qwen3.5-omni-flash",
    "explain_llm_model": "qwen3.5-omni-flash",
    "crush_llm_enabled": True,
    # Voice Coach batch (Admin-controlled)
    "voice_coach_schedule": "daily",  # daily | weekly | off
    "voice_coach_vip_only": True,
    "voice_coach_cron_hour": 3,
    "voice_coach_cron_minute": 30,
    "voice_coach_weekly_day": "sun",
    "voice_coach_profile_ttl_hours": 36,
    "voice_coach_startup_bootstrap": True,
}


def merge_voice_platform_config(raw: dict | None) -> dict[str, Any]:
    merged = deepcopy(DEFAULT_VOICE_PLATFORM_CONFIG)
    if isinstance(raw, dict):
        merged.update({k: v for k, v in raw.items() if v is not None})
    models = merged.get("omni_models")
    if isinstance(models, str):
        merged["omni_models"] = [m.strip() for m in models.split(",") if m.strip()]
    elif not isinstance(models, list) or not models:
        merged["omni_models"] = list(DEFAULT_OMNI_MODELS)
    if "omni_vad_threshold" in merged:
        merged["omni_vad_threshold"] = float(merged["omni_vad_threshold"])
    if "omni_silence_ms" in merged:
        merged["omni_silence_ms"] = int(merged["omni_silence_ms"])
    if "omni_tap_to_end" in merged and not isinstance(merged["omni_tap_to_end"], bool):
        merged["omni_tap_to_end"] = str(merged["omni_tap_to_end"]).lower() in {"1", "true", "yes", "on"}
    if "voice_coach_cron_hour" in merged:
        merged["voice_coach_cron_hour"] = max(0, min(23, int(merged["voice_coach_cron_hour"])))
    if "voice_coach_cron_minute" in merged:
        merged["voice_coach_cron_minute"] = max(0, min(59, int(merged["voice_coach_cron_minute"])))
    if "voice_coach_profile_ttl_hours" in merged:
        merged["voice_coach_profile_ttl_hours"] = max(6, min(168, int(merged["voice_coach_profile_ttl_hours"])))
    schedule = str(merged.get("voice_coach_schedule", "daily")).lower().strip()
    if schedule not in {"daily", "weekly", "off"}:
        schedule = "daily"
    merged["voice_coach_schedule"] = schedule
    day = str(merged.get("voice_coach_weekly_day", "sun")).lower().strip()[:3]
    if day not in {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}:
        day = "sun"
    merged["voice_coach_weekly_day"] = day
    if "voice_coach_vip_only" in merged and not isinstance(merged["voice_coach_vip_only"], bool):
        merged["voice_coach_vip_only"] = str(merged["voice_coach_vip_only"]).lower() in {"1", "true", "yes", "on"}
    if "voice_coach_startup_bootstrap" in merged and not isinstance(merged["voice_coach_startup_bootstrap"], bool):
        merged["voice_coach_startup_bootstrap"] = str(merged["voice_coach_startup_bootstrap"]).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
    return merged


def get_voice_platform_config(db: Session | None = None) -> dict[str, Any]:
    if db is None:
        return deepcopy(DEFAULT_VOICE_PLATFORM_CONFIG)
    settings = get_app_settings(db)
    raw = getattr(settings, "voice_platform_config", None)
    return merge_voice_platform_config(raw if isinstance(raw, dict) else {})


def pick_omni_model(config: dict[str, Any]) -> tuple[str, int]:
    models = [str(m).strip() for m in config.get("omni_models", []) if str(m).strip()]
    if not models:
        models = list(DEFAULT_OMNI_MODELS)
    idx = int(config.get("omni_model_index", 0) or 0) % len(models)
    return models[idx], (idx + 1) % len(models)


def needs_recommended_vad_patch(config: dict[str, Any]) -> bool:
    return (
        int(config.get("omni_silence_ms", 0)) != int(RECOMMENDED_VAD_PATCH["omni_silence_ms"])
        or str(config.get("omni_vad_type", "")) != str(RECOMMENDED_VAD_PATCH["omni_vad_type"])
        or abs(float(config.get("omni_vad_threshold", 0)) - float(RECOMMENDED_VAD_PATCH["omni_vad_threshold"]))
        > 0.001
        or bool(config.get("omni_tap_to_end")) != bool(RECOMMENDED_VAD_PATCH["omni_tap_to_end"])
    )


def apply_recommended_vad_patch(db: Session) -> bool:
    """Write recommended VAD defaults when DB still has legacy values."""
    cfg = get_voice_platform_config(db)
    if not needs_recommended_vad_patch(cfg):
        return False
    save_voice_platform_config(db, RECOMMENDED_VAD_PATCH)
    return True


def get_voice_coach_batch_settings(db: Session | None = None) -> dict[str, Any]:
    """Admin-controlled Voice Coach cron / eligibility."""
    cfg = get_voice_platform_config(db)
    return {
        "schedule": str(cfg.get("voice_coach_schedule", "daily")),
        "vip_only": bool(cfg.get("voice_coach_vip_only", True)),
        "cron_hour": int(cfg.get("voice_coach_cron_hour", 3)),
        "cron_minute": int(cfg.get("voice_coach_cron_minute", 30)),
        "weekly_day": str(cfg.get("voice_coach_weekly_day", "sun")),
        "profile_ttl_hours": int(cfg.get("voice_coach_profile_ttl_hours", 36)),
        "startup_bootstrap": bool(cfg.get("voice_coach_startup_bootstrap", True)),
    }


def save_voice_platform_config(db: Session, patch: dict[str, Any]) -> dict[str, Any]:
    settings = get_app_settings(db)
    current = merge_voice_platform_config(getattr(settings, "voice_platform_config", None))
    current.update({k: v for k, v in patch.items() if v is not None})
    settings.voice_platform_config = current
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return current


def resolve_realtime_engine(db: Session | None) -> str:
    cfg = get_voice_platform_config(db)
    engine = str(cfg.get("realtime_engine") or "fun-asr").lower().strip()
    if engine in {"qwen-omni", "omni", "qwen_omni"}:
        return "qwen-omni"
    if db is not None:
        from app.services.runtime_config import resolve_realtime_asr_provider

        asr_mode = resolve_realtime_asr_provider(db).lower().strip()
        if asr_mode in {"qwen-omni", "omni", "qwen_omni"}:
            return "qwen-omni"
    return "fun-asr"
