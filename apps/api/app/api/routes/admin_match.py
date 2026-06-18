from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin, DBSession
from app.models import User, UserMatchProfile, Conversation, Topic, MatchAnalysisReport, MatchRecommendation
from app.services.admin_match_service import admin_one_click_match, extract_ai_tags, get_match_history
from app.services.llm import get_llm_provider
from app.services.user_profile_analysis import analyze_user_for_matching

router = APIRouter()


@router.get("/users")
def list_match_users(db: DBSession, current_user: User = Depends(require_admin)):
    """List users with AI tags and match history summary."""
    users = db.scalars(
        select(User)
        .options(selectinload(User.profile))
        .limit(100)
    ).all()

    result = []
    for user in users:
        match_profile = db.scalar(
            select(UserMatchProfile).where(UserMatchProfile.user_id == user.id)
        )
        profile = user.profile
        birthday = None
        if profile and profile.birthday:
            birthday = profile.birthday.isoformat()
        elif match_profile and match_profile.birthday:
            birthday = match_profile.birthday.isoformat()

        ai_tags = extract_ai_tags(db, user.id)
        history = get_match_history(db, user.id, limit=3)

        result.append(
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "created_at": user.created_at,
                "has_match_profile": match_profile is not None,
                "birthday": birthday,
                "ai_tags": ai_tags,
                "match_count": len(
                    db.scalars(
                        select(MatchRecommendation.id).where(
                            MatchRecommendation.user_id == user.id
                        )
                    ).all()
                ),
                "match_history": history,
            }
        )
    return result


@router.get("/users/{user_id}")
def get_match_user_detail(user_id: str, db: DBSession, current_user: User = Depends(require_admin)):
    """Get detailed match radar information for a user."""
    user = db.scalar(select(User).options(selectinload(User.profile)).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "User not found")

    match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user_id))
    ai_tags = extract_ai_tags(db, user_id)

    conversations = db.scalars(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(5)
    ).all()

    topics = db.scalars(
        select(Topic)
        .where(Topic.creator_id == user_id)
        .order_by(Topic.created_at.desc())
        .limit(5)
    ).all()

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "profile": user.profile.model_dump() if hasattr(user.profile, "model_dump") else user.profile,
        },
        "match_profile": {
            "bio": match_profile.bio if match_profile else "",
            "interests": match_profile.interests if match_profile else [],
            "birthday": match_profile.birthday.isoformat() if match_profile and match_profile.birthday else None,
        }
        if match_profile
        else None,
        "ai_tags": ai_tags,
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "topic": c.topic,
                "updated_at": c.updated_at.isoformat(),
            }
            for c in conversations
        ],
        "topics": [
            {
                "id": t.id,
                "title": t.title,
                "created_at": t.created_at.isoformat(),
            }
            for t in topics
        ],
    }


@router.get("/users/{user_id}/analysis")
def get_user_match_analysis(user_id: str, db: DBSession, current_user: User = Depends(require_admin)):
    """Get the AI analysis reports for the user."""
    reports = db.scalars(
        select(MatchAnalysisReport)
        .where(MatchAnalysisReport.user_id == user_id)
        .order_by(MatchAnalysisReport.created_at.desc())
    ).all()

    return [
        {
            "id": r.id,
            "report_type": r.report_type,
            "summary": r.summary,
            "match_score": r.match_score,
            "details": r.details,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]


@router.get("/users/{user_id}/matches")
def get_user_match_recommendations(user_id: str, db: DBSession, current_user: User = Depends(require_admin)):
    """Get match recommendations for the user."""
    return get_match_history(db, user_id, limit=50)


@router.post("/users/{user_id}/analyze")
async def analyze_match_user(user_id: str, db: DBSession, current_user: User = Depends(require_admin)):
    """Run AI analysis for a user (manual trigger from match radar)."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    provider = get_llm_provider()
    report = await analyze_user_for_matching(db, user_id, provider, report_type="manual")
    if not report:
        raise HTTPException(
            400,
            "用户数据不足，无法分析。请确保用户有个人资料或近期对话记录。",
        )
    db.commit()
    db.refresh(report)

    return {
        "ok": True,
        "report_id": report.id,
        "summary": report.summary,
        "match_score": report.match_score,
        "ai_tags": extract_ai_tags(db, user_id),
    }


@router.post("/users/{user_id}/match")
def one_click_match_user(user_id: str, db: DBSession, current_user: User = Depends(require_admin)):
    """Pick a random high-scoring candidate and record the match."""
    result = admin_one_click_match(db, user_id)
    if not result.get("matched"):
        raise HTTPException(400, result.get("message", "匹配失败"))
    db.commit()
    result["match_history"] = get_match_history(db, user_id, limit=10)
    return result
