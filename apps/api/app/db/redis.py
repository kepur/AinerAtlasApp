from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from redis import Redis

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import MembershipPlan, User


MEMBERSHIP_DAILY_LIMITS: dict[str, dict[str, int]] = {
    "guest": {"ai_dialogue": 3, "voice_minutes": 0},
    "free": {"ai_dialogue": 5, "voice_minutes": 0},
    "vip": {"ai_dialogue": 50, "voice_minutes": 10},
    "pro": {"ai_dialogue": 200, "voice_minutes": 30},
    "premium": {"ai_dialogue": 500, "voice_minutes": 120},
    "admin": {"ai_dialogue": 10000, "voice_minutes": 1000},
    "super_admin": {"ai_dialogue": 10000, "voice_minutes": 1000},
}


def get_redis() -> Redis:
    return Redis.from_url(get_settings().redis_url, decode_responses=True)


@dataclass(slots=True)
class QuotaSnapshot:
    used: int
    limit: int

    @property
    def remaining(self) -> int:
        return max(self.limit - self.used, 0)


BUCKET_TO_PLAN_FIELD = {
    "ai_dialogue": "daily_ai_dialogue",
    "voice_minutes": "daily_voice_minutes",
}


class QuotaManager:
    def __init__(self, redis_client: Redis, db: Session | None = None):
        self.redis = redis_client
        self.db = db

    def consume_ai_dialogue(self, user: User, amount: int = 1) -> QuotaSnapshot:
        return self._consume(user=user, bucket="ai_dialogue", amount=amount)

    def consume_voice_minutes(self, user: User, minutes: int = 1) -> QuotaSnapshot:
        return self._consume(user=user, bucket="voice_minutes", amount=minutes)

    def _consume(self, user: User, bucket: str, amount: int) -> QuotaSnapshot:
        limit = self._get_limit(user, bucket)
        if limit <= 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily {bucket} quota exhausted for membership level '{user.membership_level}'",
            )

        key = self._build_key(user.id, bucket)
        used = int(self.redis.incrby(key, amount))
        self.redis.expireat(key, self._next_reset_at())

        if used > limit:
            self.redis.decrby(key, amount)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily {bucket} quota exhausted ({limit}/{limit})",
            )

        return QuotaSnapshot(used=used, limit=limit)

    def _get_limit(self, user: User, bucket: str) -> int:
        membership = user.role if user.role in {"admin", "super_admin"} else user.membership_level
        if self.db is not None:
            plan_field = BUCKET_TO_PLAN_FIELD.get(bucket)
            if plan_field:
                plan = self.db.scalar(
                    select(MembershipPlan).where(
                        MembershipPlan.level == membership,
                        MembershipPlan.enabled.is_(True),
                    )
                )
                if plan is not None:
                    return int(getattr(plan, plan_field))
        limits = MEMBERSHIP_DAILY_LIMITS.get(membership, MEMBERSHIP_DAILY_LIMITS["free"])
        return limits[bucket]

    @staticmethod
    def _build_key(user_id: str, bucket: str) -> str:
        day = datetime.now(UTC).strftime("%Y-%m-%d")
        return f"quota:{bucket}:{day}:{user_id}"

    @staticmethod
    def _next_reset_at() -> datetime:
        now = datetime.now(UTC)
        tomorrow = (now + timedelta(days=1)).date()
        return datetime.combine(tomorrow, datetime.min.time(), tzinfo=UTC)