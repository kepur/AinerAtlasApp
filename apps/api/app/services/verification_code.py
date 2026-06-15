import random
import string
import time
from typing import Protocol

from loguru import logger

from app.db.redis import get_redis

_MEMORY_CODES: dict[str, tuple[str, float]] = {}


class CodeStore(Protocol):
    def save(self, email: str, code: str, ttl_seconds: int) -> None: ...
    def verify(self, email: str, code: str) -> bool: ...
    def delete(self, email: str) -> None: ...


class MemoryCodeStore:
    def save(self, email: str, code: str, ttl_seconds: int) -> None:
        key = email.lower().strip()
        _MEMORY_CODES[key] = (code, time.time() + ttl_seconds)

    def verify(self, email: str, code: str) -> bool:
        key = email.lower().strip()
        stored = _MEMORY_CODES.get(key)
        if not stored:
            return False
        stored_code, expires_at = stored
        if time.time() > expires_at:
            _MEMORY_CODES.pop(key, None)
            return False
        return stored_code == code.strip()

    def delete(self, email: str) -> None:
        _MEMORY_CODES.pop(email.lower().strip(), None)


class RedisCodeStore:
    def save(self, email: str, code: str, ttl_seconds: int) -> None:
        client = get_redis()
        client.setex(f"verify:register:{email.lower().strip()}", ttl_seconds, code)

    def verify(self, email: str, code: str) -> bool:
        client = get_redis()
        key = f"verify:register:{email.lower().strip()}"
        stored = client.get(key)
        if stored is None:
            return False
        if isinstance(stored, bytes):
            stored = stored.decode()
        return stored == code.strip()

    def delete(self, email: str) -> None:
        client = get_redis()
        client.delete(f"verify:register:{email.lower().strip()}")


def get_code_store() -> CodeStore:
    try:
        client = get_redis()
        client.ping()
        return RedisCodeStore()
    except Exception:
        logger.warning("Redis unavailable for verification codes, using in-memory store")
        return MemoryCodeStore()


def generate_verification_code(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))
