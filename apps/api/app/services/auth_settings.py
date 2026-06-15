from sqlalchemy.orm import Session

from app.core.security import decrypt_api_key, encrypt_api_key
from app.models import AuthSettings

DEFAULT_AUTH_SETTINGS_ID = "default"


def get_auth_settings(db: Session) -> AuthSettings:
    settings = db.get(AuthSettings, DEFAULT_AUTH_SETTINGS_ID)
    if not settings:
        settings = AuthSettings(id=DEFAULT_AUTH_SETTINGS_ID)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def get_smtp_password(settings: AuthSettings) -> str:
    if not settings.smtp_password_encrypted:
        return ""
    return decrypt_api_key(settings.smtp_password_encrypted)


def set_smtp_password(settings: AuthSettings, password: str) -> None:
    settings.smtp_password_encrypted = encrypt_api_key(password) if password else ""


def get_demo_password(settings: AuthSettings) -> str:
    if not settings.demo_user_password_encrypted:
        return ""
    return decrypt_api_key(settings.demo_user_password_encrypted)


def set_demo_password(settings: AuthSettings, password: str) -> None:
    settings.demo_user_password_encrypted = encrypt_api_key(password) if password else ""


def demo_password_configured(settings: AuthSettings) -> bool:
    return bool(settings.demo_user_password_encrypted)
