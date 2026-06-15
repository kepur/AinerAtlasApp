"""Resolve stored provider API keys for runtime and admin tests."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import decrypt_api_key
from app.models import AIProvider
from app.services.dashscope_client import resolve_dashscope_api_key


def resolve_provider_api_key(provider: AIProvider, db: Session | None = None) -> str:
    key = decrypt_api_key(provider.api_key_encrypted)
    if key:
        return key
    if provider.provider_name in {"dashscope", "dashscope-embedding", "qwen"}:
        return resolve_dashscope_api_key(db) or ""
    return ""
