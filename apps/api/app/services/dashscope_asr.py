"""DashScope Fun-ASR realtime bridge for WebSocket proxying."""

from __future__ import annotations

import asyncio
import base64
import threading
from typing import Any

from loguru import logger
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.dashscope_client import (
    apply_dashscope_config,
    dashscope_enabled,
    resolve_dashscope_api_key,
    resolve_dashscope_config,
)

try:
    from dashscope.audio.asr import Recognition, RecognitionCallback, RecognitionResult

    DASHSCOPE_AVAILABLE = True
except ImportError:  # pragma: no cover
    DASHSCOPE_AVAILABLE = False


def dashscope_asr_enabled(db: Session | None = None) -> bool:
    if not DASHSCOPE_AVAILABLE:
        return False
    from app.services.runtime_config import (
        get_runtime_config,
        resolve_realtime_asr_provider,
    )

    runtime = get_runtime_config(db)
    provider_mode = resolve_realtime_asr_provider(db).lower().strip()
    if provider_mode == "mock":
        return False
    if not resolve_dashscope_api_key(db):
        return False
    if provider_mode == "dashscope":
        return True
    voice_provider = runtime.default_voice_provider.lower().strip()
    if voice_provider in {"dashscope", "qwen", "fun-asr", "fun_asr"}:
        return True
    return provider_mode == "auto"


class DashScopeRecognitionBridge:
    """Thread-safe wrapper around DashScope Recognition streaming API."""

    def __init__(
        self,
        *,
        model: str,
        workspace_id: str,
        sample_rate: int,
        semantic_punctuation_enabled: bool,
        max_sentence_silence: int | None,
        loop: asyncio.AbstractEventLoop,
        db: Session | None = None,
    ) -> None:
        self._model = model
        self._workspace_id = workspace_id
        self._sample_rate = sample_rate
        self._semantic_punctuation_enabled = semantic_punctuation_enabled
        self._max_sentence_silence = max_sentence_silence
        self._loop = loop
        self._db = db
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._recognition: Recognition | None = None
        self._started = False
        self._lock = threading.Lock()
        self._error: str | None = None

    @property
    def started(self) -> bool:
        return self._started

    def _emit(self, payload: dict[str, Any]) -> None:
        asyncio.run_coroutine_threadsafe(self._queue.put(payload), self._loop)

    def start(self) -> None:
        if not DASHSCOPE_AVAILABLE:
            raise RuntimeError("dashscope SDK is not installed")
        if self._started:
            return

        config = apply_dashscope_config(db=self._db)
        if not config:
            raise RuntimeError("DashScope ASR is not configured")

        bridge = self

        class BridgeCallback(RecognitionCallback):
            def on_open(self) -> None:
                bridge._emit({"type": "asr_ready", "status": "ok"})

            def on_close(self) -> None:
                bridge._emit({"type": "asr_closed", "status": "ok"})

            def on_complete(self) -> None:
                bridge._emit({"type": "asr_complete", "status": "ok"})

            def on_error(self, message) -> None:
                detail = getattr(message, "message", str(message))
                bridge._error = detail
                bridge._emit({"type": "error", "message": detail})

            def on_event(self, result: RecognitionResult) -> None:
                sentence = result.get_sentence()
                if not isinstance(sentence, dict):
                    return
                text = sentence.get("text")
                if not text:
                    return
                payload: dict[str, Any] = {
                    "type": "transcript",
                    "text": text,
                    "is_final": RecognitionResult.is_sentence_end(sentence),
                    "request_id": result.get_request_id(),
                }
                begin_time = sentence.get("begin_time")
                end_time = sentence.get("end_time")
                if begin_time is not None:
                    payload["begin_time_ms"] = begin_time
                if end_time is not None:
                    payload["end_time_ms"] = end_time
                words = sentence.get("words")
                if words:
                    payload["words"] = words
                emo_tag = sentence.get("emo_tag")
                if emo_tag:
                    payload["emotion"] = emo_tag
                    payload["emotion_confidence"] = sentence.get("emo_confidence")
                bridge._emit(payload)

        kwargs: dict[str, Any] = {
            "model": self._model,
            "format": "pcm",
            "sample_rate": self._sample_rate,
            "semantic_punctuation_enabled": self._semantic_punctuation_enabled,
            "callback": BridgeCallback(),
            "workspace": self._workspace_id or None,
        }
        if self._max_sentence_silence is not None:
            kwargs["max_sentence_silence"] = self._max_sentence_silence

        self._recognition = Recognition(**kwargs)
        self._recognition.start()
        self._started = True

    def send_audio_frame(self, frame: bytes) -> None:
        if not frame or not self._started or not self._recognition:
            return
        with self._lock:
            self._recognition.send_audio_frame(frame)

    def stop(self) -> None:
        with self._lock:
            if self._recognition and self._started:
                try:
                    self._recognition.stop()
                except Exception as exc:  # pragma: no cover
                    logger.warning("DashScope recognition stop failed: {}", exc)
            self._recognition = None
            self._started = False

    async def drain_events(self, timeout: float = 0.0) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        while True:
            try:
                if timeout > 0:
                    event = await asyncio.wait_for(self._queue.get(), timeout=timeout)
                else:
                    event = self._queue.get_nowait()
            except (asyncio.TimeoutError, asyncio.QueueEmpty):
                break
            events.append(event)
        return events


def decode_audio_payload(data: dict[str, Any]) -> bytes | None:
    raw = data.get("data") or data.get("audio_base64") or data.get("pcm_base64")
    if raw in (None, "", "start", "end"):
        return None
    if isinstance(raw, str):
        return base64.b64decode(raw)
    if isinstance(raw, (bytes, bytearray)):
        return bytes(raw)
    return None


def build_recognition_bridge(
    loop: asyncio.AbstractEventLoop,
    db: Session | None = None,
) -> DashScopeRecognitionBridge:
    settings = get_settings()
    config = resolve_dashscope_config(db)
    if not config:
        raise RuntimeError("DashScope ASR is not configured")
    return DashScopeRecognitionBridge(
        model=config.asr_model,
        workspace_id=config.workspace_id,
        sample_rate=settings.dashscope_asr_sample_rate,
        semantic_punctuation_enabled=settings.dashscope_asr_semantic_punctuation,
        max_sentence_silence=settings.dashscope_asr_max_sentence_silence,
        loop=loop,
        db=db,
    )
