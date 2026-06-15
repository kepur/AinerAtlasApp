"""Realtime TTS adapters — Qwen-TTS-Realtime and CosyVoice Realtime via DashScope WebSocket."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import threading
from typing import Any

from sqlalchemy.orm import Session

from app.services.dashscope_client import resolve_dashscope_api_key, get_global_api_key
from app.services.voice import VoiceProvider

logger = logging.getLogger(__name__)

QWEN_TTS_REALTIME_VOICES = {
    "Cherry": "Cherry (甜美女声)",
    "Stella": "Stella (知性女声)",
    "Luna": "Luna (温柔女声)",
    "Nova": "Nova (清亮女声)",
    "Ethan": "Ethan (稳重男声)",
    "Owen": "Owen (自然男声)",
}


def get_global_api_key(db: Session | None, platform: str = "dashscope") -> str:
    if db is None:
        return ""
    from app.models import AppSettings
    app = db.get(AppSettings, "default")
    if not app or not app.global_api_keys:
        return ""
    if isinstance(app.global_api_keys, list):
        for entry in app.global_api_keys:
            if isinstance(entry, dict) and entry.get("platform") == platform:
                return entry.get("api_key", "")
    elif isinstance(app.global_api_keys, dict):
        return app.global_api_keys.get(f"{platform}_api_key", "")
    return ""


async def synthesize_qwen_realtime(api_key: str, text: str, voice: str = "Cherry") -> bytes:
    """Synthesize text to speech using Qwen-TTS-Realtime WebSocket API. Returns full audio bytes."""
    try:
        from dashscope.audio.qwen_tts_realtime import QwenTtsRealtime, QwenTtsRealtimeCallback, AudioFormat
    except ImportError:
        raise RuntimeError("dashscope SDK too old, need >=1.25.11")

    result_parts: list[bytes] = []
    complete = threading.Event()
    error_msg: str | None = None

    class Callback(QwenTtsRealtimeCallback):
        def on_open(self):
            pass

        def on_close(self, code, msg):
            complete.set()

        def on_event(self, response: str):
            try:
                data = json.loads(response)
                if data.get("type") == "response.audio.delta":
                    b64 = data.get("delta", "")
                    if b64:
                        result_parts.append(base64.b64decode(b64))
                if data.get("type") == "response.done":
                    pass
                if data.get("type") == "session.finished":
                    complete.set()
            except Exception:
                pass

    callback = Callback()
    loop = asyncio.get_event_loop()
    
    tts = QwenTtsRealtime(
        model="qwen3-tts-flash-realtime",
        voice=voice,
        format="mp3",
        callback=callback,
        url="wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
        api_key=api_key,
    )
    
    await loop.run_in_executor(None, tts.connect)
    tts.update_session(voice=voice, mode="commit")
    tts.append_text(text[:2000])
    tts.commit()
    
    await loop.run_in_executor(None, complete.wait, 10.0)
    tts.close()
    
    if error_msg:
        raise RuntimeError(error_msg)
    tts.close()
    return b"".join(result_parts)


async def synthesize_cosyvoice_realtime(api_key: str, text: str, voice: str = "longanhuan") -> bytes:
    """Synthesize text using CosyVoice Realtime WebSocket. Returns full audio bytes."""
    try:
        from dashscope.audio.tts_v2 import SpeechSynthesizer, ResultCallback, AudioFormat
    except ImportError:
        raise RuntimeError("dashscope SDK too old")

    import dashscope
    dashscope.api_key = api_key
    dashscope.base_websocket_api_url = "wss://dashscope.aliyuncs.com/api-ws/v1/inference"

    result_parts: list[bytes] = []
    complete = threading.Event()

    class Callback(ResultCallback):
        def on_open(self):
            pass

        def on_complete(self):
            complete.set()

        def on_error(self, message: str):
            complete.set()

        def on_close(self):
            complete.set()

        def on_event(self, message):
            pass

        def on_data(self, data: bytes):
            result_parts.append(data)

    callback = Callback()
    synthesizer = SpeechSynthesizer(
        model="cosyvoice-v3-flash",
        voice=voice,
        format=AudioFormat.MP3_22050HZ_MONO_256KBPS,
        callback=callback,
    )
    
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, synthesizer.streaming_call, text[:2000])
    synthesizer.streaming_complete()
    await loop.run_in_executor(None, complete.wait)
    
    return b"".join(result_parts)
