from fastapi import APIRouter, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.security import decode_access_token
from app.models import (
    CircleMember,
    CircleMessage,
    CircleRoom,
    ModerationEvent,
    Thought,
    Topic,
    utc_now,
)
from app.schemas import (
    CircleMessageCreate,
    CircleMessageRead,
    CirclePublishTopicRequest,
    CircleRoomCreate,
    CircleRoomRead,
    JoinTopicDiscussionRequest,
    ROOM_TYPE_OPTIONS,
)
from app.services.circle_discussion import freeze_circle_room, publish_circle_topic
from app.services.circle_message_worker import analyze_circle_message_background
from app.services.circle_moderator import generate_room_summary
from app.services.circle_hub import circle_hub
from app.services.llm import LLMUnavailableError
from app.services.moderation import moderate_text

router = APIRouter(prefix="/circles", tags=["circles"])

_CIRCLE_HUD_PRIVATE_KEYS = frozenset({
    "grammar_tips",
    "corrected_sentence",
    "mistakes",
    "user_input_translated",
    "user_input_versions",
    "patterns_v2",
    "why_this_expression",
    "agents",
    "vocabulary",
    "variants",
    "expression_versions",
    "main_expression",
    "meaning_native",
    "main_reply_native",
    "main_reply_target",
    "suggested_expression",
})


@router.post("", response_model=CircleRoomRead, status_code=201)
def create_room(
    payload: CircleRoomCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> CircleRoomRead:
    if payload.room_type not in ROOM_TYPE_OPTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid room_type. Must be one of: {sorted(ROOM_TYPE_OPTIONS)}")
    if len(payload.allowed_languages) > 3:
        raise HTTPException(status_code=400, detail="allowed_languages max length is 3")

    room = CircleRoom(
        topic_id=payload.topic_id,
        creator_id=current_user.id,
        title=payload.title,
        max_members=payload.max_members,
        room_type=payload.room_type,
        allowed_languages=payload.allowed_languages,
    )
    db.add(room)
    db.flush()
    db.add(CircleMember(room_id=room.id, user_id=current_user.id, role="host"))
    db.commit()
    return _load_room(room.id, db)


@router.get("", response_model=list[CircleRoomRead])
def list_rooms(db: DBSession, status: str | None = None) -> list[CircleRoomRead]:
    stmt = select(CircleRoom).order_by(CircleRoom.created_at.desc()).limit(50)
    if status:
        stmt = stmt.where(CircleRoom.status == status)
    rooms = list(db.scalars(stmt))
    return [_load_room(r.id, db) for r in rooms]


@router.post("/join-topic", response_model=CircleRoomRead)
def join_topic_discussion(
    payload: JoinTopicDiscussionRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> CircleRoomRead:
    """Find-or-create the public discussion room for a topic, then join the caller."""
    topic = db.get(Topic, payload.topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if topic.status not in {"active", "published", "open"}:
        raise HTTPException(status_code=400, detail="Topic is not open for discussion")

    room = db.scalar(
        select(CircleRoom)
        .where(CircleRoom.topic_id == payload.topic_id, CircleRoom.status == "active")
        .order_by(CircleRoom.created_at.asc())
        .limit(1)
    )
    if not room:
        room_type = "debate_pk" if (topic.pro_view and topic.con_view) else "roundtable"
        room = CircleRoom(
            topic_id=topic.id,
            creator_id=current_user.id,
            title=topic.title,
            room_type=room_type,
            max_members=50,
        )
        db.add(room)
        db.flush()
        db.add(CircleMember(room_id=room.id, user_id=current_user.id, role="host"))
    else:
        existing = db.scalar(
            select(CircleMember).where(
                CircleMember.room_id == room.id,
                CircleMember.user_id == current_user.id,
            )
        )
        if not existing:
            count = len(
                list(db.scalars(select(CircleMember).where(CircleMember.room_id == room.id)))
            )
            if count >= room.max_members:
                raise HTTPException(status_code=400, detail="Room is full")
            db.add(CircleMember(room_id=room.id, user_id=current_user.id, role="member"))

    db.commit()
    return _load_room(room.id, db)


@router.get("/bookmarks")
def get_bookmarks(current_user: CurrentUser, db: DBSession) -> list[dict]:
    thoughts = list(
        db.scalars(
            select(Thought)
            .where(Thought.user_id == current_user.id)
            .order_by(Thought.created_at.desc())
            .limit(50)
        )
    )
    return [
        {
            "id": t.id,
            "title": t.title,
            "summary": t.summary,
            "final_content_native": t.final_content_native,
            "final_content_target": t.final_content_target,
            "freeze_payload": t.freeze_payload,
            "created_at": t.created_at.isoformat(),
        }
        for t in thoughts
        if (t.freeze_payload or {}).get("source") == "circle_bookmark"
    ]


@router.websocket("/ws/{room_id}")
async def circle_room_ws(websocket: WebSocket, room_id: str) -> None:
    """Realtime fan-out for circle / DM rooms."""
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

    from app.db.session import SessionLocal

    with SessionLocal() as db:
        room = db.get(CircleRoom, room_id)
        if not room:
            await websocket.close(code=4004, reason="Room not found")
            return
        member = db.scalar(
            select(CircleMember).where(
                CircleMember.room_id == room_id,
                CircleMember.user_id == user_id,
            )
        )
        if not member:
            await websocket.close(code=4003, reason="Not a room member")
            return

    await circle_hub.connect(room_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            if raw.strip().lower() == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await circle_hub.disconnect(room_id, websocket)


@router.get("/{room_id}", response_model=CircleRoomRead)
def get_room(room_id: str, current_user: CurrentUser, db: DBSession) -> CircleRoomRead:
    room = _load_room(room_id, db)
    # Privacy: learning HUD is private to the message author.
    for m in room.messages:
        if m.role != "assistant" and m.user_id and m.user_id != current_user.id:
            cleaned = {k: v for k, v in (m.analysis or {}).items() if k not in _CIRCLE_HUD_PRIVATE_KEYS}
            m.analysis = cleaned
    return room


@router.post("/{room_id}/join", response_model=CircleRoomRead)
def join_room(room_id: str, current_user: CurrentUser, db: DBSession) -> CircleRoomRead:
    room = db.get(CircleRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status != "active":
        raise HTTPException(status_code=400, detail="Room is not active")

    existing = db.scalar(
        select(CircleMember).where(
            CircleMember.room_id == room_id,
            CircleMember.user_id == current_user.id,
        )
    )
    if not existing:
        member_count = db.scalar(
            select(CircleMember).where(CircleMember.room_id == room_id)
        )
        count = len(list(db.scalars(select(CircleMember).where(CircleMember.room_id == room_id))))
        if count >= room.max_members:
            raise HTTPException(status_code=400, detail="Room is full")
        db.add(CircleMember(room_id=room_id, user_id=current_user.id, role="member"))
        db.commit()
    return _load_room(room_id, db)


@router.post("/{room_id}/messages", response_model=CircleMessageRead)
async def send_message(
    room_id: str,
    payload: CircleMessageCreate,
    current_user: CurrentUser,
    db: DBSession,
    background_tasks: BackgroundTasks,
) -> CircleMessage:
    room = db.get(CircleRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    member = db.scalar(
        select(CircleMember).where(
            CircleMember.room_id == room_id,
            CircleMember.user_id == current_user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a room member")

    mod = moderate_text(payload.content, "circle_message")
    if mod["flagged"]:
        db.add(
            ModerationEvent(
                user_id=current_user.id,
                content_type="circle_message",
                content_id=room_id,
                action=mod["action"],
                reason=mod["reason"],
                details=mod["details"],
            )
        )

    message = CircleMessage(
        room_id=room_id,
        user_id=current_user.id,
        role="user",
        content=payload.content,
        content_language=payload.content_language,
        translated_content="",
        analysis={"analysis_status": "pending"},
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    from app.services.friendship_service import maybe_friendship_from_dm_message

    maybe_friendship_from_dm_message(db, room_id, current_user.id)

    background_tasks.add_task(analyze_circle_message_background, message.id, room_id)

    await circle_hub.broadcast(
        room_id,
        {
            "type": "message",
            "message": CircleMessageRead.model_validate(message).model_dump(mode="json"),
        },
    )
    return message


@router.get("/{room_id}/summary")
def get_room_summary(room_id: str, db: DBSession) -> dict:
    room = db.get(CircleRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    messages = list(
        db.scalars(
            select(CircleMessage)
            .where(CircleMessage.room_id == room_id)
            .order_by(CircleMessage.created_at.asc())
        )
    )
    return {
        "room_id": room_id,
        "title": room.title,
        "status": room.status,
        "summary": room.summary or {},
        "message_count": len(messages),
        "user_message_count": sum(1 for m in messages if m.role == "user"),
        "grammar_tips": [
            tip
            for m in messages
            if m.role == "user"
            for tip in (m.analysis or {}).get("grammar_tips", [])
        ][:8],
        "key_expressions": [
            m.content
            for m in messages
            if m.role == "user" and len(m.content) > 20
        ][-4:],
    }


@router.post("/{room_id}/end")
async def end_discussion(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    room = db.get(CircleRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    member = db.scalar(
        select(CircleMember).where(
            CircleMember.room_id == room_id,
            CircleMember.user_id == current_user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a room member")

    try:
        messages = list(
            db.scalars(
                select(CircleMessage)
                .where(CircleMessage.room_id == room_id)
                .order_by(CircleMessage.created_at.asc())
            )
        )
        msg_dicts = [{"role": m.role, "content": m.content} for m in messages]
        summary = await generate_room_summary(msg_dicts, room.title, room_type=room.room_type, db=db)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    room.status = "ended"
    room.ended_at = utc_now()
    room.summary = summary
    db.commit()
    return {
        "room_id": room_id,
        "status": room.status,
        "summary": summary,
        "topic_id": room.topic_id,
    }


@router.post("/{room_id}/freeze")
async def freeze_discussion(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    room = db.get(CircleRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    member = db.scalar(
        select(CircleMember).where(
            CircleMember.room_id == room_id,
            CircleMember.user_id == current_user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a room member")

    try:
        thought = await freeze_circle_room(db, room, current_user.id)
        db.commit()
        db.refresh(thought)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    return {
        "thought_id": thought.id,
        "title": thought.title,
        "status": thought.status,
        "message": "讨论已冻结到思想库",
    }


@router.post("/{room_id}/publish-topic")
async def publish_discussion_topic(
    room_id: str,
    payload: CirclePublishTopicRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    room = db.get(CircleRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    member = db.scalar(
        select(CircleMember).where(
            CircleMember.room_id == room_id,
            CircleMember.user_id == current_user.id,
        )
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a room member")

    try:
        topic = await publish_circle_topic(
            db,
            room,
            current_user.id,
            title=payload.title,
            background=payload.background,
            thought_id=payload.thought_id,
        )
        db.commit()
        db.refresh(topic)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    return {
        "topic_id": topic.id,
        "title": topic.title,
        "status": topic.status,
        "room_id": room_id,
        "message": "讨论已发布到话题广场",
    }


@router.post("/{room_id}/messages/{message_id}/bookmark")
async def bookmark_message(
    room_id: str,
    message_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    message = db.scalar(
        select(CircleMessage).where(
            CircleMessage.id == message_id,
            CircleMessage.room_id == room_id,
        )
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    thought = Thought(
        user_id=current_user.id,
        title=f"收藏观点 - {message.content[:40]}",
        summary=message.content,
        final_content_native=message.content,
        final_content_target=message.translated_content,
        freeze_payload={
            "source": "circle_bookmark",
            "room_id": room_id,
            "message_id": message_id,
            "analysis": message.analysis,
        },
        status="draft",
    )
    db.add(thought)
    db.commit()
    db.refresh(thought)
    return {"thought_id": thought.id, "message": "观点已收藏到思想库"}


@router.get("/{room_id}/debate-score")
def get_debate_score(room_id: str, db: DBSession) -> dict:
    room = db.get(CircleRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    messages = list(
        db.scalars(
            select(CircleMessage)
            .where(CircleMessage.room_id == room_id, CircleMessage.role == "user")
            .order_by(CircleMessage.created_at.asc())
        )
    )
    pro_scores: list[float] = []
    con_scores: list[float] = []
    for i, m in enumerate(messages):
        analysis = m.analysis or {}
        coherence = float(analysis.get("coherence_score", 60))
        if i % 2 == 0:
            pro_scores.append(coherence)
        else:
            con_scores.append(coherence)

    pro_avg = round(sum(pro_scores) / len(pro_scores), 1) if pro_scores else 0.0
    con_avg = round(sum(con_scores) / len(con_scores), 1) if con_scores else 0.0
    return {
        "room_id": room_id,
        "room_type": room.room_type,
        "pro_score": pro_avg,
        "con_score": con_avg,
        "pro_count": len(pro_scores),
        "con_count": len(con_scores),
        "total_messages": len(messages),
    }


def _load_room(room_id: str, db: DBSession) -> CircleRoomRead:
    room = db.get(CircleRoom, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    members = list(db.scalars(select(CircleMember).where(CircleMember.room_id == room_id)))
    messages = list(
        db.scalars(
            select(CircleMessage)
            .where(CircleMessage.room_id == room_id)
            .order_by(CircleMessage.created_at.asc())
        )
    )
    from app.schemas import CircleMemberRead, CircleMessageRead

    data = CircleRoomRead.model_validate(room)
    data.members = [CircleMemberRead.model_validate(m) for m in members]
    data.messages = [CircleMessageRead.model_validate(m) for m in messages]
    return data
