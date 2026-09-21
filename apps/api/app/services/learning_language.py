"""One target-language boundary shared by courses, conversations and practice."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserProfile


def learning_language(db: Session, user_id: str, explicit: str | None = None) -> str:
    code = (
        explicit
        or db.scalar(
            select(UserProfile.primary_target_language).where(UserProfile.user_id == user_id)
        )
        or "en"
    )
    return code.strip().lower().replace("_", "-").split("-", 1)[0]
