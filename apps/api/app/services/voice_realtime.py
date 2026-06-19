"""Realtime voice adapters — Mock and DashScope Fun-ASR with LLM follow-up."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.dashscope_asr import (
    DASHSCOPE_AVAILABLE,
    DashScopeRecognitionBridge,
    build_recognition_bridge,
    dashscope_asr_enabled,
    decode_audio_payload,
)
from app.services.dashscope_client import resolve_dashscope_api_key, resolve_dashscope_config
from app.services.dashscope_omni_realtime import (
    OmniRealtimeBridge,
    build_omni_bridge,
    omni_realtime_enabled,
)
from app.services.voice_platform_config import get_voice_platform_config, resolve_realtime_engine
from app.services.voice_realtime_dialogue import generate_voice_dialogue_response
import base64


class RealtimeAdapterBase:
    def __init__(self, db: Session | None = None) -> None:
        self._db = db
        self._session_config: dict[str, Any] = {}
        self._final_segments: list[str] = []
        self._partial_text = ""
        self._active = False

    def is_active(self) -> bool:
        return self._active

    def _reset_utterance(self) -> None:
        self._final_segments.clear()
        self._partial_text = ""

    def _note_transcript_event(self, event: dict[str, Any]) -> None:
        if event.get("type") != "transcript":
            return
        text = str(event.get("text") or "").strip()
        if not text:
            return
        if event.get("is_final"):
            self._final_segments.append(text)
            self._partial_text = ""
        else:
            self._partial_text = text

    def _compose_utterance(self) -> str:
        if self._final_segments:
            return " ".join(self._final_segments).strip()
        return self._partial_text.strip()

    async def _llm_followups(self, utterance: str) -> list[dict[str, Any]]:
        if not utterance.strip():
            return []
        followups: list[dict[str, Any]] = [{"type": "thinking", "status": "start"}]
        response = await generate_voice_dialogue_response(
            self._db,
            self._session_config.get("user_id"),
            utterance,
            topic=str(self._session_config.get("topic") or "voice chat"),
        )
        followups.append(response)
        return followups

    async def drain_events(self, timeout: float = 0.0) -> list[dict[str, Any]]:
        return []

    async def close(self) -> None:
        self._active = False
        self._reset_utterance()


class MockRealtimeAdapter(RealtimeAdapterBase):
    """Mock adapter for WebSocket realtime voice sessions."""

    @property
    def provider_name(self) -> str:
        return "mock-realtime"

    async def handle_client_message(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        msg_type = data.get("type", "audio")
        if msg_type == "audio":
            action = data.get("action") or data.get("data")
            if action == "start":
                self._active = True
                self._reset_utterance()
                return [{"type": "asr_started", "status": "ok", "provider": self.provider_name}]
            if action == "end":
                self._active = False
                utterance = "I think Europe has more freedom than I expected."
                transcript = {
                    "type": "transcript",
                    "text": utterance,
                    "is_final": True,
                    "provider": self.provider_name,
                }
                self._note_transcript_event(transcript)
                return [transcript, *await self._llm_followups(utterance)]
            pcm = decode_audio_payload(data)
            if pcm:
                partial = {
                    "type": "transcript",
                    "text": "[mock ASR] listening…",
                    "is_final": False,
                    "provider": self.provider_name,
                }
                self._note_transcript_event(partial)
                return [partial]
            return []
        if msg_type == "text":
            text = str(data.get("text") or "").strip()
            if not text:
                return [{"type": "error", "message": "Empty text"}]
            return await self._llm_followups(text)
        if msg_type == "interrupt":
            self._active = False
            self._reset_utterance()
            return [{"type": "interrupted", "status": "ok"}]
        return [{"type": "error", "message": f"Unknown type: {msg_type}"}]

    async def create_session(self, config: dict[str, Any]) -> dict[str, Any]:
        self._session_config = config
        return {
            "provider": self.provider_name,
            "session_id": "mock-session",
            "config": config,
            "capabilities": [
                "transcript",
                "response",
                "interrupt",
                "grammar_hud",
                "llm_dialogue",
            ],
            "asr_engine": "mock",
        }


class DashScopeRealtimeAdapter(RealtimeAdapterBase):
    """DashScope Fun-ASR realtime adapter bridged to browser WebSocket."""

    def __init__(self, db: Session | None = None) -> None:
        super().__init__(db)
        config = resolve_dashscope_config(db)
        if not config:
            raise RuntimeError("DashScope API key is not configured")
        self._settings = get_settings()
        self._config = config
        self._bridge: DashScopeRecognitionBridge | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._listening = False

    @property
    def provider_name(self) -> str:
        return "dashscope-fun-asr"

    def is_active(self) -> bool:
        return self._listening

    async def create_session(self, config: dict[str, Any]) -> dict[str, Any]:
        self._session_config = config
        return {
            "provider": self.provider_name,
            "session_id": config.get("session_id", "dashscope-session"),
            "config": config,
            "capabilities": [
                "transcript",
                "partial_transcript",
                "timestamps",
                "emotion",
                "interrupt",
                "grammar_hud",
                "llm_dialogue",
            ],
            "asr_engine": "dashscope",
            "model": self._config.asr_model,
            "sample_rate": self._settings.dashscope_asr_sample_rate,
            "format": "pcm",
            "workspace_id": self._config.workspace_id,
        }

    def _ensure_bridge(self) -> DashScopeRecognitionBridge:
        if self._bridge:
            return self._bridge
        loop = self._loop or asyncio.get_running_loop()
        self._loop = loop
        self._bridge = build_recognition_bridge(loop, db=self._db)
        return self._bridge

    async def handle_client_message(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        msg_type = data.get("type", "audio")
        if msg_type == "audio":
            action = data.get("action") or data.get("data")
            if action == "start":
                bridge = self._ensure_bridge()
                if not bridge.started:
                    bridge.start()
                self._listening = True
                self._reset_utterance()
                ready = await self._collect_bridge_events(timeout=0.2)
                return [{"type": "asr_started", "status": "ok", "provider": self.provider_name}, *ready]
            if action == "end":
                self._listening = False
                return await self._finalize_after_stop()
            pcm = decode_audio_payload(data)
            if pcm:
                bridge = self._ensure_bridge()
                if not bridge.started:
                    bridge.start()
                    self._listening = True
                bridge.send_audio_frame(pcm)
                return await self._collect_bridge_events(timeout=0.05)
            return []
        if msg_type == "interrupt":
            self._listening = False
            if self._bridge:
                self._bridge.stop()
            self._reset_utterance()
            return [{"type": "interrupted", "status": "ok"}]
        if msg_type == "text":
            text = str(data.get("text") or "").strip()
            if not text:
                return [{"type": "error", "message": "Empty text"}]
            return await self._llm_followups(text)
        return [{"type": "error", "message": f"Unknown type: {msg_type}"}]

    async def _collect_bridge_events(self, timeout: float) -> list[dict[str, Any]]:
        if not self._bridge:
            return []
        events = await self._bridge.drain_events(timeout=timeout)
        for event in events:
            self._note_transcript_event(event)
        return events

    async def _finalize_after_stop(self) -> list[dict[str, Any]]:
        """Stop ASR and wait briefly for final transcript before LLM follow-up."""
        trailing: list[dict[str, Any]] = []
        bridge = self._bridge
        if bridge:
            bridge.stop()
            for attempt in range(8):
                batch = await self._collect_bridge_events(timeout=0.25)
                trailing.extend(batch)
                if self._compose_utterance():
                    break
                if not batch and attempt >= 2:
                    break
                await asyncio.sleep(0.05)
        utterance = self._compose_utterance()
        if utterance:
            trailing.extend(await self._llm_followups(utterance))
            self._reset_utterance()
        elif not any(e.get("type") in {"transcript", "response", "thinking"} for e in trailing):
            trailing.append({"type": "error", "message": "未识别到语音，请再试一次"})
        return trailing

    async def drain_events(self, timeout: float = 0.2) -> list[dict[str, Any]]:
        return await self._collect_bridge_events(timeout=timeout)

    async def close(self) -> None:
        self._listening = False
        if self._bridge:
            self._bridge.stop()
            self._bridge = None
        await super().close()


class OmniRealtimeAdapter(RealtimeAdapterBase):
    """End-to-end Qwen-Omni-Realtime: VAD + LLM + TTS audio in one DashScope session."""

    def __init__(self, db: Session | None = None) -> None:
        super().__init__(db)
        self._bridge: OmniRealtimeBridge | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._listening = False
        self._platform_cfg = get_voice_platform_config(db)
        self._omni_model: str | None = None

    @property
    def provider_name(self) -> str:
        return "qwen-omni-realtime"

    def is_active(self) -> bool:
        return self._listening

    async def create_session(self, config: dict[str, Any]) -> dict[str, Any]:
        self._session_config = config
        from app.services.voice_platform_config import pick_omni_model, save_voice_platform_config

        model, next_idx = pick_omni_model(self._platform_cfg)
        if self._db is not None:
            save_voice_platform_config(self._db, {"omni_model_index": next_idx})
            self._platform_cfg["omni_model_index"] = next_idx
        self._omni_model = model
        self._loop = asyncio.get_running_loop()
        try:
            bridge = self._ensure_bridge()
            if not bridge.started:
                await asyncio.to_thread(bridge.start)
        except Exception as exc:  # noqa: BLE001
            from loguru import logger

            logger.warning("Omni pre-warm failed: {}", exc)
        silence_ms = int(self._platform_cfg.get("omni_silence_ms", 550) or 550)
        tap_to_end = self._platform_cfg.get("omni_tap_to_end", True) is not False
        return {
            "provider": self.provider_name,
            "session_id": config.get("session_id", "omni-session"),
            "config": config,
            "capabilities": [
                "transcript",
                "partial_transcript",
                "response",
                "audio_stream",
                "interrupt",
                "server_vad",
                "full_duplex",
                "tap_to_end",
            ],
            "asr_engine": "qwen-omni",
            "model": model,
            "voice": self._platform_cfg.get("omni_voice", "Cherry"),
            "audio_output": {"format": "pcm16", "sample_rate": 24000},
            "voice_ui": {
                "silence_ms": silence_ms,
                "vad_threshold": float(self._platform_cfg.get("omni_vad_threshold", 0.68) or 0.68),
                "vad_type": str(self._platform_cfg.get("omni_vad_type") or "semantic_vad"),
                "tap_to_end": tap_to_end,
            },
        }

    def _ensure_bridge(self) -> OmniRealtimeBridge:
        if self._bridge:
            return self._bridge
        loop = self._loop or asyncio.get_running_loop()
        self._loop = loop
        self._bridge = build_omni_bridge(loop, db=self._db, model=self._omni_model)
        return self._bridge

    async def handle_client_message(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        msg_type = data.get("type", "audio")
        if msg_type == "audio":
            action = data.get("action") or data.get("data")
            if action == "start":
                bridge = self._ensure_bridge()
                if not bridge.started:
                    bridge.start()
                self._listening = True
                self._reset_utterance()
                ready = await self._collect_bridge_events(timeout=0.3)
                return [{"type": "asr_started", "status": "ok", "provider": self.provider_name}, *ready]
            if action == "end":
                self._listening = False
                return await self._collect_bridge_events(timeout=0.5)
            pcm = decode_audio_payload(data)
            if pcm:
                bridge = self._ensure_bridge()
                if not bridge.started:
                    bridge.start()
                    self._listening = True
                b64 = base64.b64encode(pcm).decode("ascii")
                bridge.append_audio_b64(b64)
                return await self._collect_bridge_events(timeout=0.05)
            return []
        if msg_type == "turn_complete":
            bridge = self._ensure_bridge()
            if not bridge.started:
                bridge.start()
            await asyncio.to_thread(bridge.commit_user_turn)
            return [
                {"type": "turn_committed", "status": "ok", "provider": self.provider_name},
                *await self._collect_bridge_events(timeout=0.35),
            ]
        if msg_type == "interrupt":
            self._listening = False
            if self._bridge:
                self._bridge.cancel_response()
            self._reset_utterance()
            return [{"type": "interrupted", "status": "ok"}]
        if msg_type == "text":
            return [{"type": "error", "message": "Omni mode only supports audio input"}]
        return [{"type": "error", "message": f"Unknown type: {msg_type}"}]

    async def _collect_bridge_events(self, timeout: float) -> list[dict[str, Any]]:
        if not self._bridge:
            return []
        events = await self._bridge.drain_events(timeout=timeout)
        for event in events:
            self._note_transcript_event(event)
        return events

    async def drain_events(self, timeout: float = 0.2) -> list[dict[str, Any]]:
        return await self._collect_bridge_events(timeout=timeout)

    async def close(self) -> None:
        self._listening = False
        if self._bridge:
            self._bridge.stop()
            self._bridge = None
        await super().close()


class OpenAIRealtimeAdapter(MockRealtimeAdapter):
    """Placeholder for OpenAI Realtime API integration."""

    @property
    def provider_name(self) -> str:
        return "openai-realtime"

    async def create_session(self, config: dict[str, Any]) -> dict[str, Any]:
        base = await super().create_session(config)
        base["provider"] = self.provider_name
        base["note"] = "Connect to OpenAI Realtime API when API key is configured"
        return base


def get_realtime_adapter(provider: str = "mock", db: Session | None = None) -> RealtimeAdapterBase:
    provider_name = provider.lower().strip()

    # Admin voice_platform_config.realtime_engine takes precedence.
    engine = resolve_realtime_engine(db)
    if engine == "qwen-omni" and omni_realtime_enabled(db):
        try:
            return OmniRealtimeAdapter(db=db)
        except RuntimeError:
            pass

    if provider_name in {"qwen-omni", "omni", "qwen_omni", "qwen-omni-realtime"} and omni_realtime_enabled(db):
        try:
            return OmniRealtimeAdapter(db=db)
        except RuntimeError:
            pass

    if provider_name == "openai":
        return OpenAIRealtimeAdapter(db=db)

    use_dashscope = dashscope_asr_enabled(db)
    if not use_dashscope and provider_name in {"dashscope", "qwen", "fun-asr", "fun_asr"}:
        use_dashscope = DASHSCOPE_AVAILABLE and bool(resolve_dashscope_api_key(db))

    if use_dashscope:
        try:
            return DashScopeRealtimeAdapter(db=db)
        except RuntimeError:
            pass

    return MockRealtimeAdapter(db=db)


def encode_ws_message(payload: dict[str, Any]) -> str:
    return json.dumps(payload)
