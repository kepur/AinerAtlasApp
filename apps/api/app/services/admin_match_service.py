"""Admin match-radar: AI tag extraction and one-click matching."""

from __future__ import annotations

import random
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    MatchAnalysisReport,
    MatchRecommendation,
    User,
    UserMatchProfile,
    UserPersonalityTest,
    UserProfile,
    UserValueProfile,
)
from app.services.matching import compute_match_score
from app.services.user_profile_analysis import latest_analysis_details


def _age_group_from_birthday(birthday: date | None) -> str:
    if not birthday:
        return ""
    today = date.today()
    age = today.year - birthday.year - (
        (today.month, today.day) < (birthday.month, birthday.day)
    )
    if age < 18:
        return "18岁以下"
    if age < 25:
        return "18-24"
    if age < 35:
        return "25-34"
    if age < 45:
        return "35-44"
    if age < 55:
        return "45-54"
    return "55+"


def extract_ai_tags(
    db: Session,
    user_id: str,
) -> dict:
    """Flatten latest AI analysis + profile into display tags for admin table."""
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user_id))
    personality = db.scalar(select(UserPersonalityTest).where(UserPersonalityTest.user_id == user_id))
    analysis = latest_analysis_details(db, user_id)

    birthday = None
    if profile and profile.birthday:
        birthday = profile.birthday
    elif match_profile and match_profile.birthday:
        birthday = match_profile.birthday

    age_group = ""
    mbti = ""
    hobbies: list[str] = []
    personality_type = ""
    match_tags: list[str] = []
    interests: list[str] = []
    analyzed_at: str | None = None

    if analysis:
        age_group = str(analysis.get("age_group") or "")
        mbti = str(analysis.get("mbti") or "")
        hobbies = list(analysis.get("hobbies") or [])
        personality_type = str(analysis.get("personality_type") or "")
        match_tags = list(analysis.get("match_tags") or [])
        analyzed_at = analysis.get("analyzed_at")

    if not age_group:
        age_group = _age_group_from_birthday(birthday)

    if personality and personality.mbti and not mbti:
        mbti = personality.mbti

    if match_profile and match_profile.interests:
        interests = list(match_profile.interests)
    elif profile and profile.favorite_topics:
        interests = list(profile.favorite_topics)

    if not hobbies and match_profile and match_profile.tags:
        hobbies = list(match_profile.tags[:5])

    label_parts = [p for p in [age_group, mbti, personality_type] if p]
    extra_tags = match_tags[:6]

    return {
        "age_group": age_group,
        "mbti": mbti,
        "personality_type": personality_type,
        "hobbies": hobbies,
        "interests": interests,
        "match_tags": match_tags,
        "label": " · ".join(label_parts) if label_parts else "",
        "tags_display": extra_tags,
        "analyzed_at": analyzed_at,
        "has_analysis": bool(analysis),
    }


def get_match_history(db: Session, user_id: str, limit: int = 5) -> list[dict]:
    rows = list(
        db.scalars(
            select(MatchRecommendation)
            .where(MatchRecommendation.user_id == user_id)
            .order_by(MatchRecommendation.created_at.desc())
            .limit(limit)
        )
    )
    history: list[dict] = []
    for row in rows:
        target = db.get(User, row.target_user_id)
        history.append(
            {
                "id": row.id,
                "target_user_id": row.target_user_id,
                "target_email": target.email if target else "Unknown",
                "target_username": target.username if target else "",
                "score": row.score,
                "status": row.status,
                "reasons": row.reasons or [],
                "created_at": row.created_at.isoformat(),
            }
        )
    return history


def admin_one_click_match(
    db: Session,
    user_id: str,
    *,
    min_score: float = 25.0,
) -> dict:
    user = db.get(User, user_id)
    if not user:
        return {"matched": False, "message": "用户不存在"}

    user_profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    user_match = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user_id))
    user_values = db.scalar(select(UserValueProfile).where(UserValueProfile.user_id == user_id))
    user_analysis = latest_analysis_details(db, user_id)

    already_matched = set(
        db.scalars(
            select(MatchRecommendation.target_user_id).where(
                MatchRecommendation.user_id == user_id
            )
        )
    )

    candidates = list(
        db.scalars(
            select(User).where(User.id != user_id, User.status == "active").limit(200)
        )
    )

    scored: list[tuple[User, float, list[str]]] = []
    for candidate in candidates:
        if candidate.id in already_matched:
            continue
        target_profile = db.scalar(
            select(UserProfile).where(UserProfile.user_id == candidate.id)
        )
        target_match = db.scalar(
            select(UserMatchProfile).where(UserMatchProfile.user_id == candidate.id)
        )
        target_values = db.scalar(
            select(UserValueProfile).where(UserValueProfile.user_id == candidate.id)
        )
        target_analysis = latest_analysis_details(db, candidate.id)
        score, reasons = compute_match_score(
            user_profile,
            user_match,
            user_values,
            target_profile,
            target_match,
            target_values,
            user_analysis=user_analysis,
            target_analysis=target_analysis,
        )
        if score >= min_score:
            scored.append((candidate, score, reasons))

    if not scored:
        return {
            "matched": False,
            "message": "未找到新的合适匹配对象，请先运行 AI 分析或降低匹配门槛",
        }

    picked_user, score, reasons = random.choice(scored)
    rec = MatchRecommendation(
        user_id=user_id,
        target_user_id=picked_user.id,
        score=score,
        reasons=[*reasons, "管理员一键匹配"],
        status="admin_matched",
    )
    db.add(rec)
    db.flush()

    return {
        "matched": True,
        "recommendation_id": rec.id,
        "target_user_id": picked_user.id,
        "target_email": picked_user.email,
        "target_username": picked_user.username,
        "score": score,
        "reasons": rec.reasons,
        "message": f"已匹配 {picked_user.email}（相似度 {score:.0f}）",
    }
