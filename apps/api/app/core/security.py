import sys
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_fernet_instance: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    settings = get_settings()
    key = settings.encryption_key

    if not key:
        key = Fernet.generate_key().decode()
        print(
            f"\n{'='*60}\n"
            f"WARNING: No ENCRYPTION_KEY found in environment.\n"
            f"Auto-generated key (add to .env to persist across restarts):\n\n"
            f"  ENCRYPTION_KEY={key}\n"
            f"\n{'='*60}\n",
            file=sys.stderr,
        )

    _fernet_instance = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet_instance


def encrypt_api_key(plain_key: str) -> str:
    if not plain_key:
        return ""
    if get_settings().store_plaintext_api_keys:
        return plain_key
    return _get_fernet().encrypt(plain_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    if not encrypted_key:
        return ""
    if encrypted_key.startswith("encrypted:"):
        return encrypted_key.removeprefix("encrypted:")
    if get_settings().store_plaintext_api_keys:
        if encrypted_key.startswith("gAAAA"):
            try:
                return _get_fernet().decrypt(encrypted_key.encode()).decode()
            except InvalidToken:
                return ""
        return encrypted_key
    try:
        return _get_fernet().decrypt(encrypted_key.encode()).decode()
    except InvalidToken:
        if encrypted_key.startswith(("sk-", "Bearer ")):
            return encrypted_key
        return ""


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": subject, "exp": expires_at, "type": "access"}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload: dict[str, Any] = {"sub": subject, "exp": expires_at, "type": "refresh"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_reset_token(subject: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_reset_token_expire_minutes)
    payload: dict[str, Any] = {"sub": subject, "exp": expires_at, "type": "reset"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def decode_refresh_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "refresh":
        raise ValueError("Invalid token type")
    return payload


def decode_reset_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "reset":
        raise ValueError("Invalid token type")
    return payload


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
