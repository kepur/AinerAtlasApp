from fastapi import APIRouter, Body, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models import (
    CircleMember,
    CircleRoom,
    MatchFeedback,
    MatchRecommendation,
    MatchRequest,
    User,
    UserMatchProfile,
    UserMatchSettings,
    UserProfile,
    UserValueProfile,
    utc_now,
)
from app.schemas import (
    MatchEnableRequest,
    MatchFeedbackCreate,
    MatchFeedbackRead,
    MatchProfileUpdate,
    MatchRecommendationRead,
    MatchRequestCreate,
    MatchRequestRead,
    ValueProfileUpdate,
)
from app.services.ai_host import host_intro
from app.services.matching import (
    compute_match_score,
    compute_profile_completeness,
    generate_icebreaker,
)

router = APIRouter(prefix="/connect", tags=["matching"])

SOULMATE_THRESHOLD = 80.0


@router.post("/enable")
def enable_matching(
    payload: MatchEnableRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    if not settings:
        settings = UserMatchSettings(user_id=current_user.id)
        db.add(settings)

    if payload.match_mode == "soulmate":
        match_profile = db.scalar(
            select(UserMatchProfile).where(UserMatchProfile.user_id == current_user.id)
        )
        value_profile = db.scalar(
            select(UserValueProfile).where(UserValueProfile.user_id == current_user.id)
        )
        completeness = compute_profile_completeness(match_profile, value_profile)
        if completeness < SOULMATE_THRESHOLD:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "profile_incomplete",
                    "completeness": completeness,
                    "required": SOULMATE_THRESHOLD,
                    "message": "Soulmate 模式需要完整度达到 80%，请补充情感价值观和生活方式问卷",
                },
            )
        settings.profile_completeness = completeness

    settings.enabled = payload.enabled
    settings.match_mode = payload.match_mode
    settings.visibility = payload.visibility
    db.commit()
    return {
        "enabled": settings.enabled,
        "match_mode": settings.match_mode,
        "profile_completeness": settings.profile_completeness,
    }


@router.put("/profile")
def update_match_profile(
    payload: MatchProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    profile = db.scalar(
        select(UserMatchProfile).where(UserMatchProfile.user_id == current_user.id)
    )
    if not profile:
        profile = UserMatchProfile(user_id=current_user.id)
        db.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)

    value_profile = db.scalar(
        select(UserValueProfile).where(UserValueProfile.user_id == current_user.id)
    )
    settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    completeness = compute_profile_completeness(profile, value_profile)
    if settings:
        settings.profile_completeness = completeness
    if value_profile:
        value_profile.completeness_score = completeness

    db.commit()
    return {"profile_completeness": completeness}


@router.put("/values")
def update_value_profile(
    payload: ValueProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    profile = db.scalar(
        select(UserValueProfile).where(UserValueProfile.user_id == current_user.id)
    )
    if not profile:
        profile = UserValueProfile(user_id=current_user.id)
        db.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)

    match_profile = db.scalar(
        select(UserMatchProfile).where(UserMatchProfile.user_id == current_user.id)
    )
    completeness = compute_profile_completeness(match_profile, profile)
    profile.completeness_score = completeness

    settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    if settings:
        settings.profile_completeness = completeness

    db.commit()
    return {"completeness_score": completeness, "soulmate_ready": completeness >= SOULMATE_THRESHOLD}


@router.get("/readiness")
def soulmate_readiness(current_user: CurrentUser, db: DBSession) -> dict:
    match_profile = db.scalar(
        select(UserMatchProfile).where(UserMatchProfile.user_id == current_user.id)
    )
    value_profile = db.scalar(
        select(UserValueProfile).where(UserValueProfile.user_id == current_user.id)
    )
    completeness = compute_profile_completeness(match_profile, value_profile)
    missing: list[str] = []
    if not match_profile or not match_profile.bio:
        missing.append("bio")
    if not value_profile or not value_profile.emotional_values:
        missing.append("emotional_values")
    if not value_profile or not value_profile.lifestyle_prefs:
        missing.append("lifestyle_prefs")
    if not value_profile or not value_profile.relationship_goals:
        missing.append("relationship_goals")
    return {
        "completeness": completeness,
        "soulmate_ready": completeness >= SOULMATE_THRESHOLD,
        "missing_fields": missing,
    }


@router.get("/recommendations", response_model=list[MatchRecommendationRead])
def get_recommendations(
    current_user: CurrentUser,
    db: DBSession,
) -> list[MatchRecommendationRead]:
    settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    if not settings or not settings.enabled:
        raise HTTPException(status_code=400, detail="Matching is not enabled")

    user_profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    user_match = db.scalar(
        select(UserMatchProfile).where(UserMatchProfile.user_id == current_user.id)
    )
    user_values = db.scalar(
        select(UserValueProfile).where(UserValueProfile.user_id == current_user.id)
    )

    candidates = list(
        db.scalars(
            select(User)
            .where(User.id != current_user.id, User.status == "active")
            .limit(20)
        )
    )

    results: list[MatchRecommendationRead] = []
    for candidate in candidates:
        target_profile = db.scalar(
            select(UserProfile).where(UserProfile.user_id == candidate.id)
        )
        target_match = db.scalar(
            select(UserMatchProfile).where(UserMatchProfile.user_id == candidate.id)
        )
        target_values = db.scalar(
            select(UserValueProfile).where(UserValueProfile.user_id == candidate.id)
        )
        score, reasons = compute_match_score(
            user_profile, user_match, user_values,
            target_profile, target_match, target_values,
        )
        if score < 30:
            continue

        existing = db.scalar(
            select(MatchRecommendation).where(
                MatchRecommendation.user_id == current_user.id,
                MatchRecommendation.target_user_id == candidate.id,
            )
        )
        if not existing:
            rec = MatchRecommendation(
                user_id=current_user.id,
                target_user_id=candidate.id,
                score=score,
                reasons=reasons,
            )
            db.add(rec)
            db.flush()
            existing = rec

        results.append(
            MatchRecommendationRead(
                id=existing.id,
                target_user_id=candidate.id,
                target_username=candidate.username,
                score=score,
                reasons=reasons,
                status=existing.status,
                icebreaker=generate_icebreaker(reasons, candidate.username),
                created_at=existing.created_at,
            )
        )

    db.commit()
    results.sort(key=lambda r: r.score, reverse=True)
    return results[:10]


@router.post("/trio-room")
async def create_trio_room(
    current_user: CurrentUser,
    db: DBSession,
    partner_user_id: str = Body("", embed=True),
    icebreaker: str = Body("", embed=True),
) -> dict:
    partner_id: str = partner_user_id

    partner = db.get(User, partner_id) if partner_id else None
    partner_name = partner.username if partner else "Partner"

    room = CircleRoom(
        creator_id=current_user.id,
        title=f"三人对话 · {current_user.username} & {partner_name}",
        max_members=3,
        room_type="language_circle",
        allowed_languages=["zh", "en"],
    )
    db.add(room)
    db.flush()
    db.add(CircleMember(room_id=room.id, user_id=current_user.id, role="host"))
    if partner_id and partner:
        db.add(CircleMember(room_id=room.id, user_id=partner_id, role="member"))
    db.commit()

    if icebreaker:
        from app.models import CircleMessage
        intro_msg = CircleMessage(
            room_id=room.id,
            user_id=None,
            role="assistant",
            content=f"欢迎来到三人对话！今天的破冰话题：{icebreaker}",
            content_language="zh",
            translated_content="",
            analysis={"type": "host"},
        )
        db.add(intro_msg)
        db.commit()

    return {"id": room.id}


@router.post("/requests", response_model=MatchRequestRead, status_code=201)
def send_match_request(
    payload: MatchRequestCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> MatchRequest:
    target = db.get(User, payload.to_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    req = MatchRequest(
        from_user_id=current_user.id,
        to_user_id=payload.to_user_id,
        message=payload.message,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/requests", response_model=list[MatchRequestRead])
def list_requests(current_user: CurrentUser, db: DBSession) -> list[MatchRequest]:
    return list(
        db.scalars(
            select(MatchRequest)
            .where(
                (MatchRequest.from_user_id == current_user.id)
                | (MatchRequest.to_user_id == current_user.id)
            )
            .order_by(MatchRequest.created_at.desc())
        )
    )


@router.post("/requests/{request_id}/accept", response_model=MatchRequestRead)
async def accept_request(
    request_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> MatchRequest:
    req = db.get(MatchRequest, request_id)
    if not req or req.to_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "accepted"
    req.responded_at = utc_now()

    from_user = db.get(User, req.from_user_id)
    to_user = db.get(User, req.to_user_id)
    intro = await host_intro(
        from_user.username if from_user else "User A",
        to_user.username if to_user else "User B",
        [],
        db=db,
    )
    db.commit()
    db.refresh(req)
    return req


@router.post("/requests/{request_id}/reject", response_model=MatchRequestRead)
def reject_request(
    request_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> MatchRequest:
    req = db.get(MatchRequest, request_id)
    if not req or req.to_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "rejected"
    req.responded_at = utc_now()
    db.commit()
    db.refresh(req)
    return req


@router.post("/feedback", response_model=MatchFeedbackRead, status_code=201)
def submit_feedback(
    payload: MatchFeedbackCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> MatchFeedback:
    recommendation = db.get(MatchRecommendation, payload.recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    feedback = MatchFeedback(
        from_user_id=current_user.id,
        to_user_id=recommendation.target_user_id,
        recommendation_id=payload.recommendation_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/feedback/{recommendation_id}", response_model=list[MatchFeedbackRead])
def get_feedback(
    recommendation_id: str,
    db: DBSession,
) -> list[MatchFeedback]:
    recommendation = db.get(MatchRecommendation, recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return list(
        db.scalars(
            select(MatchFeedback)
            .where(MatchFeedback.recommendation_id == recommendation_id)
            .order_by(MatchFeedback.created_at.desc())
        )
    )
