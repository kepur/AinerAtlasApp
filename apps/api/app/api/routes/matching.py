import asyncio
from fastapi import APIRouter, Body, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, QuotaManagerDep
from app.models import (
    CircleMember,
    CircleMessage,
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
    CircleMessageRead,
    MatchEnableRequest,
    MatchFeedbackCreate,
    MatchFeedbackRead,
    MatchProfileUpdate,
    MatchQuotaRead,
    MatchRecommendationRead,
    MatchRequestCreate,
    MatchRequestRead,
    ValueProfileUpdate,
)
from app.services.friendship_service import (
    are_friends,
    friendship_to_friend_item,
    list_active_friendships,
    remove_friendship,
)
from app.services.circle_hub import circle_hub
from app.services.membership_access import has_pro_access
from app.services.matching import (
    compute_match_score,
    compute_profile_completeness,
    generate_icebreaker,
)
from app.services.user_profile_analysis import latest_analysis_details
from app.services.match_quota import build_match_quota_read, get_match_batch_size

router = APIRouter(prefix="/connect", tags=["matching"])

SOULMATE_THRESHOLD = 80.0
UNLIMITED_CANDIDATE_SCAN = 200


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


@router.get("/quota", response_model=MatchQuotaRead)
def get_match_quota(
    current_user: CurrentUser,
    db: DBSession,
    quota: QuotaManagerDep,
) -> MatchQuotaRead:
    return MatchQuotaRead(**build_match_quota_read(current_user, db, quota))


def _score_recommendations(
    db: DBSession,
    current_user: User,
    *,
    candidate_limit: int,
) -> tuple[list[tuple[MatchRecommendationRead, dict | None]], dict | None]:
    user_profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    user_match = db.scalar(
        select(UserMatchProfile).where(UserMatchProfile.user_id == current_user.id)
    )
    user_values = db.scalar(
        select(UserValueProfile).where(UserValueProfile.user_id == current_user.id)
    )
    user_analysis = latest_analysis_details(db, current_user.id)

    candidates = list(
        db.scalars(
            select(User)
            .where(User.id != current_user.id, User.status == "active")
            .limit(candidate_limit)
        )
    )

    results: list[tuple[MatchRecommendationRead, dict | None]] = []
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
        target_analysis = latest_analysis_details(db, candidate.id)
        score, reasons = compute_match_score(
            user_profile, user_match, user_values,
            target_profile, target_match, target_values,
            user_analysis=user_analysis,
            target_analysis=target_analysis,
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

        rec_read = MatchRecommendationRead(
            id=existing.id,
            target_user_id=candidate.id,
            target_username=candidate.username,
            score=score,
            reasons=reasons,
            status=existing.status,
            icebreaker="",
            created_at=existing.created_at,
        )
        results.append((rec_read, target_analysis))

    db.commit()
    results.sort(key=lambda r: r[0].score, reverse=True)
    return results, user_analysis


@router.get("/recommendations", response_model=list[MatchRecommendationRead])
async def get_recommendations(
    current_user: CurrentUser,
    db: DBSession,
    quota: QuotaManagerDep,
) -> list[MatchRecommendationRead]:
    settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    if not settings or not settings.enabled:
        raise HTTPException(status_code=400, detail="Matching is not enabled")

    quota.consume_match_card(current_user)
    batch_size = get_match_batch_size(current_user, db)
    candidate_limit = UNLIMITED_CANDIDATE_SCAN if batch_size < 0 else max(batch_size * 10, 20)
    
    scored_results, user_analysis = _score_recommendations(db, current_user, candidate_limit=candidate_limit)
    
    selected = scored_results if batch_size < 0 else scored_results[:batch_size]
    
    async def _fill_icebreaker(rec_read: MatchRecommendationRead, target_analysis: dict | None) -> MatchRecommendationRead:
        rec_read.icebreaker = await generate_icebreaker(
            db, rec_read.reasons, rec_read.target_username, user_analysis, target_analysis
        )
        return rec_read

    final_results = await asyncio.gather(*(
        _fill_icebreaker(rec, t_analysis) for rec, t_analysis in selected
    ))
    return list(final_results)


@router.post("/trio-room")
async def create_trio_room(
    current_user: CurrentUser,
    db: DBSession,
    partner_user_id: str = Body("", embed=True),
    icebreaker: str = Body("", embed=True),
) -> dict:
    if not has_pro_access(current_user):
        raise HTTPException(status_code=403, detail="发起 AI 三人对话需要 Pro 会员")

    partner_id: str = partner_user_id

    partner = db.get(User, partner_id) if partner_id else None
    if partner and not has_pro_access(partner):
        raise HTTPException(status_code=403, detail="对方也需要 Pro 会员才能一起与 AI 对话")
    partner_name = partner.username if partner else "Partner"

    room = CircleRoom(
        creator_id=current_user.id,
        title=f"三人对话 · {current_user.username} & {partner_name}",
        max_members=3,
        room_type="language_circle",
        allowed_languages=["zh", "en"],
        summary={"ai_host": True},
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
def list_requests(
    current_user: CurrentUser, db: DBSession, status: str | None = None,
) -> list[MatchRequest]:
    stmt = select(MatchRequest).where(
        (MatchRequest.from_user_id == current_user.id)
        | (MatchRequest.to_user_id == current_user.id)
    )
    if status:
        stmt = stmt.where(MatchRequest.status == status)
    return list(db.scalars(stmt.order_by(MatchRequest.created_at.desc())))


def _are_accepted_friends(db, user_a: str, user_b: str) -> bool:
    if are_friends(db, user_a, user_b):
        return True
    req = db.scalar(
        select(MatchRequest).where(
            MatchRequest.status == "accepted",
            (
                ((MatchRequest.from_user_id == user_a) & (MatchRequest.to_user_id == user_b))
                | ((MatchRequest.from_user_id == user_b) & (MatchRequest.to_user_id == user_a))
            ),
        )
    )
    return req is not None


def _room_member_user_ids(db, room_id: str) -> list[str]:
    return list(db.scalars(select(CircleMember.user_id).where(CircleMember.room_id == room_id)))


def _dm_room_for(db, user_a: str, user_b: str) -> CircleRoom | None:
    """Find an existing 1:1 DM room shared by both users, if any."""
    a_rooms = set(db.scalars(
        select(CircleMember.room_id).where(CircleMember.user_id == user_a)
    ))
    if not a_rooms:
        return None
    rooms = db.scalars(
        select(CircleRoom).where(
            CircleRoom.id.in_(a_rooms), CircleRoom.room_type == "dm"
        )
    )
    for room in rooms:
        member_ids = set(db.scalars(
            select(CircleMember.user_id).where(CircleMember.room_id == room.id)
        ))
        if user_b in member_ids and len(member_ids) <= 2:
            return room
    return None


@router.get("/friends")
def list_friends(current_user: CurrentUser, db: DBSession) -> dict:
    """Active friendships + matched users who haven't greeted yet."""
    from app.models import CircleMessage
    from app.services import presence_service

    rows = list_active_friendships(db, current_user.id)
    items = []
    seen: set[str] = set()
    for row in rows:
        item = friendship_to_friend_item(db, current_user.id, row)
        if not item:
            continue
        uid = item["user_id"]
        if uid in seen:
            continue
        seen.add(uid)
        rec = db.scalar(
            select(MatchRecommendation).where(
                MatchRecommendation.user_id == current_user.id,
                MatchRecommendation.target_user_id == uid,
            )
        )
        if rec:
            item["score"] = round(rec.score)
        item["is_friend"] = True
        item["pending_greet"] = False
        items.append(item)

    accepted = list(db.scalars(
        select(MatchRequest).where(
            ((MatchRequest.from_user_id == current_user.id)
             | (MatchRequest.to_user_id == current_user.id)),
            MatchRequest.status == "accepted",
        ).order_by(MatchRequest.responded_at.desc())
    ))
    for req in accepted:
        other_id = req.to_user_id if req.from_user_id == current_user.id else req.from_user_id
        if other_id in seen:
            continue
        if are_friends(db, current_user.id, other_id):
            continue
        other = db.get(User, other_id)
        if not other:
            continue
        seen.add(other_id)
        last_message, last_time = "", ""
        dm = _dm_room_for(db, current_user.id, other_id)
        if dm:
            last = db.scalar(
                select(CircleMessage)
                .where(CircleMessage.room_id == dm.id)
                .order_by(CircleMessage.created_at.desc())
                .limit(1)
            )
            if last:
                last_message = last.content[:60]
                last_time = last.created_at.strftime("%H:%M")
        settings = db.scalar(
            select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
        )
        match_type = "soulmate" if settings and settings.match_mode == "soulmate" else "language_partner"
        items.append({
            "id": other_id,
            "user_id": other_id,
            "username": other.username,
            "match_type": match_type,
            "last_message": last_message,
            "last_time": last_time,
            "unread": 0,
            "score": 0,
            "is_friend": False,
            "pending_greet": True,
        })
    user_ids = [i.get("user_id") or i.get("id") for i in items if i.get("user_id") or i.get("id")]
    online_map = presence_service.online_status(user_ids)
    for item in items:
        uid = item.get("user_id") or item.get("id")
        item["is_online"] = online_map.get(uid, False)
    return {"items": items}


@router.delete("/friends/{friend_user_id}")
def delete_friend(friend_user_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    """Remove friend relationship (either user may dissolve)."""
    if not friend_user_id or friend_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Invalid friend_user_id")
    if not remove_friendship(db, current_user.id, friend_user_id):
        raise HTTPException(status_code=404, detail="Friendship not found")
    return {"ok": True, "friend_user_id": friend_user_id}


@router.post("/dm")
def open_dm(
    current_user: CurrentUser,
    db: DBSession,
    friend_user_id: str = Body("", embed=True),
) -> dict:
    """Open (or reuse) a 1:1 private chat room with an accepted friend."""
    if not friend_user_id or friend_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Invalid friend_user_id")
    friend = db.get(User, friend_user_id)
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")

    existing = _dm_room_for(db, current_user.id, friend_user_id)
    if existing:
        return {
            "id": existing.id,
            "reused": True,
            "ai_host": bool((existing.summary or {}).get("ai_host")),
        }

    if not _are_accepted_friends(db, current_user.id, friend_user_id):
        raise HTTPException(status_code=403, detail="需要先成为好友才能私聊")

    room = CircleRoom(
        creator_id=current_user.id,
        title=f"私聊 · {friend.username}",
        max_members=2,
        room_type="dm",
        allowed_languages=["zh", "en"],
        summary={"ai_host": False},
    )
    db.add(room)
    db.flush()
    db.add(CircleMember(room_id=room.id, user_id=current_user.id, role="host"))
    db.add(CircleMember(room_id=room.id, user_id=friend_user_id, role="member"))
    db.commit()
    return {"id": room.id, "reused": False, "ai_host": False}


@router.post("/rooms/{room_id}/enable-ai")
async def enable_room_ai(
    room_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    """Invite AI host into a friend DM — both members must be Pro."""
    room = db.get(CircleRoom, room_id)
    if not room or room.status != "active":
        raise HTTPException(status_code=404, detail="Room not found")

    member = db.scalar(
        select(CircleMember).where(
            CircleMember.room_id == room_id,
            CircleMember.user_id == current_user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a room member")

    member_ids = _room_member_user_ids(db, room_id)
    if len(member_ids) < 2:
        raise HTTPException(status_code=400, detail="需要至少两位好友才能邀请 AI")

    for uid in member_ids:
        user = db.get(User, uid)
        if not has_pro_access(user):
            raise HTTPException(
                status_code=403,
                detail="双方都需要 Pro 会员才能邀请 AI 主持",
            )

    if (room.summary or {}).get("ai_host"):
        return {"room_id": room_id, "ai_host": True, "already_enabled": True}

    room.summary = {**(room.summary or {}), "ai_host": True}
    intro = CircleMessage(
        room_id=room.id,
        user_id=None,
        role="assistant",
        content="AI 主持人已加入！你们可以继续聊天，我会适时提问并给出语言练习反馈。",
        content_language="zh",
        translated_content="",
        analysis={"type": "host"},
    )
    db.add(intro)
    db.commit()
    db.refresh(intro)

    await circle_hub.broadcast(
        room_id,
        {
            "type": "message",
            "message": CircleMessageRead.model_validate(intro).model_dump(mode="json"),
        },
    )
    await circle_hub.broadcast(room_id, {"type": "room_updated", "ai_host": True})
    return {"room_id": room_id, "ai_host": True}


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


@router.post("/presence/heartbeat")
def presence_heartbeat(current_user: CurrentUser) -> dict:
    from app.services import presence_service

    presence_service.touch(current_user.id)
    return {"ok": True, "online_window_seconds": presence_service.ONLINE_TTL_SECONDS}


@router.websocket("/notifications/ws")
async def notifications_ws(websocket: WebSocket) -> None:
    from app.core.security import decode_access_token
    from app.services.user_notify_hub import user_notify_hub

    await websocket.accept()
    token = websocket.query_params.get("token", "")
    user_id: str | None = None
    if token:
        try:
            user_id = decode_access_token(token).get("sub")
        except Exception:
            await websocket.close(code=4001, reason="Invalid token")
            return
    if not user_id:
        await websocket.close(code=4001, reason="Authentication required")
        return

    await user_notify_hub.connect(user_id, websocket)
    try:
        await websocket.send_json({"type": "connected"})
        while True:
            raw = await websocket.receive_text()
            if raw.strip().lower() == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await user_notify_hub.disconnect(user_id, websocket)
