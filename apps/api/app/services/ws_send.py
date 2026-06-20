"""Serialized WebSocket sends.

Starlette/FastAPI WebSockets do not support concurrent ``send`` calls on the
same connection. Several endpoints fan out messages from background coroutines
(room/circle/notify hubs, the realtime ASR pump) while the connection's own
receive loop also replies (``pong``, ``room`` snapshots, etc.). Two coroutines
writing the same socket at once raises and tears down the connection, which the
client observes as a spurious disconnect.

Routing every write for a given socket through a per-connection lock guarantees
serialized frames without forcing callers to share a lock object.
"""

from __future__ import annotations

import asyncio
from typing import Any
from weakref import WeakKeyDictionary

from fastapi import WebSocket

_locks: "WeakKeyDictionary[WebSocket, asyncio.Lock]" = WeakKeyDictionary()


def _lock_for(websocket: WebSocket) -> asyncio.Lock:
    lock = _locks.get(websocket)
    if lock is None:
        lock = asyncio.Lock()
        _locks[websocket] = lock
    return lock


async def safe_send_json(websocket: WebSocket, payload: Any) -> None:
    """Send JSON on ``websocket`` while holding its per-connection lock."""
    async with _lock_for(websocket):
        await websocket.send_json(payload)
