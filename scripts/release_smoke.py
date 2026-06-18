#!/usr/bin/env python3
"""Release smoke: Admin data tabs + dual-user DM WebSocket."""
from __future__ import annotations

import argparse
import json
import sys
import threading
import time
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

try:
    import websocket  # websocket-client
except ImportError:
    print("FAIL: pip install websocket-client")
    sys.exit(1)

DEFAULT_API = "http://localhost:7070"


def http(api_base: str, method: str, path: str, token: str | None = None, body: dict | None = None) -> tuple[int, dict | list | str]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    req = Request(f"{api_base.rstrip('/')}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def create_user_via_admin(api_base: str, admin_token: str, prefix: str) -> tuple[str, str, str]:
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"
    status, data = http(api_base, "POST", "/api/admin/users", admin_token, {
        "email": email,
        "password": "ChangeMe123!",
        "username": prefix,
        "role": "user",
        "membership_level": "free",
    })
    assert status == 200, f"admin create {prefix}: {status} {data}"
    user_id = data["id"]
    status, login = http(api_base, "POST", "/api/auth/login", body={
        "email": email,
        "password": "ChangeMe123!",
    })
    assert status == 200, f"login {prefix}: {status} {login}"
    return login["access_token"], user_id, email


def register(api_base: str, prefix: str, admin_tok: str | None = None) -> tuple[str, str, str]:
    """Register via public API (pytest DB) or admin create (docker with verification on)."""
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"
    status, data = http(api_base, "POST", "/api/auth/register", body={
        "email": email,
        "password": "ChangeMe123!",
        "username": prefix,
    })
    if status == 201:
        return data["access_token"], data["user"]["id"], email
    if admin_tok:
        return create_user_via_admin(api_base, admin_tok, prefix)
    raise AssertionError(f"register {prefix}: {status} {data}")


def admin_token(api_base: str) -> str:
    status, data = http(api_base, "POST", "/api/auth/login", body={
        "email": "admin@ainerspeak.com",
        "password": "ChangeMe123!",
    })
    assert status == 200, data
    return data["access_token"]


def run_admin_regression(api_base: str, token: str) -> tuple[list[str], list[str]]:
    ok: list[str] = []
    fail: list[str] = []

    status, stats = http(api_base, "GET", "/api/admin/data/stats", token)
    if status == 200 and isinstance(stats, dict) and "conversations" in stats:
        ok.append("stats")
    else:
        fail.append(f"stats → {status}")

    tabs = [
        ("conversations", "/api/admin/data/conversations?limit=5"),
        ("thoughts", "/api/admin/data/thoughts?limit=5"),
        ("game-sessions", "/api/admin/data/game-sessions?limit=5"),
        ("expression-assets", "/api/admin/data/expression-assets?limit=5"),
        ("game-templates", "/api/admin/data/game-templates?limit=5"),
        ("reports", "/api/admin/data/reports?limit=5"),
    ]
    for name, path in tabs:
        status, body = http(api_base, "GET", path, token)
        if status == 200 and isinstance(body, dict) and "items" in body:
            ok.append(f"list:{name}")
        else:
            fail.append(f"list:{name} → {status}")

    # Create + delete ephemeral conversation via admin (FK cascade path)
    u_token, u_id, _ = register(api_base, "adm-purge", token)
    status, conv = http(api_base, "POST", "/api/conversations", u_token, {
        "title": "smoke-delete",
        "topic": "test",
        "native_language": "zh",
        "target_language": "en",
    })
    if status == 200 and isinstance(conv, dict):
        cid = conv["id"]
        d_status, _ = http(api_base, "DELETE", f"/api/admin/data/conversations/{cid}", token)
        if d_status == 200:
            ok.append("delete:conversation")
        else:
            fail.append(f"delete:conversation → {d_status}")
        p_status, _ = http(api_base, "DELETE", f"/api/admin/data/conversations/user/{u_id}", token)
        if p_status == 200:
            ok.append("purge:conversations-by-user")
        else:
            fail.append(f"purge:conversations-by-user → {p_status}")
    else:
        fail.append(f"create:conversation → {status}")

    return ok, fail


def run_dm_websocket(api_base: str, admin_tok: str) -> tuple[list[str], list[str]]:
    ws_base = api_base.replace("http://", "ws://").replace("https://", "wss://")
    ok: list[str] = []
    fail: list[str] = []

    token_a, id_a, _ = register(api_base, "dm-a", admin_tok)
    token_b, id_b, _ = register(api_base, "dm-b", admin_tok)

    status, req = http(api_base, "POST", "/api/connect/requests", token_a, {
        "to_user_id": id_b,
        "message": "smoke friend",
    })
    if status not in (200, 201):
        fail.append(f"connect:request → {status}")
        return ok, fail
    req_id = req["id"]

    status, _ = http(api_base, "POST", f"/api/connect/requests/{req_id}/accept", token_b)
    if status != 200:
        fail.append(f"connect:accept → {status}")
        return ok, fail
    ok.append("connect:friend")

    status, room = http(api_base, "POST", "/api/connect/dm", token_a, {"friend_user_id": id_b})
    if status != 200:
        fail.append(f"connect:dm → {status} {room}")
        return ok, fail
    room_id = room["id"]
    ok.append("connect:dm-room")

    received: list[dict] = []
    ready = threading.Event()

    def listener(token: str, label: str) -> None:
        url = f"{ws_base}/api/circles/ws/{room_id}?token={token}"
        ws = websocket.create_connection(url, timeout=10)
        ready.set()
        ws.settimeout(30)
        try:
            while len(received) < 1:
                frame = ws.recv()
                data = json.loads(frame)
                if data.get("type") == "message":
                    received.append(data)
        finally:
            ws.close()

    t = threading.Thread(target=listener, args=(token_b, "B"), daemon=True)
    t.start()
    if not ready.wait(timeout=10):
        fail.append("ws:connect-timeout")
        return ok, fail
    ok.append("ws:B-connected")

    status, msg = http(api_base, "POST", f"/api/circles/{room_id}/messages", token_a, {
        "content": "Hello from A — release smoke",
        "content_language": "en",
    })
    if status != 200:
        fail.append(f"dm:send → {status} {msg}")
        return ok, fail
    ok.append("dm:send")

    deadline = time.time() + 30
    while time.time() < deadline and not received:
        time.sleep(0.2)
    t.join(timeout=2)

    if not received:
        fail.append("ws:no-broadcast-received")
        return ok, fail

    payload = received[0].get("message", {})
    if payload.get("content", "").startswith("Hello from A"):
        ok.append("ws:B-received-message")
    else:
        fail.append(f"ws:unexpected-payload {payload}")

    return ok, fail


def main() -> int:
    parser = argparse.ArgumentParser(description="Release smoke checks against a running API.")
    parser.add_argument("--api", default=DEFAULT_API, help="API base URL (default: %(default)s)")
    parser.add_argument(
        "--skip-dm",
        action="store_true",
        help="Skip dual-user DM WebSocket test (CI without LLM keys)",
    )
    args = parser.parse_args()
    api_base = args.api.rstrip("/")

    print(f"=== Admin regression ({api_base}) ===")
    try:
        tok = admin_token(api_base)
    except Exception as e:
        print(f"FAIL admin login: {e}")
        return 1

    ok, fail = run_admin_regression(api_base, tok)
    print(f"  OK ({len(ok)}): {', '.join(ok)}")
    if fail:
        print(f"  FAIL ({len(fail)}): {', '.join(fail)}")

    dm_ok: list[str] = []
    dm_fail: list[str] = []
    if not args.skip_dm:
        print("\n=== Dual-user DM WebSocket ===")
        dm_ok, dm_fail = run_dm_websocket(api_base, tok)
        print(f"  OK ({len(dm_ok)}): {', '.join(dm_ok)}")
        if dm_fail:
            print(f"  FAIL ({len(dm_fail)}): {', '.join(dm_fail)}")
    else:
        print("\n=== Dual-user DM WebSocket === SKIPPED (--skip-dm)")

    all_fail = fail + dm_fail
    if all_fail:
        print(f"\nRELEASE SMOKE: FAILED ({len(all_fail)} checks)")
        return 1
    print("\nRELEASE SMOKE: PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
