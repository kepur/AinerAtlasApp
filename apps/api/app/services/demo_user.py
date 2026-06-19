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
        db.add(
            UserProfile(
                user_id=user.id,
                native_language="zh",
                primary_target_language="en",
                current_level="B1",
                favorite_topics=["欧洲生活", "职业发展", "移民规划"],
                grammar_level_score=62,
                vocabulary_level_score=58,
                fluency_score=55,
                speaking_confidence_score=52,
            )
        )
        return user

    user.password_hash = password_hash
    user.status = "active"
    user.membership_level = "vip"
    user.membership_expires_at = None
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    if profile and not profile.favorite_topics:
        profile.native_language = profile.native_language or "zh"
        profile.primary_target_language = profile.primary_target_language or "en"
        profile.current_level = profile.current_level or "B1"
        profile.favorite_topics = ["欧洲生活", "职业发展", "移民规划"]
    return user


def sync_demo_user_from_settings(db: Session, settings: AuthSettings | None = None) -> User | None:
    settings = settings or db.get(AuthSettings, "default")
    if not settings:
        return None
    email, password = resolve_demo_credentials(settings)
    return ensure_demo_user(db, email, password)
