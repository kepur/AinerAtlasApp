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
    def __init__(self, purpose: str) -> None:
        self._purpose = purpose

    def _key(self, email: str) -> str:
        return f"{self._purpose}:{email.lower().strip()}"

    def save(self, email: str, code: str, ttl_seconds: int) -> None:
        _MEMORY_CODES[self._key(email)] = (code, time.time() + ttl_seconds)

    def verify(self, email: str, code: str) -> bool:
        stored = _MEMORY_CODES.get(self._key(email))
        if not stored:
            return False
        stored_code, expires_at = stored
        if time.time() > expires_at:
            _MEMORY_CODES.pop(self._key(email), None)
            return False
        return stored_code == code.strip()

    def delete(self, email: str) -> None:
        _MEMORY_CODES.pop(self._key(email), None)


class RedisCodeStore:
    def __init__(self, purpose: str) -> None:
        self._purpose = purpose

    def _key(self, email: str) -> str:
        return f"verify:{self._purpose}:{email.lower().strip()}"

    def save(self, email: str, code: str, ttl_seconds: int) -> None:
        client = get_redis()
        client.setex(self._key(email), ttl_seconds, code)

    def verify(self, email: str, code: str) -> bool:
        client = get_redis()
        stored = client.get(self._key(email))
        if stored is None:
            return False
        if isinstance(stored, bytes):
            stored = stored.decode()
        return stored == code.strip()

    def delete(self, email: str) -> None:
        client = get_redis()
        client.delete(self._key(email))


def get_code_store(purpose: str = "register") -> CodeStore:
    try:
        client = get_redis()
        client.ping()
        return RedisCodeStore(purpose)
    except Exception:
        logger.warning("Redis unavailable for verification codes, using in-memory store")
        return MemoryCodeStore(purpose)


def generate_verification_code(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))
