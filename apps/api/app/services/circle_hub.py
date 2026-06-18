"""In-memory WebSocket fan-out for circle / DM rooms."""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class CircleHub:
    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, room_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._rooms[room_id].add(websocket)

    async def disconnect(self, room_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._rooms[room_id].discard(websocket)
            if not self._rooms[room_id]:
                self._rooms.pop(room_id, None)

    async def broadcast(self, room_id: str, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._rooms.get(room_id, ()))
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(room_id, ws)


circle_hub = CircleHub()
