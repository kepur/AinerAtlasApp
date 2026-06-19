from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.redis import MEMBERSHIP_MATCH_BATCH, QuotaManager, normalize_membership_level
from app.models import MembershipPlan, User


def _membership_key(user: User) -> str:
    return user.role if user.role in {"admin", "super_admin"} else normalize_membership_level(user.membership_level)


def get_match_batch_size(user: User, db: Session) -> int:
    membership = _membership_key(user)
    plan = db.scalar(
        select(MembershipPlan).where(
            MembershipPlan.level == membership,
            MembershipPlan.enabled.is_(True),
        )
    )
    if plan is not None:
        return int(plan.match_batch_size)
    return MEMBERSHIP_MATCH_BATCH.get(membership, MEMBERSHIP_MATCH_BATCH["free"])


def build_match_quota_read(user: User, db: Session, quota: QuotaManager) -> dict:
    snapshot = quota.snapshot_match_cards(user)
    batch_size = get_match_batch_size(user, db)
    return {
        "membership_level": user.membership_level,
        "daily_match_cards": snapshot.limit,
        "match_batch_size": batch_size,
        "cards_used": snapshot.used,
        "cards_remaining": snapshot.remaining,
        "unlimited": snapshot.unlimited,
    }
