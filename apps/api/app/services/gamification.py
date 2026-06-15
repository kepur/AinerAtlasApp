from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    GrowthRecord,
    UserXP,
    XPTransaction,
    XP_REWARDS,
    xp_to_level,
    utc_now,
)


def get_or_create_user_xp(db: Session, user_id: str) -> UserXP:
    user_xp = db.scalar(select(UserXP).where(UserXP.user_id == user_id))
    if not user_xp:
        user_xp = UserXP(user_id=user_id)
        db.add(user_xp)
        db.flush()
    return user_xp


def award_xp(
    db: Session,
    user_id: str,
    activity_type: str,
    description: str = "",
    reference_id: str | None = None,
    xp_amount: int | None = None,
    expression_points_amount: int | None = None,
) -> XPTransaction:
    xp = xp_amount if xp_amount is not None else XP_REWARDS.get(activity_type, 0)
    ep = expression_points_amount if expression_points_amount is not None else 0

    user_xp = get_or_create_user_xp(db, user_id)

    today = date.today()
    if activity_type == "daily_login":
        if user_xp.last_activity_date == today:
            return _create_transaction(db, user_id, 0, 0, activity_type, description, reference_id)
        if user_xp.last_activity_date and (today - user_xp.last_activity_date).days == 1:
            user_xp.current_streak_days += 1
        elif user_xp.last_activity_date != today:
            user_xp.current_streak_days = 1
        if user_xp.current_streak_days > user_xp.longest_streak_days:
            user_xp.longest_streak_days = user_xp.current_streak_days
        user_xp.last_activity_date = today

        if user_xp.current_streak_days >= 3:
            streak_bonus = XP_REWARDS.get("streak_bonus", 5) * (user_xp.current_streak_days // 3)
            xp += streak_bonus
            description = f"{description} (+{streak_bonus} streak bonus)" if description else f"streak bonus x{user_xp.current_streak_days // 3}"
    elif user_xp.last_activity_date != today:
        if user_xp.last_activity_date and (today - user_xp.last_activity_date).days == 1:
            user_xp.current_streak_days += 1
        elif user_xp.last_activity_date and (today - user_xp.last_activity_date).days > 1:
            user_xp.current_streak_days = 1
        elif not user_xp.last_activity_date:
            user_xp.current_streak_days = 1
        if user_xp.current_streak_days > user_xp.longest_streak_days:
            user_xp.longest_streak_days = user_xp.current_streak_days
        user_xp.last_activity_date = today

    user_xp.total_xp += xp
    user_xp.expression_points += ep
    old_level = user_xp.current_level
    new_level = xp_to_level(user_xp.total_xp)
    user_xp.current_level = new_level

    transaction = _create_transaction(db, user_id, xp, ep, activity_type, description, reference_id)
    return transaction


def _create_transaction(
    db: Session,
    user_id: str,
    xp: int,
    ep: int,
    activity_type: str,
    description: str,
    reference_id: str | None,
) -> XPTransaction:
    transaction = XPTransaction(
        user_id=user_id,
        xp_amount=xp,
        expression_points_amount=ep,
        activity_type=activity_type,
        description=description,
        reference_id=reference_id,
    )
    db.add(transaction)
    return transaction


def create_growth_snapshot(db: Session, user_id: str) -> GrowthRecord | None:
    user_xp = get_or_create_user_xp(db, user_id)
    today = date.today()

    existing = db.scalar(
        select(GrowthRecord).where(
            GrowthRecord.user_id == user_id,
            GrowthRecord.record_date == today,
        )
    )
    if existing:
        return None

    from app.models import Conversation, ExpressionAsset, GrammarPattern, VocabularyItem

    conversations_count = db.scalar(
        select(Conversation).where(Conversation.user_id == user_id).count()
    ) or 0
    assets_count = db.scalar(
        select(ExpressionAsset).where(ExpressionAsset.user_id == user_id).count()
    ) or 0
    patterns_mastered = db.scalar(
        select(GrammarPattern).where(
            GrammarPattern.user_id == user_id,
            GrammarPattern.status == "mastered",
        ).count()
    ) or 0
    vocabulary_mastered = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.user_id == user_id,
            VocabularyItem.mastery_status == "mastered",
        ).count()
    ) or 0

    record = GrowthRecord(
        user_id=user_id,
        record_date=today,
        level=user_xp.current_level,
        total_xp=user_xp.total_xp,
        expression_points=user_xp.expression_points,
        conversations_count=conversations_count,
        assets_count=assets_count,
        patterns_mastered=patterns_mastered,
        vocabulary_mastered=vocabulary_mastered,
        streak_days=user_xp.current_streak_days,
    )
    db.add(record)
    return record
