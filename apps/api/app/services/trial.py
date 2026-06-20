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


def resolve_registration_trial(settings: AuthSettings, email: str) -> tuple[int, str | None]:
    """Return trial days and membership level for a new registration."""
    days = 0
    level: str | None = None

    if settings.registration_trial_enabled:
        days = max(1, int(settings.registration_trial_days or 30))
        level = (settings.registration_trial_membership_level or "vip").strip().lower() or "vip"

    if settings.google_trial_enabled and is_google_email(email, settings):
        google_days = max(1, int(settings.google_trial_days or 30))
        google_level = (settings.google_trial_membership_level or "vip").strip().lower() or "vip"
        if google_days > days:
            days = google_days
            level = google_level

    if days <= 0 or not level:
        return 0, None
    return days, level


def apply_registration_benefits(db: Session, user: User) -> None:
    settings = get_auth_settings(db)
    user.status = "active"
    days, level = resolve_registration_trial(settings, user.email)
    if days > 0 and level:
        user.membership_level = level
        user.membership_expires_at = datetime.now(UTC) + timedelta(days=days)
        return
    user.membership_level = "free"
    user.membership_expires_at = None


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
    days, level = resolve_registration_trial(settings, email)
    enabled = days > 0 and bool(level)

    if enabled and level:
        message = (
            f"新用户注册即享 {days} 天 {level.upper()} 会员，"
            f"到期后将恢复免费版功能。"
        )
        if google and settings.google_trial_enabled and settings.google_trial_days > settings.registration_trial_days:
            message = (
                f"Google 邮箱注册可享 {days} 天 {level.upper()} 会员，"
                f"到期后将恢复免费版功能。"
            )
    else:
        message = "注册后可免费使用基础功能。"

    return {
        "email": email,
        "is_google_email": google,
        "registration_trial_enabled": enabled,
        "registration_trial_days": days if enabled else 0,
        "registration_trial_membership_level": level if enabled else None,
        "google_trial_enabled": enabled and google,
        "google_trial_days": days if enabled and google else 0,
        "google_trial_membership_level": level if enabled and google else None,
        "email_verification_enabled": settings.email_verification_enabled,
        "message": message,
    }
