from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import AuthSettings, User
from app.services.auth_settings import get_auth_settings


GOOGLE_DOMAINS = {"gmail.com", "googlemail.com"}


def email_domain(email: str) -> str:
    return email.lower().split("@")[-1].strip()


def is_google_email(email: str, settings: AuthSettings | None = None) -> bool:
    domain = email_domain(email)
    if settings and settings.google_email_domains:
        return domain in {item.lower() for item in settings.google_email_domains}
    return domain in GOOGLE_DOMAINS


def apply_registration_benefits(db: Session, user: User) -> None:
    settings = get_auth_settings(db)
    if settings.google_trial_enabled and is_google_email(user.email, settings):
        user.membership_level = settings.google_trial_membership_level
        user.membership_expires_at = datetime.now(UTC) + timedelta(days=settings.google_trial_days)
        user.status = "active"
        return
    user.membership_level = "free"
    user.membership_expires_at = None
    user.status = "active"


def expire_user_if_needed(user: User) -> bool:
    """Return True if user was expired during this check."""
    if user.role in {"admin", "super_admin"}:
        return False
    if not user.membership_expires_at:
        return False
    if datetime.now(UTC) <= user.membership_expires_at:
        return False
    user.status = "expired"
    user.membership_level = "free"
    return True


def registration_preview(db: Session, email: str) -> dict:
    settings = get_auth_settings(db)
    google = is_google_email(email, settings)
    return {
        "email": email,
        "is_google_email": google,
        "google_trial_enabled": settings.google_trial_enabled and google,
        "google_trial_days": settings.google_trial_days if google else 0,
        "google_trial_membership_level": (
            settings.google_trial_membership_level if google else None
        ),
        "email_verification_enabled": settings.email_verification_enabled,
        "message": (
            f"Google 邮箱注册可享 {settings.google_trial_days} 天 "
            f"{settings.google_trial_membership_level.upper()} 试用，到期后账号将自动停用。"
            if google and settings.google_trial_enabled
            else "注册后可免费使用基础功能。"
        ),
    }
