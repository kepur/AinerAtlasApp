#!/usr/bin/env python3
"""E2E smoke: Omni Realtime session + follow-read evaluate + crush LLM exercise."""
from __future__ import annotations

import argparse
import base64
import json
import struct
import sys
import time
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

try:
    import websocket
except ImportError:
    print("FAIL: pip install websocket-client")
    sys.exit(1)

DEFAULT_API = "http://localhost:7070"


def http(
    api_base: str,
    method: str,
    path: str,
    token: str | None = None,
    body: dict | None = None,
    timeout: float = 90,
) -> tuple[int, dict | list | str]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    req = Request(f"{api_base.rstrip('/')}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def login(api_base: str, email: str, password: str) -> str:
    status, data = http(api_base, "POST", "/api/auth/login", body={"email": email, "password": password})
    assert status == 200, f"login failed: {status} {data}"
    return data["access_token"]


def admin_login(api_base: str) -> str:
    return login(api_base, "admin@ainerspeak.com", "ChangeMe123!")


def pcm16_silence(duration_ms: int = 500, sample_rate: int = 16000) -> bytes:
    n = int(sample_rate * duration_ms / 1000)
    return struct.pack(f"<{n}h", *([0] * n))


def run_capabilities(api_base: str, admin_tok: str) -> tuple[list[str], list[str]]:
    ok: list[str] = []
    fail: list[str] = []
    status, caps = http(api_base, "GET", "/api/admin/providers/capabilities", admin_tok)
    if status != 200 or not isinstance(caps, list):
        fail.append(f"capabilities → {status}")
        return ok, fail
    by_key = {c.get("key"): c for c in caps if isinstance(c, dict)}
    for key in ("realtime_voice", "speech_assessment", "llm"):
        cap = by_key.get(key)
        if not cap:
            fail.append(f"cap:{key}:missing")
            continue
        st = cap.get("status")
        provider = cap.get("active_provider", "")
        msg = (cap.get("message") or "")[:80]
        print(f"  [{key}] status={st} provider={provider} — {msg}")
        if st in {"ready", "mock"}:
            ok.append(f"cap:{key}:{st}")
        else:
            fail.append(f"cap:{key}:{st}")
    return ok, fail


def run_realtime(api_base: str, user_tok: str) -> tuple[list[str], list[str]]:
    ok: list[str] = []
    fail: list[str] = []
    ws_base = api_base.replace("http://", "ws://").replace("https://", "wss://")
    url = f"{ws_base}/api/voice/realtime?token={user_tok}&mode=free"

    events: list[dict] = []
    ws = websocket.create_connection(url, timeout=30)
    try:
        ws.settimeout(25)
        session_raw = ws.recv()
        session = json.loads(session_raw)
        events.append(session)
        provider = session.get("provider", "")
        model = session.get("model", "")
        print(f"  session provider={provider} model={model}")
        if provider == "qwen-omni-realtime":
            ok.append("realtime:omni-session")
        elif provider in {"dashscope", "fun-asr"} or "dashscope" in str(provider):
            ok.append("realtime:dashscope-session")
        else:
            fail.append(f"realtime:unexpected-provider:{provider}")

        ws.send(json.dumps({"type": "audio", "action": "start"}))
        deadline = time.time() + 20
        while time.time() < deadline:
            try:
                frame = ws.recv()
                data = json.loads(frame)
                events.append(data)
                et = data.get("type", "")
                if et in {"omni_ready", "asr_started", "error"}:
                    print(f"  event {et}: {str(data)[:120]}")
                if et == "error":
                    fail.append(f"realtime:error:{data.get('message', '')[:60]}")
                    break
                if et == "omni_ready":
                    ok.append("realtime:omni-ready")
                    break
                if et == "asr_started":
                    ok.append("realtime:asr-started")
                    break
            except websocket.WebSocketTimeoutException:
                break

        if any(e.get("type") == "omni_ready" for e in events):
            pcm_b64 = base64.b64encode(pcm16_silence(300)).decode("ascii")
            ws.send(
                json.dumps(
                    {
                        "type": "audio",
                        "format": "pcm16",
                        "sample_rate": 16000,
                        "data": pcm_b64,
                    }
                )
            )
            time.sleep(1.5)
            while True:
                try:
                    ws.settimeout(2)
                    frame = ws.recv()
                    data = json.loads(frame)
                    events.append(data)
                    if data.get("type") in {"transcript", "response", "audio", "thinking"}:
                        print(f"  omni {data.get('type')}: {str(data)[:100]}")
                except websocket.WebSocketTimeoutException:
                    break
            if any(e.get("type") == "audio" for e in events):
                ok.append("realtime:omni-audio-chunk")
            elif any(e.get("type") in {"transcript", "response"} for e in events):
                ok.append("realtime:omni-text-event")
            else:
                fail.append("realtime:no-omni-response-after-audio")
    finally:
        ws.close()

    return ok, fail


def run_follow_read(api_base: str, user_tok: str) -> tuple[list[str], list[str]]:
    ok: list[str] = []
    fail: list[str] = []
    ref = "Hello world"
    pcm_b64 = base64.b64encode(pcm16_silence(800)).decode("ascii")
    status, result = http(
        api_base,
        "POST",
        "/api/voice/evaluate",
        user_tok,
        {
            "reference_text": ref,
            "audio_base64": f"data:audio/pcm;base64,{pcm_b64}",
            "language": "en",
        },
        timeout=120,
    )
    if status != 200:
        fail.append(f"evaluate:http-{status}")
        return ok, fail
    if not isinstance(result, dict):
        fail.append("evaluate:bad-body")
        return ok, fail
    provider = str(result.get("provider") or result.get("analysis", {}).get("provider") or "")
    acc = result.get("accuracy_score")
    if acc is None and isinstance(result.get("analysis"), dict):
        acc = result["analysis"].get("accuracy_score")
    print(f"  evaluate provider={provider} accuracy={acc}")
    if provider:
        ok.append(f"follow-read:provider:{provider.split('+')[0]}")
    else:
        fail.append("follow-read:no-provider")
    if acc is not None:
        ok.append("follow-read:score")
    else:
        fail.append("follow-read:no-score")
    return ok, fail


def run_crush(api_base: str, user_tok: str) -> tuple[list[str], list[str]]:
    ok: list[str] = []
    fail: list[str] = []
    title = f"I would like to {uuid.uuid4().hex[:6]}"
    status, cand = http(
        api_base,
        "POST",
        "/api/grammar/candidate",
        user_tok,
        {
            "pattern": title,
            "example": "I would like to order a coffee.",
            "language_code": "en",
            "item_type": "pattern",
        },
    )
    if status != 200:
        fail.append(f"crush:candidate-{status}")
        return ok, fail
    item_id = cand.get("id") or cand.get("item_id") or ""
    if not item_id:
        fail.append("crush:no-item-id")
        return ok, fail
    ok.append("crush:candidate-created")

    status, practice = http(api_base, "GET", f"/api/grammar/{item_id}/practice", user_tok, timeout=120)
    if status != 200:
        fail.append(f"crush:practice-{status}")
        return ok, fail
    exercise = practice.get("exercise") or {}
    prompt = str(exercise.get("prompt") or "")
    hint = str(exercise.get("hint") or "")
    etype = str(exercise.get("exercise_type") or "")
    print(f"  crush type={etype} prompt={prompt[:80]!r} hint={hint[:40]!r}")
    if prompt and len(prompt) > 8:
        ok.append("crush:llm-prompt")
    else:
        fail.append("crush:empty-prompt")
    if etype in {"translate", "fix_error", "choose_natural"}:
        ok.append("crush:exercise-type")
    else:
        fail.append(f"crush:bad-type:{etype}")
    return ok, fail


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default=DEFAULT_API)
    parser.add_argument("--email", default="demo@ainerspeak.com")
    parser.add_argument("--password", default="Demo123!")
    args = parser.parse_args()
    api = args.api.rstrip("/")

    print(f"=== Voice E2E ({api}) ===\n")
    try:
        admin_tok = admin_login(api)
        user_tok = login(api, args.email, args.password)
    except Exception as exc:
        print(f"FAIL auth: {exc}")
        return 1

    all_ok: list[str] = []
    all_fail: list[str] = []

    print("--- Provider capabilities ---")
    ok, fail = run_capabilities(api, admin_tok)
    all_ok.extend(ok)
    all_fail.extend(fail)
    print(f"  OK: {ok}\n  FAIL: {fail}\n")

    print("--- Realtime voice WebSocket ---")
    try:
        ok, fail = run_realtime(api, user_tok)
    except Exception as exc:
        ok, fail = [], [f"realtime:exception:{exc}"]
    all_ok.extend(ok)
    all_fail.extend(fail)
    print(f"  OK: {ok}\n  FAIL: {fail}\n")

    print("--- Follow-read evaluate ---")
    try:
        ok, fail = run_follow_read(api, user_tok)
    except Exception as exc:
        ok, fail = [], [f"follow-read:exception:{exc}"]
    all_ok.extend(ok)
    all_fail.extend(fail)
    print(f"  OK: {ok}\n  FAIL: {fail}\n")

    print("--- Crush LLM exercise ---")
    try:
        ok, fail = run_crush(api, user_tok)
    except Exception as exc:
        ok, fail = [], [f"crush:exception:{exc}"]
    all_ok.extend(ok)
    all_fail.extend(fail)
    print(f"  OK: {ok}\n  FAIL: {fail}\n")

    print(f"TOTAL OK ({len(all_ok)}): {', '.join(all_ok)}")
    if all_fail:
        print(f"TOTAL FAIL ({len(all_fail)}): {', '.join(all_fail)}")
        print("\nVOICE E2E: FAILED")
        return 1
    print("\nVOICE E2E: PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
