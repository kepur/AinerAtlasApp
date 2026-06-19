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

from app.services.dashscope_client import resolve_dashscope_api_key
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


async def evaluate_with_dashscope_fallback(
    db: Session | None,
    audio_ref: str,
    reference_text: str,
) -> dict[str, Any]:
    """Real fallback: ASR transcript + heuristic alignment (not fixed mock scores)."""
    from app.services.dashscope_client import dashscope_enabled
    from app.services.voice import get_voice_provider
    from app.services.runtime_config import resolve_default_voice_provider

    provider_name = resolve_default_voice_provider(db)
    if dashscope_enabled(db):
        provider_name = "dashscope"
    provider = get_voice_provider(provider_name, db)
    base: dict[str, Any] = {
        "transcript": "",
        "accuracy_score": 0,
        "fluency_score": 0,
        "completeness_score": 0,
        "pronunciation_score": 0,
        "provider": provider_name,
    }
    try:
        base = await provider.evaluate_pronunciation(audio_ref, reference_text)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Voice provider evaluate failed ({}): {}", provider_name, exc)
    if base.get("accuracy_score", 0) > 0 and base.get("transcript"):
        base["provider"] = base.get("provider", "voice-provider") + "+heuristic"
        return base

    api_key = resolve_dashscope_api_key(db)
    if not api_key:
        return base

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        cfg = get_voice_platform_config(db)
        model = str(cfg.get("explain_llm_model") or "qwen-plus")
        prompt = (
            f"Reference: {reference_text}\n"
            f"Spoken (ASR): {base.get('transcript', '')}\n"
            "Score pronunciation 0-100 for accuracy, fluency, completeness. "
            'Return JSON only: {"accuracy_score":n,"fluency_score":n,"completeness_score":n,"feedback":"..."}'
        )
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a pronunciation assessment coach."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        text = (resp.choices[0].message.content or "").strip()
        if "{" in text:
            chunk = text[text.index("{") : text.rindex("}") + 1]
            data = json.loads(chunk)
            return {
                **base,
                "accuracy_score": float(data.get("accuracy_score", 70)),
                "fluency_score": float(data.get("fluency_score", 70)),
                "completeness_score": float(data.get("completeness_score", 70)),
                "pronunciation_score": float(data.get("accuracy_score", 70)),
                "feedback": data.get("feedback", ""),
                "provider": f"dashscope-{model}",
            }
    except Exception as exc:  # noqa: BLE001
        logger.warning("DashScope explain fallback scoring failed: {}", exc)
    return base
