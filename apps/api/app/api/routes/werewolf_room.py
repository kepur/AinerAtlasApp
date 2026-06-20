from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, DBSession
from app.core.security import decode_access_token
from app.services import werewolf_room_service as svc
from app.services.party_room_hub import party_room_hub
from app.services.ws_send import safe_send_json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games/werewolf-rooms", tags=["werewolf-rooms"])


class CreateRoomRequest(BaseModel):
    title: str = "狼人杀 · 真实房间"


class JoinRoomRequest(BaseModel):
    invite_code: str


class TargetRequest(BaseModel):
    target_player_id: str


class VoteRequest(BaseModel):
    target_player_id: str
    reason: str = ""


class SpeechRequest(BaseModel):
    text: str


class VoiceIntentRequest(BaseModel):
    transcript: str
    intent: str = Field(description="wolf_kill | vote")


class InviteFriendRequest(BaseModel):
    friend_user_id: str


class AcceptInviteRequest(BaseModel):
    room_id: str


async def _notify(room_id: str) -> None:
    await party_room_hub.broadcast(room_id, {"type": "room_sync"})


async def _notify_user_invite(user_id: str, invite: dict) -> None:
    from app.services.user_notify_hub import user_notify_hub

    await user_notify_hub.notify(user_id, {"type": "werewolf_invite", "data": invite})


@router.websocket("/ws/{room_id}")
async def werewolf_room_ws(websocket: WebSocket, room_id: str) -> None:
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
        try:
            view = svc.get_room(db, room_id, user_id)
        except ValueError:
            await websocket.close(code=4004, reason="Room not found or not a member")
            return

    await party_room_hub.connect(room_id, websocket)
    try:
        await safe_send_json(websocket, {"type": "room", "data": view})
        while True:
            raw = await websocket.receive_text()
            if raw.strip().lower() == "ping":
                await safe_send_json(websocket, {"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await party_room_hub.disconnect(room_id, websocket)


@router.post("")
async def create_room(payload: CreateRoomRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.create_room(db, current_user.id, title=payload.title)
        await _notify(view["room_id"])
        return view
    except Exception as exc:
        logger.exception("create werewolf room failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/join")
async def join_room(payload: JoinRoomRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.join_room(db, payload.invite_code.strip(), current_user.id)
        await _notify(view["room_id"])
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{room_id}")
def get_room(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return svc.get_room(db, room_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{room_id}/start")
async def start_game(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.start_game(db, room_id, current_user.id)
        await _notify(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/confirm-role")
async def confirm_role(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.confirm_role(db, room_id, current_user.id)
        await _notify(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/wolf-kill")
async def wolf_kill(room_id: str, payload: TargetRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.submit_wolf_kill(db, room_id, current_user.id, payload.target_player_id)
        await _notify(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/speech")
async def speech(room_id: str, payload: SpeechRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.submit_speech(db, room_id, current_user.id, payload.text)
        await _notify(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/end-speech")
async def end_speech(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.end_speech(db, room_id, current_user.id)
        await _notify(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/vote")
async def vote(room_id: str, payload: VoteRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.submit_vote(
            db, room_id, current_user.id, payload.target_player_id, payload.reason,
        )
        await _notify(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/invites/pending")
def pending_invites(current_user: CurrentUser, db: DBSession) -> dict:
    return {"items": svc.list_pending_invites(db, current_user.id)}


@router.post("/invites/accept")
async def accept_invite(payload: AcceptInviteRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.accept_invite(db, payload.room_id, current_user.id)
        await _notify(view["room_id"])
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{room_id}/invite-candidates")
def invite_candidates(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        items = svc.list_invite_candidates(db, room_id, current_user.id)
        return {"items": items}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/invite-friend")
async def invite_friend(
    room_id: str,
    payload: InviteFriendRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    try:
        view = svc.invite_friend(db, room_id, current_user.id, payload.friend_user_id)
        await _notify(room_id)
        invite = next(
            (i for i in svc.list_pending_invites(db, payload.friend_user_id) if i["room_id"] == room_id),
            None,
        )
        if invite:
            await _notify_user_invite(payload.friend_user_id, invite)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/voice-intent")
async def voice_intent(
    room_id: str, payload: VoiceIntentRequest, current_user: CurrentUser, db: DBSession,
) -> dict:
    try:
        view = await svc.parse_voice_intent(
            db, room_id, current_user.id, payload.transcript, payload.intent,
        )
        await _notify(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
