"""In-memory / Redis store for async freeze job status."""

from __future__ import annotations

import json
import time
from typing import Any

from loguru import logger

from app.db.redis import get_redis

_MEMORY: dict[str, tuple[str, float]] = {}


def _key(scope: str, resource_id: str, user_id: str) -> str:
    return f"freeze:{scope}:{resource_id}:{user_id}"


class FreezeJobStore:
    def set(self, scope: str, resource_id: str, user_id: str, payload: dict[str, Any], ttl: int = 900) -> None:
        body = json.dumps(payload, ensure_ascii=False, default=str)
        mem_key = _key(scope, resource_id, user_id)
        _MEMORY[mem_key] = (body, time.time() + ttl)
        try:
            client = get_redis()
            client.setex(f"job:{mem_key}", ttl, body)
        except Exception:
            logger.warning("Redis unavailable for freeze jobs, using in-memory store")

    def get(self, scope: str, resource_id: str, user_id: str) -> dict[str, Any] | None:
        mem_key = _key(scope, resource_id, user_id)
        raw: str | None = None

        try:
            client = get_redis()
            value = client.get(f"job:{mem_key}")
            if value is not None:
                raw = value.decode() if isinstance(value, bytes) else value
        except Exception:
            logger.warning("Redis unavailable for freeze jobs, using in-memory store")

        if raw is None:
            stored = _MEMORY.get(mem_key)
            if not stored:
                return None
            body, expires_at = stored
            if time.time() > expires_at:
                _MEMORY.pop(mem_key, None)
                return None
            raw = body

        return json.loads(raw)

    def delete(self, scope: str, resource_id: str, user_id: str) -> None:
        mem_key = _key(scope, resource_id, user_id)
        _MEMORY.pop(mem_key, None)
        try:
            client = get_redis()
            client.delete(f"job:{mem_key}")
        except Exception:
            pass


freeze_job_store = FreezeJobStore()
