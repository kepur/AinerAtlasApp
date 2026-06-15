"""Resolve runtime AI provider settings: admin DB first, .env fallback."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models import AIProvider, AppSettings
from app.services.app_settings import get_app_settings


@dataclass(frozen=True)
class RuntimeConfig:
    default_llm_provider: str
    default_voice_provider: str
    realtime_asr_provider: str
    default_embedding_provider: str


def _first_enabled_provider(db: Session, provider_type: str) -> AIProvider | None:
    return db.scalar(
        select(AIProvider)
        .where(AIProvider.enabled.is_(True), AIProvider.provider_type == provider_type)
        .order_by(AIProvider.priority.asc())
        .limit(1)
    )


def _resolve_named_or_auto(
    db: Session | None,
    *,
    admin_value: str,
    env_value: str,
    provider_type: str,
    skip_names: set[str],
    env_fallback: str,
) -> str:
    explicit = admin_value.strip()
    if explicit and explicit != "auto":
        return explicit

    if db is not None:
        row = _first_enabled_provider(db, provider_type)
        if row and row.provider_name not in skip_names:
            return row.provider_name

    env_clean = env_value.strip()
    if env_clean and env_clean != "auto":
        return env_clean
    return env_fallback


def get_runtime_config(db: Session | None = None) -> RuntimeConfig:
    settings = get_settings()
    app_settings: AppSettings | None = None
    if db is not None:
        app_settings = get_app_settings(db)

    admin_llm = app_settings.default_llm_provider if app_settings else ""
    admin_voice = app_settings.default_voice_provider if app_settings else ""
    admin_asr = app_settings.realtime_asr_provider if app_settings else "auto"
    admin_embedding = app_settings.default_embedding_provider if app_settings else ""

    return RuntimeConfig(
        default_llm_provider=_resolve_named_or_auto(
            db,
            admin_value=admin_llm,
            env_value=settings.default_llm_provider,
            provider_type="llm",
            skip_names={"mock"},
            env_fallback="auto",
        ),
        default_voice_provider=_resolve_named_or_auto(
            db,
            admin_value=admin_voice,
            env_value=settings.default_voice_provider,
            provider_type="voice",
            skip_names={"mock-voice", "mock"},
            env_fallback="auto",
        ),
        realtime_asr_provider=_resolve_asr_mode(db, admin_asr, settings),
        default_embedding_provider=_resolve_named_or_auto(
            db,
            admin_value=admin_embedding,
            env_value=settings.default_embedding_provider,
            provider_type="embedding",
            skip_names=set(),
            env_fallback="dashscope-embedding",
        ),
    )


def _resolve_asr_mode(db: Session | None, admin_value: str, settings: Settings) -> str:
    mode = admin_value.strip().lower() or settings.realtime_asr_provider.strip().lower() or "auto"
    if mode in {"mock", "dashscope"}:
        return mode
    return "auto"


def resolve_default_llm_provider(db: Session | None = None) -> str:
    return get_runtime_config(db).default_llm_provider


def resolve_default_voice_provider(db: Session | None = None) -> str:
    return get_runtime_config(db).default_voice_provider


def resolve_realtime_asr_provider(db: Session | None = None) -> str:
    return get_runtime_config(db).realtime_asr_provider


def resolve_default_embedding_provider(db: Session | None = None) -> str:
    return get_runtime_config(db).default_embedding_provider
