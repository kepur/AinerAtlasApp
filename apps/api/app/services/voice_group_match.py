"""Voice group match queue — 3–5 players, 10s timeout."""

from __future__ import annotations

import time
import uuid
from typing import Any

from loguru import logger

MIN_PLAYERS = 3
MAX_PLAYERS = 5
MATCH_TIMEOUT_SECONDS = 10

_QUEUE: list[dict[str, Any]] = []
_ROOMS: dict[str, dict[str, Any]] = {}


def _now() -> float:
    return time.time()


def _purge_expired() -> None:
    global _QUEUE
    cutoff = _now() - MATCH_TIMEOUT_SECONDS
    _QUEUE = [entry for entry in _QUEUE if entry.get("joined_at", 0) >= cutoff]


def join_queue(user_id: str) -> dict[str, Any]:
    _purge_expired()

    for entry in _QUEUE:
        if entry["user_id"] == user_id:
            return _status_for_entry(entry)

    room_id = None
    for room in _ROOMS.values():
        if room.get("status") == "matching" and len(room["members"]) < MAX_PLAYERS:
            if user_id not in room["members"]:
                room["members"].append(user_id)
                room_id = room["id"]
                break

    if not room_id:
        room_id = str(uuid.uuid4())
        _ROOMS[room_id] = {
            "id": room_id,
            "status": "matching",
            "members": [user_id],
            "created_at": _now(),
        }

    entry = {
        "user_id": user_id,
        "room_id": room_id,
        "joined_at": _now(),
    }
    _QUEUE.append(entry)
    room = _ROOMS[room_id]
    if len(room["members"]) >= MIN_PLAYERS:
        room["status"] = "ready"
        room["ready_at"] = _now()
    return _status_for_room(room, user_id)


def poll_match(user_id: str) -> dict[str, Any]:
    _purge_expired()
    entry = next((row for row in _QUEUE if row["user_id"] == user_id), None)
    if not entry:
        return {"status": "idle"}

    room = _ROOMS.get(entry["room_id"])
    if not room:
        return {"status": "idle"}

    elapsed = _now() - entry["joined_at"]
    if room["status"] != "ready" and elapsed >= MATCH_TIMEOUT_SECONDS:
        _remove_user(user_id)
        return {
            "status": "timeout",
            "message": "10 秒内未凑齐 3 人，请稍后再试",
            "member_count": len(room.get("members", [])),
        }

    return _status_for_room(room, user_id)


def leave_queue(user_id: str) -> dict[str, Any]:
    _remove_user(user_id)
    return {"status": "idle"}


def _remove_user(user_id: str) -> None:
    global _QUEUE
    _QUEUE = [row for row in _QUEUE if row["user_id"] != user_id]
    for room_id, room in list(_ROOMS.items()):
        members = [m for m in room.get("members", []) if m != user_id]
        if not members:
            _ROOMS.pop(room_id, None)
            continue
        room["members"] = members
        if len(members) < MIN_PLAYERS:
            room["status"] = "matching"


def _status_for_entry(entry: dict[str, Any]) -> dict[str, Any]:
    room = _ROOMS.get(entry["room_id"])
    if not room:
        return {"status": "idle"}
    return _status_for_room(room, entry["user_id"])


def _status_for_room(room: dict[str, Any], user_id: str) -> dict[str, Any]:
    members = room.get("members", [])
    elapsed = max(0, MATCH_TIMEOUT_SECONDS - int(_now() - room.get("created_at", _now())))
    payload: dict[str, Any] = {
        "status": room.get("status", "matching"),
        "room_id": room["id"],
        "member_count": len(members),
        "min_players": MIN_PLAYERS,
        "max_players": MAX_PLAYERS,
        "seconds_left": elapsed,
    }
    if room.get("status") == "ready":
        payload["message"] = f"已匹配 {len(members)} 人，可以开始小组语音"
    else:
        payload["message"] = f"匹配中 {len(members)}/{MIN_PLAYERS} 人…"
    if user_id not in members:
        logger.warning("User %s not in room %s member list", user_id, room["id"])
    return payload
