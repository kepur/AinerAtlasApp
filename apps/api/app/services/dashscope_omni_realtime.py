"""DashScope Qwen-Omni-Realtime bridge for browser WebSocket proxy."""

from __future__ import annotations

import asyncio
import base64
import json
import threading
from typing import Any

from loguru import logger
from sqlalchemy.orm import Session

from app.services.dashscope_client import apply_dashscope_config, resolve_dashscope_api_key, resolve_dashscope_config
from app.services.voice_platform_config import get_voice_platform_config, pick_omni_model

try:
    from dashscope.audio.qwen_omni import (
        AudioFormat,
        MultiModality,
        OmniRealtimeCallback,
        OmniRealtimeConversation,
    )

    OMNI_AVAILABLE = True
except ImportError:  # pragma: no cover
    OMNI_AVAILABLE = False


def omni_realtime_enabled(db: Session | None = None) -> bool:
    if not OMNI_AVAILABLE:
        return False
    return bool(resolve_dashscope_api_key(db))


class OmniRealtimeBridge:
    """Thread-safe bridge between asyncio loop and DashScope OmniRealtimeConversation."""

    def __init__(
        self,
        *,
        loop: asyncio.AbstractEventLoop,
        model: str,
        voice: str,
        instructions: str,
        url: str,
        enable_turn_detection: bool = True,
        vad_type: str = "server_vad",
        vad_threshold: float = 0.5,
        silence_ms: int = 1000,
        db: Session | None = None,
    ) -> None:
        self._loop = loop
        self._model = model
        self._voice = voice
        self._instructions = instructions
        self._url = url
        self._enable_turn_detection = enable_turn_detection
        self._vad_type = vad_type
        self._vad_threshold = vad_threshold
        self._silence_ms = silence_ms
        self._db = db
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._conv: OmniRealtimeConversation | None = None
        self._started = False
        self._lock = threading.Lock()
        self._assistant_text = ""

    @property
    def started(self) -> bool:
        return self._started

    def _emit(self, payload: dict[str, Any]) -> None:
        asyncio.run_coroutine_threadsafe(self._queue.put(payload), self._loop)

    def _handle_event(self, response: dict[str, Any]) -> None:
        event_type = response.get("type", "")
        if event_type == "conversation.item.input_audio_transcription.completed":
            text = str(response.get("transcript") or "").strip()
            if text:
                self._emit(
                    {
                        "type": "transcript",
                        "text": text,
                        "is_final": True,
                        "provider": "qwen-omni-realtime",
                    }
                )
            return
        if event_type == "conversation.item.input_audio_transcription.delta":
            preview = str(response.get("text") or "") + str(response.get("stash") or "")
            preview = preview.strip()
            if preview:
                self._emit(
                    {
                        "type": "transcript",
                        "text": preview,
                        "is_final": False,
                        "provider": "qwen-omni-realtime",
                    }
                )
            return
        if event_type == "response.audio_transcript.delta":
            delta = str(response.get("delta") or "")
            if delta:
                self._assistant_text += delta
                self._emit(
                    {
                        "type": "response_partial",
                        "text": self._assistant_text,
                        "provider": "qwen-omni-realtime",
                    }
                )
            return
        if event_type == "response.audio_transcript.done":
            text = str(response.get("transcript") or self._assistant_text).strip()
            self._assistant_text = ""
            if text:
                self._emit(
                    {
                        "type": "response",
                        "text": text,
                        "grammar_tips": [],
                        "natural_rewrite": text,
                        "provider": "qwen-omni-realtime",
                        "audio_mode": "omni",
                    }
                )
            return
        if event_type == "response.audio.delta":
            delta_b64 = response.get("delta")
            if delta_b64:
                self._emit(
                    {
                        "type": "audio",
                        "data": delta_b64,
                        "mime": "audio/pcm",
                        "sample_rate": 24000,
                        "provider": "qwen-omni-realtime",
                    }
                )
            return
        if event_type == "response.created":
            self._assistant_text = ""
            self._emit({"type": "thinking", "status": "start", "provider": "qwen-omni-realtime"})
            return
        if event_type == "response.done":
            self._emit({"type": "response_done", "provider": "qwen-omni-realtime"})
            return
        if event_type == "input_audio_buffer.speech_started":
            self._emit({"type": "speech_started", "provider": "qwen-omni-realtime"})
            return
        if event_type == "input_audio_buffer.speech_stopped":
            self._emit({"type": "speech_stopped", "provider": "qwen-omni-realtime"})
            return
        if event_type == "error":
            raw = response.get("message") or response.get("error") or "Omni realtime error"
            if isinstance(raw, dict):
                message = str(raw.get("message") or raw.get("detail") or raw)
            else:
                message = str(raw)
            self._emit({"type": "error", "message": message, "provider": "qwen-omni-realtime"})

    def start(self) -> None:
        if not OMNI_AVAILABLE:
            raise RuntimeError("dashscope Omni SDK is not installed")
        with self._lock:
            if self._started:
                return
            apply_dashscope_config(db=self._db)
            bridge = self

            class BridgeCallback(OmniRealtimeCallback):
                def on_open(self) -> None:
                    bridge._emit({"type": "omni_ready", "status": "ok", "model": bridge._model})

                def on_event(self, message: str) -> None:
                    try:
                        payload = json.loads(message) if isinstance(message, str) else message
                    except json.JSONDecodeError:
                        logger.warning("Omni event parse failed: {}", message)
                        return
                    if isinstance(payload, dict):
                        bridge._handle_event(payload)

                def on_close(self, close_status_code, close_msg) -> None:
                    bridge._emit(
                        {
                            "type": "omni_closed",
                            "code": close_status_code,
                            "message": close_msg or "",
                        }
                    )

            self._conv = OmniRealtimeConversation(
                model=self._model,
                callback=BridgeCallback(),
                url=self._url,
            )
            self._conv.connect()
            logger.info("Omni realtime connecting: model={} url={}", self._model, self._url)
            self._conv.update_session(
                output_modalities=[MultiModality.AUDIO, MultiModality.TEXT],
                voice=self._voice,
                input_audio_format=AudioFormat.PCM_16000HZ_MONO_16BIT,
                output_audio_format=AudioFormat.PCM_24000HZ_MONO_16BIT,
                instructions=self._instructions,
                enable_input_audio_transcription=True,
                enable_turn_detection=self._enable_turn_detection,
                turn_detection_type=self._vad_type,
                turn_detection_threshold=self._vad_threshold,
                turn_detection_silence_duration_ms=self._silence_ms,
            )
            self._started = True

    def append_audio_b64(self, audio_b64: str) -> None:
        if not audio_b64 or not self._conv:
            return
        with self._lock:
            if self._conv:
                self._conv.append_audio(audio_b64)

    def cancel_response(self) -> None:
        with self._lock:
            if self._conv:
                try:
                    self._conv.cancel_response()
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Omni cancel_response failed: {}", exc)

    def commit_user_turn(self) -> None:
        """Manually end the user's turn (tap-to-finish) while server VAD is enabled."""
        with self._lock:
            if not self._conv:
                return
            try:
                self._conv.commit()
                self._conv.create_response()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Omni commit_user_turn failed: {}", exc)

    def trigger_proactive_greeting(self) -> None:
        """No-op: DashScope Omni requires a user turn before create_response()."""
        return

    def stop(self) -> None:
        with self._lock:
            if self._conv:
                try:
                    self._conv.close()
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Omni close failed: {}", exc)
            self._conv = None
            self._started = False

    async def drain_events(self, timeout: float = 0.0) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        while True:
            try:
                if timeout <= 0:
                    event = self._queue.get_nowait()
                else:
                    event = await asyncio.wait_for(self._queue.get(), timeout=timeout)
            except (asyncio.TimeoutError, asyncio.QueueEmpty):
                break
            events.append(event)
            timeout = 0.0
        return events


OMNI_REALTIME_WS_BEIJING = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime"
# Backward-compatible alias
OMNI_REALTIME_WS_DEFAULT = OMNI_REALTIME_WS_BEIJING


def resolve_omni_realtime_url(db: Session | None = None) -> str:
    """DashScope Qwen-Omni-Realtime WebSocket endpoint.

    Omni Realtime is only served on the Beijing gateway. Singapore MAAS workspace
    URLs (…/api-ws/v1/inference) are for Fun-ASR / inference — mapping them to
    /realtime breaks voice calls. Use admin ``omni_realtime_url`` to override.
    """
    cfg = get_voice_platform_config(db)
    override = str(cfg.get("omni_realtime_url") or "").strip()
    if override:
        return override
    return OMNI_REALTIME_WS_BEIJING


def resolve_omni_vad_type(model: str, cfg: dict[str, Any]) -> str:
    configured = str(cfg.get("omni_vad_type") or "").strip().lower()
    if configured in {"semantic_vad", "server_vad"}:
        if configured == "semantic_vad" and "qwen3.5" not in model.lower():
            return "server_vad"
        return configured
    if "qwen3.5" in model.lower():
        return "semantic_vad"
    return "server_vad"


def build_omni_bridge(
    loop: asyncio.AbstractEventLoop,
    db: Session | None = None,
    *,
    model: str | None = None,
    instructions: str | None = None,
) -> OmniRealtimeBridge:
    cfg = get_voice_platform_config(db)
    if not model:
        model, _ = pick_omni_model(cfg)
    ws_url = resolve_omni_realtime_url(db)
    vad_type = resolve_omni_vad_type(model, cfg)
    base_instructions = str(cfg.get("omni_instructions") or "").strip()
    merged_instructions = (instructions or "").strip() or base_instructions
    return OmniRealtimeBridge(
        loop=loop,
        model=model,
        voice=str(cfg.get("omni_voice") or "Tina"),
        instructions=merged_instructions,
        url=ws_url,
        enable_turn_detection=bool(cfg.get("omni_turn_detection", True)),
        vad_type=vad_type,
        vad_threshold=float(cfg.get("omni_vad_threshold", 0.68) or 0.68),
        silence_ms=int(cfg.get("omni_silence_ms", 1000) or 1000),
        db=db,
    )
