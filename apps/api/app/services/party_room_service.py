"""Multiplayer party room service (REST polling MVP)."""
from __future__ import annotations

import random
import string
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models import PartyRoom, User, new_id


def _invite_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _host_name(db: Session, user_id: str) -> str:
    user = db.get(User, user_id)
    if user and user.username:
        return user.username
    if user and user.email:
        return user.email.split("@")[0]
    return "Player"


def _public_view(room: PartyRoom, viewer_id: str) -> dict:
    state = room.state or {}
    raw_players = state.get("players") or []
    players = []
    for p in raw_players:
        item = dict(p)
        base = item.get("display_name") or item.get("name") or "Player"
        item["name"] = f"{base} (你)" if item.get("user_id") == viewer_id else base
        item["is_self"] = item.get("user_id") == viewer_id
        players.append(item)
    return {
        "room_id": room.id,
        "title": room.title,
        "invite_code": room.invite_code,
        "phase": room.phase,
        "status": room.status,
        "max_players": room.max_players,
        "player_count": len(players),
        "is_host": room.host_user_id == viewer_id,
        "current_turn_user_id": state.get("current_turn_user_id"),
        "round": state.get("round", 1),
        "players": players,
        "feed": state.get("feed") or [],
        "template_id": room.template_id,
    }


def _save_state(room: PartyRoom, db: Session) -> None:
    flag_modified(room, "state")
    room.updated_at = datetime.now(UTC)
    db.add(room)
    db.commit()


def create_room(
    db: Session, user_id: str, *, title: str = "侦探之夜", template_id: str | None = None,
) -> dict:
    code = _invite_code()
    while db.scalar(select(PartyRoom.id).where(PartyRoom.invite_code == code)):
        code = _invite_code()

    display = _host_name(db, user_id)
    state = {
        "players": [{
            "user_id": user_id,
            "name": display,
            "display_name": display,
            "role": "侦探",
            "is_host": True,
            "mic_on": True,
            "avatar_url": "",
            "seat": 0,
        }],
        "feed": [{
            "type": "host",
            "speaker": "AI Host",
            "text": f"欢迎来到 {title}！等待更多玩家加入…",
            "text_native": "",
            "round": 1,
        }],
        "current_turn_user_id": user_id,
        "round": 1,
    }
    room = PartyRoom(
        id=new_id(),
        host_user_id=user_id,
        template_id=template_id,
        title=title,
        invite_code=code,
        phase="waiting",
        state=state,
        status="open",
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return _public_view(room, user_id)


def get_room(db: Session, room_id: str, user_id: str) -> dict:
    room = _load_room(db, room_id)
    _ensure_member(room, user_id)
    return _public_view(room, user_id)


def join_room(db: Session, invite_code: str, user_id: str) -> dict:
    room = db.scalar(select(PartyRoom).where(PartyRoom.invite_code == invite_code.upper()))
    if not room or room.status != "open":
        raise ValueError("Room not found")
    state = room.state or {}
    players: list[dict] = list(state.get("players") or [])
    if any(p["user_id"] == user_id for p in players):
        return _public_view(room, user_id)
    if len(players) >= room.max_players:
        raise ValueError("Room is full")

    display = _host_name(db, user_id)
    players.append({
        "user_id": user_id,
        "name": display,
        "display_name": display,
        "role": "侦探",
        "is_host": False,
        "mic_on": False,
        "avatar_url": "",
        "seat": len(players),
    })
    state["players"] = players
    feed = list(state.get("feed") or [])
    feed.append({
        "type": "system",
        "speaker": "AI Host",
        "text": f"{display} 加入了房间",
        "text_native": "",
        "round": state.get("round", 1),
    })
    state["feed"] = feed
    room.state = state
    if len(players) >= 2 and room.phase == "waiting":
        room.phase = "discussion"
        feed.append({
            "type": "host",
            "speaker": "AI Host",
            "text": "玩家已到齐，进入白天讨论阶段。",
            "text_native": "",
            "round": state.get("round", 1),
        })
        state["feed"] = feed
        room.state = state
    _save_state(room, db)
    db.refresh(room)
    return _public_view(room, user_id)


def send_message(db: Session, room_id: str, user_id: str, text: str) -> dict:
    room = _load_room(db, room_id)
    player = _ensure_member(room, user_id)
    if room.status != "open":
        raise ValueError("Room closed")
    content = (text or "").strip()
    if not content:
        raise ValueError("Empty message")

    state = room.state or {}
    feed = list(state.get("feed") or [])
    feed.append({
        "type": "message",
        "speaker": player.get("display_name") or player.get("name") or "Player",
        "user_id": user_id,
        "text": content,
        "text_native": "",
        "round": state.get("round", 1),
    })
    state["feed"] = feed
    room.state = state
    _save_state(room, db)
    return _public_view(room, user_id)


def end_turn(db: Session, room_id: str, user_id: str) -> dict:
    room = _load_room(db, room_id)
    _ensure_member(room, user_id)
    state = room.state or {}
    players = state.get("players") or []
    if not players:
        raise ValueError("No players")

    current = state.get("current_turn_user_id")
    if current != user_id and room.host_user_id != user_id:
        raise ValueError("Not your turn")

    idx = next((i for i, p in enumerate(players) if p["user_id"] == current), 0)
    next_player = players[(idx + 1) % len(players)]
    state["current_turn_user_id"] = next_player["user_id"]
    feed = list(state.get("feed") or [])
    feed.append({
        "type": "system",
        "speaker": "AI Host",
        "text": f"现在轮到 {next_player.get('display_name', next_player.get('name'))} 发言",
        "text_native": "",
        "round": state.get("round", 1),
    })
    state["feed"] = feed
    room.state = state
    _save_state(room, db)
    return _public_view(room, user_id)


def _load_room(db: Session, room_id: str) -> PartyRoom:
    room = db.get(PartyRoom, room_id)
    if not room:
        raise ValueError("Room not found")
    return room


def _ensure_member(room: PartyRoom, user_id: str) -> dict:
    players = (room.state or {}).get("players") or []
    for p in players:
        if p.get("user_id") == user_id:
            return p
    raise ValueError("Not a room member")
