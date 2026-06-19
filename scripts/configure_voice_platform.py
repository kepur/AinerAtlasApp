#!/usr/bin/env python3
"""Apply voice platform config for Omni + crush LLM (preserves existing keys)."""
from __future__ import annotations

import json
import sys
from urllib.request import Request, urlopen

API = "http://localhost:7070"


def http(method: str, path: str, token: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = Request(f"{API}{path}", data=data, method=method, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    login = http("POST", "/api/auth/login", "", {"email": "admin@ainerspeak.com", "password": "ChangeMe123!"})
    token = login["access_token"]
    current = http("GET", "/api/admin/app-settings", token)

    vpc = dict(current.get("voice_platform_config") or {})
    vpc.update({
        "realtime_engine": "qwen-omni",
        "omni_models": [
            "qwen3.5-omni-flash-realtime",
            "qwen3.5-omni-flash-realtime-2026-03-15",
        ],
        "omni_voice": "Tina",
        "omni_vad_type": "semantic_vad",
        "omni_vad_threshold": 0.68,
        "omni_silence_ms": 550,
        "crush_llm_model": "qwen3.5-omni-flash",
        "explain_llm_model": "qwen3.5-omni-flash",
        "crush_llm_enabled": True,
        "speech_assessment_enabled": True,
    })

    payload = {**current, "realtime_asr_provider": "qwen-omni", "voice_platform_config": vpc}
    # AppSettingsUpdate only accepts known fields — strip read-only
    for key in ("updated_at", "id"):
        payload.pop(key, None)

    updated = http("PUT", "/api/admin/app-settings", token, payload)
    print("realtime_engine:", updated.get("voice_platform_config", {}).get("realtime_engine"))
    print("realtime_asr_provider:", updated.get("realtime_asr_provider"))
    print("omni_models:", updated.get("voice_platform_config", {}).get("omni_models"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
