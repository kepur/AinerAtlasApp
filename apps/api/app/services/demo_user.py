from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models import AuthSettings, User, UserProfile
from app.services.auth_settings import get_demo_password


def resolve_demo_credentials(settings: AuthSettings) -> tuple[str, str]:
    app_settings = get_settings()
    email = (settings.demo_user_email or app_settings.initial_demo_email).lower().strip()
    password = get_demo_password(settings) or app_settings.initial_demo_password
    return email, password


def ensure_demo_user(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    password_hash = hash_password(password)
    if not user:
        user = User(
            email=email,
            username="Demo User",
            password_hash=password_hash,
            role="user",
            membership_level="vip",
            status="active",
        )
        db.add(user)
        db.flush()
        db.add(UserProfile(user_id=user.id))
        return user

    user.password_hash = password_hash
    user.status = "active"
    if user.membership_level in {"", "free", "expired"}:
        user.membership_level = "vip"
    user.membership_expires_at = None
    return user


def sync_demo_user_from_settings(db: Session, settings: AuthSettings | None = None) -> User | None:
    settings = settings or db.get(AuthSettings, "default")
    if not settings:
        return None
    email, password = resolve_demo_credentials(settings)
    return ensure_demo_user(db, email, password)
