"""Serialize AIProvider rows for admin responses."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import AIProvider
from app.schemas import ProviderRead
from app.services.provider_keys import resolve_provider_api_key


def provider_api_key_status(row: AIProvider, db: Session | None = None) -> str:
    if row.provider_name in {"mock", "mock-voice"}:
        return "none"
    if not row.api_key_encrypted:
        return "none" if not resolve_provider_api_key(row, db) else "valid"
    return "valid" if resolve_provider_api_key(row, db) else "invalid"


def to_provider_read(row: AIProvider, db: Session | None = None) -> ProviderRead:
    return ProviderRead(
        id=row.id,
        provider_name=row.provider_name,
        provider_type=row.provider_type,
        api_base_url=row.api_base_url,
        model_name=row.model_name,
        enabled=row.enabled,
        priority=row.priority,
        cost_weight=row.cost_weight,
        fallback_provider=row.fallback_provider,
        config=row.config or {},
        api_key_status=provider_api_key_status(row, db),
    )
