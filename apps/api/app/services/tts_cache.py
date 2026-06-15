"""Disk-persistent TTS audio cache.

Stores synthesized audio as files under ``CACHE_DIR`` so repeat playback of the
same text+voice+speed combination skips the TTS provider entirely.  Falls back
to an in-memory dict when the filesystem is not writable.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

CACHE_DIR = Path(os.environ.get("TTS_CACHE_DIR", "/app/storage/tts_cache"))

_mem_cache: dict[str, bytes] = {}


def _ensure_dir() -> bool:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        return True
    except OSError:
        return False


def _cache_key(text: str, voice: str, speed: str) -> str:
    raw = f"{text}|{voice}|{speed}".encode()
    return hashlib.sha256(raw).hexdigest()


def get_cached_audio(text: str, voice: str = "default", speed: str = "1.0") -> Optional[bytes]:
    key = _cache_key(text, voice, speed)
    path = CACHE_DIR / f"{key}.mp3"
    try:
        if path.exists():
            data = path.read_bytes()
            if data:
                return data
    except OSError:
        pass
    return _mem_cache.get(key)


def set_cached_audio(text: str, audio_bytes: bytes, voice: str = "default", speed: str = "1.0") -> None:
    if not audio_bytes:
        return
    key = _cache_key(text, voice, speed)
    _mem_cache[key] = audio_bytes
    if _ensure_dir():
        try:
            (CACHE_DIR / f"{key}.mp3").write_bytes(audio_bytes)
        except OSError as exc:
            logger.warning("Failed to persist TTS cache file: %s", exc)


def cache_hit_as_response(text: str, voice: str = "default", speed: str = "1.0") -> Optional[dict]:
    audio = get_cached_audio(text, voice, speed)
    if not audio:
        return None
    return {
        "audio_base64": base64.b64encode(audio).decode("ascii"),
        "audio_url": "",
        "audio_mime": "audio/mpeg",
        "provider": "cache",
    }
