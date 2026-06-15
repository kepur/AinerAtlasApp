from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Any
import datetime

from app.api.deps import require_admin, DBSession
from app.models import User, UserMatchProfile, Conversation, Topic, MatchAnalysisReport, MatchRecommendation, UserProfile

router = APIRouter()

@router.get("/users")
def list_match_users(db: DBSession, current_user: User = Depends(require_admin)):
    """List users who have a MatchProfile or have participated in conversations."""
    users = db.scalars(
        select(User)
        .options(
            selectinload(User.profile)
        )
        .limit(100)
    ).all()
    
    result = []
    for user in users:
        match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user.id))
        result.append({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "created_at": user.created_at,
            "has_match_profile": match_profile is not None,
            "birthday": match_profile.birthday.isoformat() if match_profile and match_profile.birthday else None,
        })
    return result

@router.get("/users/{user_id}")
def get_match_user_detail(user_id: str, db: DBSession, current_user: User = Depends(require_admin)):
    """Get detailed match radar information for a user."""
    user = db.scalar(select(User).options(selectinload(User.profile)).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "User not found")
        
    match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user_id))
    
    # Get last 5 conversations
    conversations = db.scalars(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(5)
    ).all()
    
    # Get last 5 topics
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
        } if match_profile else None,
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "topic": c.topic,
                "updated_at": c.updated_at.isoformat()
            } for c in conversations
        ],
        "topics": [
            {
                "id": t.id,
                "title": t.title,
                "created_at": t.created_at.isoformat()
            } for t in topics
        ]
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
            "created_at": r.created_at.isoformat()
        } for r in reports
    ]

@router.get("/users/{user_id}/matches")
def get_user_match_recommendations(user_id: str, db: DBSession, current_user: User = Depends(require_admin)):
    """Get match recommendations for the user."""
    matches = db.scalars(
        select(MatchRecommendation)
        .where(MatchRecommendation.user_id == user_id)
        .order_by(MatchRecommendation.score.desc())
    ).all()
    
    result = []
    for m in matches:
        target_user = db.scalar(select(User).where(User.id == m.target_user_id))
        result.append({
            "id": m.id,
            "target_user_id": m.target_user_id,
            "target_email": target_user.email if target_user else "Unknown",
            "score": m.score,
            "reasons": m.reasons,
            "status": m.status,
            "created_at": m.created_at.isoformat()
        })
    return result
