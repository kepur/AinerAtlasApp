"""Shared DashScope / 阿里云百炼 MAAS client configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.security import decrypt_api_key
from app.models import AIProvider, AppSettings


@dataclass(frozen=True)
class DashScopeConfig:
    api_key: str
    workspace_id: str
    compatible_base_url: str
    http_base_url: str
    websocket_base_url: str
    asr_model: str
    embedding_model: str
    embedding_dimension: int


def _pick(*values: object) -> str:
    for value in values:
        if value is None:
            continue
        cleaned = str(value).strip()
        if cleaned:
            return cleaned
    return ""


def _provider_by_name(db: Session, provider_name: str, provider_type: str | None = None) -> AIProvider | None:
    query = select(AIProvider).where(AIProvider.provider_name == provider_name)
    if provider_type:
        query = query.where(AIProvider.provider_type == provider_type)
    return db.scalar(query.limit(1))


def _db_dashscope_api_key(db: Session) -> str | None:
    app = db.get(AppSettings, "default")
    if app and app.global_api_keys:
        if isinstance(app.global_api_keys, list):
            for entry in app.global_api_keys:
                if isinstance(entry, dict) and entry.get("platform") == "dashscope":
                    key = entry.get("api_key", "")
                    if key: return key
        elif isinstance(app.global_api_keys, dict):
            dash_key = app.global_api_keys.get("dashscope_api_key", "")
            if dash_key: return dash_key
    for name in ("dashscope", "dashscope-embedding", "qwen"):
        provider = db.scalar(
            select(AIProvider)
            .where(AIProvider.provider_name == name, AIProvider.enabled.is_(True))
            .order_by(AIProvider.priority.asc())
            .limit(1)
        )
        if not provider:
            continue
        api_key = decrypt_api_key(provider.api_key_encrypted)
        if api_key:
            return api_key
    return None


def resolve_dashscope_api_key(db: Session | None = None) -> str | None:
    if db is not None:
        db_key = _db_dashscope_api_key(db)
        if db_key:
            return db_key

    settings = get_settings()
    settings_key = settings.dashscope_api_key.strip()
    if settings_key:
        return settings_key
    return os.getenv("DASHSCOPE_API_KEY", "").strip() or None


def resolve_dashscope_config(db: Session | None = None) -> DashScopeConfig | None:
    settings = get_settings()
    api_key = resolve_dashscope_api_key(db)
    if not api_key:
        return None

    voice_provider = llm_provider = embedding_provider = None
    voice_cfg: dict = {}
    llm_cfg: dict = {}
    embedding_cfg: dict = {}

    if db is not None:
        voice_provider = _provider_by_name(db, "dashscope", "voice")
        llm_provider = _provider_by_name(db, "qwen", "llm")
        embedding_provider = _provider_by_name(db, "dashscope-embedding", "embedding")
        voice_cfg = (voice_provider.config or {}) if voice_provider else {}
        llm_cfg = (llm_provider.config or {}) if llm_provider else {}
        embedding_cfg = (embedding_provider.config or {}) if embedding_provider else {}

    workspace_id = _pick(
        voice_cfg.get("workspace_id"),
        llm_cfg.get("workspace_id"),
        embedding_cfg.get("workspace_id"),
        settings.dashscope_workspace_id,
        os.getenv("DASHSCOPE_WORKSPACE_ID", ""),
    )
    compatible_base_url = _pick(
        llm_provider.api_base_url if llm_provider else None,
        settings.dashscope_compatible_base_url,
        os.getenv("DASHSCOPE_COMPATIBLE_BASE_URL", ""),
    )
    http_base_url = _pick(
        voice_provider.api_base_url if voice_provider else None,
        embedding_provider.api_base_url if embedding_provider else None,
        settings.dashscope_http_base_url,
        os.getenv("DASHSCOPE_HTTP_BASE_URL", ""),
    )
    websocket_base_url = _pick(
        voice_cfg.get("ws_url"),
        settings.dashscope_ws_url,
        os.getenv("DASHSCOPE_WEBSOCKET_BASE_URL", ""),
        os.getenv("DASHSCOPE_WS_URL", ""),
    )
    asr_model = _pick(
        voice_provider.model_name if voice_provider else None,
        voice_cfg.get("asr_model"),
        settings.dashscope_asr_model,
        os.getenv("DASHSCOPE_ASR_MODEL", ""),
        "fun-asr-realtime",
    )
    embedding_model = _pick(
        embedding_provider.model_name if embedding_provider else None,
        settings.dashscope_embedding_model,
        os.getenv("DASHSCOPE_EMBEDDING_MODEL", ""),
        "text-embedding-v4",
    )
    embedding_dimension = int(
        _pick(
            embedding_cfg.get("dimension"),
            settings.dashscope_embedding_dimension,
            os.getenv("DASHSCOPE_EMBEDDING_DIMENSION", ""),
            1024,
        )
    )

    return DashScopeConfig(
        api_key=api_key,
        workspace_id=workspace_id,
        compatible_base_url=compatible_base_url,
        http_base_url=http_base_url,
        websocket_base_url=websocket_base_url,
        asr_model=asr_model,
        embedding_model=embedding_model,
        embedding_dimension=embedding_dimension,
    )


def apply_dashscope_config(config: DashScopeConfig | None = None, db: Session | None = None) -> DashScopeConfig | None:
    resolved = config or resolve_dashscope_config(db)
    if not resolved:
        return None

    os.environ["DASHSCOPE_API_KEY"] = resolved.api_key
    if resolved.http_base_url:
        os.environ["DASHSCOPE_HTTP_BASE_URL"] = resolved.http_base_url
    if resolved.websocket_base_url:
        os.environ["DASHSCOPE_WEBSOCKET_BASE_URL"] = resolved.websocket_base_url
    if resolved.compatible_base_url:
        os.environ["DASHSCOPE_COMPATIBLE_BASE_URL"] = resolved.compatible_base_url

    import dashscope

    dashscope.api_key = resolved.api_key
    if resolved.http_base_url:
        dashscope.base_http_api_url = resolved.http_base_url
    if resolved.websocket_base_url:
        dashscope.base_websocket_api_url = resolved.websocket_base_url
    if resolved.compatible_base_url:
        dashscope.base_compatible_api_url = resolved.compatible_base_url
    return resolved


def dashscope_enabled(db: Session | None = None) -> bool:
    from app.services.runtime_config import resolve_realtime_asr_provider

    mode = resolve_realtime_asr_provider(db)
    if mode == "mock":
        return False
    return resolve_dashscope_api_key(db) is not None
