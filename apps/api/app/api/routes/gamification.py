from datetime import date, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func

from app.api.deps import CurrentUser, DBSession
from app.models import GrowthRecord, UserXP, XPTransaction, xp_to_level, XP_REWARDS
from app.services.gamification import get_or_create_user_xp, create_growth_snapshot

router = APIRouter(prefix="/gamification", tags=["gamification"])


class XPRead(BaseModel):
    total_xp: int
    expression_points: int
    current_level: int
    current_streak_days: int
    longest_streak_days: int
    next_level_xp: int
    xp_to_next_level: int
    model_config = {"from_attributes": True}


class XPTransactionRead(BaseModel):
    id: str
    xp_amount: int
    expression_points_amount: int
    activity_type: str
    description: str
    created_at: str
    model_config = {"from_attributes": True}


class GrowthRecordRead(BaseModel):
    record_date: str
    level: int
    total_xp: int
    expression_points: int
    conversations_count: int
    assets_count: int
    patterns_mastered: int
    vocabulary_mastered: int
    streak_days: int
    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_xp: int
    current_level: int
    current_streak_days: int


@router.get("/me", response_model=XPRead)
def get_my_xp(current_user: CurrentUser, db: DBSession) -> dict:
    user_xp = get_or_create_user_xp(db, current_user.id)
    db.commit()
    db.refresh(user_xp)
    next_level_xp = _next_level_threshold(user_xp.current_level)
    return {
        "total_xp": user_xp.total_xp,
        "expression_points": user_xp.expression_points,
        "current_level": user_xp.current_level,
        "current_streak_days": user_xp.current_streak_days,
        "longest_streak_days": user_xp.longest_streak_days,
        "next_level_xp": next_level_xp,
        "xp_to_next_level": max(0, next_level_xp - user_xp.total_xp),
    }


@router.get("/transactions", response_model=list[XPTransactionRead])
def list_transactions(
    current_user: CurrentUser,
    db: DBSession,
    limit: int = 50,
) -> list[XPTransaction]:
    return list(
        db.scalars(
            select(XPTransaction)
            .where(XPTransaction.user_id == current_user.id)
            .order_by(XPTransaction.created_at.desc())
            .limit(limit)
        )
    )


@router.get("/growth", response_model=list[GrowthRecordRead])
def list_growth_records(
    current_user: CurrentUser,
    db: DBSession,
    days: int = 30,
) -> list[GrowthRecord]:
    cutoff = date.today() - timedelta(days=days)
    return list(
        db.scalars(
            select(GrowthRecord)
            .where(GrowthRecord.user_id == current_user.id, GrowthRecord.record_date >= cutoff)
            .order_by(GrowthRecord.record_date.desc())
            .limit(days)
        )
    )


@router.post("/snapshot")
def trigger_snapshot(current_user: CurrentUser, db: DBSession) -> dict:
    record = create_growth_snapshot(db, current_user.id)
    if record:
        db.commit()
        return {"created": True, "date": str(record.record_date)}
    return {"created": False, "reason": "snapshot already exists today"}


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(db: DBSession, limit: int = 20) -> list[dict]:
    from app.models import User
    results = db.execute(
        select(UserXP, User.username)
        .join(User, User.id == UserXP.user_id)
        .order_by(UserXP.total_xp.desc())
        .limit(limit)
    ).all()
    return [
        {
            "user_id": xp.user_id,
            "username": username or "",
            "total_xp": xp.total_xp,
            "current_level": xp.current_level,
            "current_streak_days": xp.current_streak_days,
        }
        for xp, username in results
    ]


@router.get("/rewards")
def get_reward_table() -> dict:
    return XP_REWARDS


def _next_level_threshold(current_level: int) -> int:
    from app.models import XP_LEVEL_THRESHOLDS
    if current_level < len(XP_LEVEL_THRESHOLDS):
        return XP_LEVEL_THRESHOLDS[current_level]
    return XP_LEVEL_THRESHOLDS[-1] + (current_level - len(XP_LEVEL_THRESHOLDS) + 1) * 10000
