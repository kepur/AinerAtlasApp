"""Membership capability checks shared across API routes."""

from __future__ import annotations

from app.db.redis import MEMBERSHIP_DAILY_LIMITS, normalize_membership_level
from app.models import User

PAID_MEMBERSHIP_LEVELS = frozenset({"vip", "pro"})


def _effective_membership(user: User) -> str:
    if user.role in {"admin", "super_admin"}:
        return user.role
    return normalize_membership_level(user.membership_level)


def has_voice_coach_access(user: User | None) -> bool:
    """True when the user may start realtime voice coach (VIP tier or above)."""
    if user is None:
        return False
    if user.status in {"disabled", "expired"}:
        return False
    membership = _effective_membership(user)
    limits = MEMBERSHIP_DAILY_LIMITS.get(membership, MEMBERSHIP_DAILY_LIMITS["free"])
    return int(limits.get("voice_minutes", 0)) > 0
