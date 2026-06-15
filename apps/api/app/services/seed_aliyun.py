from __future__ import annotations

import os

from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import encrypt_api_key
from app.models import AIProvider


def _env_bootstrap_key(settings: Settings) -> str:
    return os.getenv("DASHSCOPE_API_KEY", "").strip() or settings.dashscope_api_key.strip()


def seed_aliyun_providers(db: Session, settings: Settings) -> None:
    """Bootstrap Alibaba providers from .env only when admin DB has no credentials yet."""
    env_key = _env_bootstrap_key(settings)

    existing_qwen = db.scalar(select(AIProvider).where(AIProvider.provider_name == "qwen").limit(1))
    if existing_qwen and existing_qwen.api_key_encrypted:
        return

    if not env_key and not existing_qwen:
        return

    workspace_id = settings.dashscope_workspace_id.strip()
    compatible_url = settings.dashscope_compatible_base_url.strip()
    http_url = settings.dashscope_http_base_url.strip()
    ws_url = settings.dashscope_ws_url.strip()

    specs = [
        {
            "provider_name": "qwen",
            "provider_type": "llm",
            "api_base_url": compatible_url,
            "model_name": "qwen-plus",
            "priority": 10,
            "config": {
                "workspace_id": workspace_id,
                "workspace_name": "默认业务空间",
                "region": "ap-southeast-1",
            },
        },
        {
            "provider_name": "dashscope",
            "provider_type": "voice",
            "api_base_url": http_url,
            "model_name": settings.dashscope_asr_model,
            "priority": 10,
            "config": {
                "workspace_id": workspace_id,
                "ws_url": ws_url,
                "asr_model": settings.dashscope_asr_model,
                "purpose": "realtime-asr",
            },
        },
        {
            "provider_name": "dashscope-embedding",
            "provider_type": "embedding",
            "api_base_url": http_url,
            "model_name": settings.dashscope_embedding_model,
            "priority": 10,
            "config": {
                "workspace_id": workspace_id,
                "dimension": settings.dashscope_embedding_dimension,
                "output_type": "dense",
            },
        },
    ]

    encrypted = encrypt_api_key(env_key) if env_key else ""
    for spec in specs:
        provider = db.scalar(
            select(AIProvider).where(AIProvider.provider_name == spec["provider_name"]).limit(1)
        )
        if provider:
            if not provider.api_base_url and spec["api_base_url"]:
                provider.api_base_url = spec["api_base_url"]
            if not provider.model_name:
                provider.model_name = spec["model_name"]
            provider.enabled = True
            provider.config = {**(provider.config or {}), **spec["config"]}
            if encrypted and not provider.api_key_encrypted:
                provider.api_key_encrypted = encrypted
            continue

        if not encrypted:
            continue

        db.add(
            AIProvider(
                provider_name=spec["provider_name"],
                provider_type=spec["provider_type"],
                api_base_url=spec["api_base_url"],
                api_key_encrypted=encrypted,
                model_name=spec["model_name"],
                enabled=True,
                priority=spec["priority"],
                config=spec["config"],
            )
        )

    logger.info("Bootstrapped Alibaba Cloud providers from .env fallback (admin DB was empty)")
