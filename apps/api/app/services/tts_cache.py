import hashlib
from typing import Optional

from app.core.config import get_settings

_cache: dict[str, tuple[bytes, str]] = {}


def _cache_key(text: str, voice: str, speed: str) -> str:
    raw = f"{text}|{voice}|{speed}".encode()
    return hashlib.sha256(raw).hexdigest()


def get_cached_tts(text: str, voice: str = "default", speed: str = "1.0") -> Optional[tuple[bytes, str]]:
    settings = get_settings()
    if not settings.tts_cache_enabled:
        return None
    key = _cache_key(text, voice, speed)
    return _cache.get(key)


def set_cached_tts(text: str, audio_bytes: bytes, content_type: str, voice: str = "default", speed: str = "1.0") -> None:
    settings = get_settings()
    if not settings.tts_cache_enabled:
        return
    key = _cache_key(text, voice, speed)
    if len(_cache) >= settings.tts_cache_max_entries:
        for old_key in list(_cache.keys())[: max(1, settings.tts_cache_max_entries // 10)]:
            _cache.pop(old_key, None)
    _cache[key] = (audio_bytes, content_type)


def clear_tts_cache() -> int:
    count = len(_cache)
    _cache.clear()
    return count
