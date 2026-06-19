"""Aliyun Intelligent Speech Interaction — pronunciation assessment (口语评测)."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Any
from urllib.parse import quote

import httpx
from loguru import logger
from sqlalchemy.orm import Session

from app.services.voice_platform_config import get_voice_platform_config


def _percent_encode(value: str) -> str:
    return quote(value, safe="~")


def _nls_create_token(access_key_id: str, access_key_secret: str, region: str = "cn-shanghai") -> str:
    """Create NLS token via Aliyun meta API (same AK as DashScope when shared)."""
    params = {
        "AccessKeyId": access_key_id,
        "Action": "CreateToken",
        "Format": "JSON",
        "RegionId": region,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": str(uuid.uuid4()),
        "SignatureVersion": "1.0",
        "Timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "Version": "2019-02-28",
    }
    sorted_keys = sorted(params.keys())
    canonical = "&".join(f"{_percent_encode(k)}={_percent_encode(str(params[k]))}" for k in sorted_keys)
    string_to_sign = f"GET&{_percent_encode('/')}&{_percent_encode(canonical)}"
    signature = base64.b64encode(
        hmac.new(
            (access_key_secret + "&").encode("utf-8"),
            string_to_sign.encode("utf-8"),
            hashlib.sha1,
        ).digest()
    ).decode("utf-8")
    params["Signature"] = signature
    host = f"nls-meta.{region}.aliyuncs.com"
    url = f"https://{host}/"
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    token_obj = data.get("Token") or {}
    token = token_obj.get("Id") or token_obj.get("Token") or ""
    if not token:
        raise RuntimeError(f"NLS CreateToken failed: {data}")
    return str(token)


async def _nls_assess_ws(
    *,
    token: str,
    app_key: str,
    reference_text: str,
    pcm_bytes: bytes,
    region: str = "cn-shanghai",
) -> dict[str, Any]:
    """WebSocket speech assessment — returns scores or raises on failure."""
    import websockets

    gateway = f"wss://nls-gateway-{region}.aliyuncs.com/ws/v1"
    uri = f"{gateway}?token={token}"
    result: dict[str, Any] = {}

    async with websockets.connect(uri, ping_interval=None) as ws:
        start_msg = {
            "header": {
                "message_id": str(uuid.uuid4()),
                "task_id": str(uuid.uuid4()),
                "namespace": "SpeechEvaluator",
                "name": "StartEvaluation",
                "appkey": app_key,
            },
            "payload": {
                "lang_type": 1,
                "format": "pcm",
                "sample_rate": 16000,
                "text": reference_text,
                "enable_phoneme_timestamp": True,
            },
        }
        await ws.send(json.dumps(start_msg))
        chunk_size = 3200
        for i in range(0, len(pcm_bytes), chunk_size):
            await ws.send(pcm_bytes[i : i + chunk_size])
        finish_msg = {
            "header": {
                "message_id": str(uuid.uuid4()),
                "task_id": start_msg["header"]["task_id"],
                "namespace": "SpeechEvaluator",
                "name": "StopEvaluation",
                "appkey": app_key,
            },
        }
        await ws.send(json.dumps(finish_msg))

        deadline = time.time() + 30
        while time.time() < deadline:
            raw = await asyncio.wait_for(ws.recv(), timeout=10)
            if isinstance(raw, bytes):
                continue
            payload = json.loads(raw)
            header = payload.get("header") or {}
            name = header.get("name", "")
            if name == "EvaluationResult":
                result = payload.get("payload") or payload
                break
            if name == "TaskFailed":
                raise RuntimeError(str(payload.get("payload") or payload))
    return result


def _decode_audio_ref(audio_ref: str) -> bytes:
    if audio_ref.startswith("base64:"):
        return base64.b64decode(audio_ref[7:])
    if audio_ref.startswith("data:") and "base64," in audio_ref:
        return base64.b64decode(audio_ref.split("base64,", 1)[1])
    raise ValueError("Unsupported audio reference for assessment")


def _parse_assessment_result(raw: dict[str, Any], reference_text: str) -> dict[str, Any]:
    overall = raw.get("overall") or raw.get("result") or raw
    pronunciation = float(overall.get("pronunciation") or overall.get("score") or 0)
    fluency = float(overall.get("fluency") or overall.get("fluency_score") or pronunciation)
    completeness = float(overall.get("completeness") or overall.get("integrity") or pronunciation)
    accuracy = float(overall.get("accuracy") or pronunciation)
    transcript = str(overall.get("text") or overall.get("transcript") or reference_text)
    words = overall.get("words") or overall.get("phonemes") or []
    return {
        "transcript": transcript,
        "pronunciation_score": round(pronunciation or accuracy, 1),
        "fluency_score": round(fluency, 1),
        "accuracy_score": round(accuracy, 1),
        "completeness_score": round(completeness, 1),
        "provider": "aliyun-nls-assessment",
        "word_scores": words,
        "raw": raw,
    }


async def evaluate_with_aliyun_assessment(
    db: Session | None,
    audio_ref: str,
    reference_text: str,
) -> dict[str, Any] | None:
    cfg = get_voice_platform_config(db)
    if not cfg.get("speech_assessment_enabled", True):
        return None
    app_key = str(cfg.get("nls_app_key") or "").strip()
    if not app_key:
        return None

    access_key_id = str(cfg.get("nls_access_key_id") or "").strip()
    access_key_secret = str(cfg.get("nls_access_key_secret") or "").strip()
    if not access_key_id or not access_key_secret:
        # Fall back: DashScope key cannot sign NLS — require explicit NLS AK in config.
        return None

    region = str(cfg.get("nls_region") or "cn-shanghai")
    try:
        pcm = _decode_audio_ref(audio_ref)
        token = await asyncio.to_thread(_nls_create_token, access_key_id, access_key_secret, region)
        raw = await _nls_assess_ws(
            token=token,
            app_key=app_key,
            reference_text=reference_text,
            pcm_bytes=pcm,
            region=region,
        )
        return _parse_assessment_result(raw, reference_text)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Aliyun speech assessment failed: {}", exc)
        return None


async def transcribe_follow_read_audio(
    api_key: str,
    audio_bytes: bytes,
    reference_text: str,
    *,
    mime: str = "audio/webm",
) -> str:
    """DashScope Fun-ASR-Flash sync transcription with reference-text context."""
    b64 = base64.b64encode(audio_bytes).decode("ascii")
    data_uri = f"data:{mime};base64,{b64}"
    fmt = "webm" if "webm" in mime else "wav"
    body = {
        "model": "fun-asr-flash-2026-06-15",
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": reference_text.strip()}],
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_audio", "input_audio": {"data": data_uri}},
                    ],
                },
            ],
        },
        "parameters": {"format": fmt},
    }
    url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-DashScope-SSE": "disable",
            },
            json=body,
        )
        response.raise_for_status()
        payload = response.json()

    output = payload.get("output") or {}
    nested = output.get("output") if isinstance(output.get("output"), dict) else output
    sentence = nested.get("sentence") if isinstance(nested, dict) else None
    if isinstance(sentence, dict) and sentence.get("text"):
        return str(sentence["text"]).strip()
    if isinstance(nested, dict):
        for key in ("text", "transcript"):
            if nested.get(key):
                return str(nested[key]).strip()
    return ""


async def evaluate_with_dashscope_fallback(
    db: Session | None,
    audio_ref: str,
    reference_text: str,
) -> dict[str, Any]:
    """ASR transcript + word-alignment scoring for follow-read."""
    from app.services.dashscope_client import dashscope_enabled, resolve_dashscope_config
    from app.services.voice_openai import build_pronunciation_scores

    cfg = resolve_dashscope_config(db)
    base: dict[str, Any] = {
        "transcript": "",
        "accuracy_score": 0,
        "fluency_score": 0,
        "completeness_score": 0,
        "pronunciation_score": 0,
        "provider": "dashscope",
    }

    if not cfg or not dashscope_enabled(db):
        base["feedback"] = "语音评测服务未配置，请联系管理员"
        return base

    try:
        audio_bytes = _decode_audio_ref(audio_ref)
        transcript = await asyncio.wait_for(
            transcribe_follow_read_audio(cfg.api_key, audio_bytes, reference_text),
            timeout=40.0,
        )
        scored = build_pronunciation_scores(transcript, reference_text, audio_ref)
        scored["provider"] = "fun-asr-flash-2026-06-15"
        if scored.get("accuracy_score", 0) >= 85:
            scored["feedback"] = "发音清晰，继续保持！"
        elif not transcript.strip():
            scored["feedback"] = "未能识别语音，请靠近麦克风在安静环境重试"
        return scored
    except Exception as exc:  # noqa: BLE001
        logger.warning("Follow-read ASR evaluate failed: {}", exc)
        base["feedback"] = "语音识别失败，请重试"
        return base
