"""Per-user WebSocket notifications (werewolf invites, etc.)."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class UserNotifyHub:
    def __init__(self) -> None:
        self._users: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._users[user_id].add(websocket)

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._users[user_id].discard(websocket)
            if not self._users[user_id]:
                self._users.pop(user_id, None)

    async def notify(self, user_id: str, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._users.get(user_id, ()))
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(user_id, ws)


user_notify_hub = UserNotifyHub()
