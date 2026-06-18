from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DBSession
from app.services import party_room_service as svc

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games/party-rooms", tags=["party-rooms"])


class CreateRoomRequest(BaseModel):
    title: str = "侦探之夜"
    template_id: str | None = None


class JoinRoomRequest(BaseModel):
    invite_code: str


class MessageRequest(BaseModel):
    text: str


@router.post("")
def create_room(payload: CreateRoomRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return svc.create_room(db, current_user.id, title=payload.title, template_id=payload.template_id)
    except Exception as exc:
        logger.exception("create party room failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/join")
def join_room(payload: JoinRoomRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return svc.join_room(db, payload.invite_code.strip(), current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{room_id}")
def get_room(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return svc.get_room(db, room_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{room_id}/message")
def send_message(room_id: str, payload: MessageRequest, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return svc.send_message(db, room_id, current_user.id, payload.text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{room_id}/end-turn")
def end_turn(room_id: str, current_user: CurrentUser, db: DBSession) -> dict:
    try:
        return svc.end_turn(db, room_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
