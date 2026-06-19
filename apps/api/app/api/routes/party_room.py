from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.api.deps import CurrentUser, DBSession
from app.core.security import decode_access_token
from app.services import party_room_service as svc
from app.services.party_room_hub import party_room_hub

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games/party-rooms", tags=["party-rooms"])


class CreateRoomRequest(BaseModel):
    title: str = "侦探之夜"
    template_id: str | None = None


class JoinRoomRequest(BaseModel):
    invite_code: str


class MessageRequest(BaseModel):
    text: str


async def _notify_room(room_id: str) -> None:
    await party_room_hub.broadcast(room_id, {"type": "room_sync"})


@router.websocket("/ws/{room_id}")
async def party_room_ws(websocket: WebSocket, room_id: str) -> None:
    """Realtime sync for party rooms — clients refetch on room_sync."""
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
        await websocket.send_json({"type": "room", "data": view})
        while True:
            raw = await websocket.receive_text()
            if raw.strip().lower() == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await party_room_hub.disconnect(room_id, websocket)


@router.post("")
async def create_room(payload: CreateRoomRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.create_room(db, current_user.id, title=payload.title, template_id=payload.template_id)
        await _notify_room(view["room_id"])
        return view
    except Exception as exc:
        logger.exception("create party room failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/join")
async def join_room(payload: JoinRoomRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.join_room(db, payload.invite_code.strip(), current_user.id)
        await _notify_room(view["room_id"])
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{room_id}")
def get_room(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return svc.get_room(db, room_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{room_id}/message")
async def send_message(room_id: str, payload: MessageRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.send_message(db, room_id, current_user.id, payload.text)
        await _notify_room(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/end-turn")
async def end_turn(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        view = svc.end_turn(db, room_id, current_user.id)
        await _notify_room(room_id)
        return view
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
