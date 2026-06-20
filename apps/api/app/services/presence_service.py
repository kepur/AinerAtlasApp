"""Lightweight online presence — Redis TTL with in-memory fallback for tests."""

from __future__ import annotations

import logging
import time
from typing import Iterable

from app.db.redis import get_redis

logger = logging.getLogger(__name__)

ONLINE_TTL_SECONDS = 180  # 3 minutes


_memory: dict[str, float] = {}


def touch(user_id: str) -> None:
    if not user_id:
        return
    now = time.time()
    try:
        client = get_redis()
        client.setex(f"presence:user:{user_id}", ONLINE_TTL_SECONDS, str(int(now)))
    except Exception:
        logger.debug("presence redis unavailable, using memory for %s", user_id)
        _memory[user_id] = now


def is_online(user_id: str, *, max_age_seconds: int = ONLINE_TTL_SECONDS) -> bool:
    if not user_id:
        return False
    cutoff = time.time() - max_age_seconds
    try:
        client = get_redis()
        raw = client.get(f"presence:user:{user_id}")
        if raw is None:
            return False
        return float(raw) >= cutoff
    except Exception:
        seen = _memory.get(user_id)
        return seen is not None and seen >= cutoff


def online_status(user_ids: Iterable[str], *, max_age_seconds: int = ONLINE_TTL_SECONDS) -> dict[str, bool]:
    ids = [uid for uid in user_ids if uid]
    if not ids:
        return {}
    cutoff = time.time() - max_age_seconds
    out: dict[str, bool] = {uid: False for uid in ids}
    try:
        client = get_redis()
        pipe = client.pipeline()
        for uid in ids:
            pipe.get(f"presence:user:{uid}")
        values = pipe.execute()
        for uid, raw in zip(ids, values, strict=False):
            if raw is None:
                continue
            out[uid] = float(raw) >= cutoff
        return out
    except Exception:
        for uid in ids:
            seen = _memory.get(uid)
            out[uid] = seen is not None and seen >= cutoff
        return out


def clear_memory() -> None:
    _memory.clear()
