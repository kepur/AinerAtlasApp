from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.security import decode_access_token
from app.models import (
    CircleMember,
    CircleMessage,
    CircleRoom,
    ModerationEvent,
    Thought,
    utc_now,
)
from app.schemas import (
    CircleMessageCreate,
    CircleMessageRead,
    CircleRoomCreate,
    CircleRoomRead,
    ROOM_TYPE_OPTIONS,
)
from app.services.circle_moderator import generate_room_summary, moderate_message
from app.services.circle_hub import circle_hub
from app.services.moderation import moderate_text

router = APIRouter(prefix="/circles", tags=["circles"])


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
    # Privacy: corrections are private to the author. Strip grammar/correction
    # fields from messages authored by *other* members; everyone still sees the
    # content + natural translation. AI/host messages stay public.
    _PRIVATE_KEYS = ("grammar_tips", "corrected_sentence", "mistakes", "user_input_translated")
    for m in room.messages:
        if m.role != "assistant" and m.user_id and m.user_id != current_user.id:
            cleaned = {k: v for k, v in (m.analysis or {}).items() if k not in _PRIVATE_KEYS}
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

    analysis = await moderate_message(
        payload.content,
        payload.content_language,
        room.title,
        room_type=room.room_type,
        db=db,
    )

    message = CircleMessage(
        room_id=room_id,
        user_id=current_user.id,
        role="user",
        content=payload.content,
        content_language=payload.content_language,
        translated_content=analysis.get("translated_content", ""),
        analysis=analysis,
    )
    db.add(message)

    host_msg: CircleMessage | None = None
    if room.room_type != "dm" and analysis.get("counter_question"):
        host_msg = CircleMessage(
            room_id=room_id,
            user_id=None,
            role="assistant",
            content=analysis["counter_question"],
            content_language="zh",
            translated_content=analysis.get("host_note", ""),
            analysis={"type": "host", "on_topic": analysis.get("on_topic", True)},
        )
        db.add(host_msg)

    db.commit()
    db.refresh(message)
    if host_msg:
        db.refresh(host_msg)

    from app.schemas import CircleMessageRead

    for msg in (message, host_msg) if host_msg else (message,):
        await circle_hub.broadcast(
            room_id,
            {
                "type": "message",
                "message": CircleMessageRead.model_validate(msg).model_dump(mode="json"),
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

    messages = list(
        db.scalars(
            select(CircleMessage)
            .where(CircleMessage.room_id == room_id)
            .order_by(CircleMessage.created_at.asc())
        )
    )
    msg_dicts = [{"role": m.role, "content": m.content} for m in messages]
    summary = await generate_room_summary(msg_dicts, room.title, room_type=room.room_type, db=db)

    room.status = "ended"
    room.ended_at = utc_now()
    room.summary = summary
    db.commit()
    return {"room_id": room_id, "summary": summary}


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
