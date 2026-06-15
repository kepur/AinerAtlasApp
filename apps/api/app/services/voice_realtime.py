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
from app.services.voice_realtime_dialogue import generate_voice_dialogue_response


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
                bridge = self._bridge
                trailing: list[dict[str, Any]] = []
                if bridge:
                    bridge.stop()
                    trailing = await self._collect_bridge_events(timeout=0.3)
                utterance = self._compose_utterance()
                if utterance:
                    trailing.extend(await self._llm_followups(utterance))
                    self._reset_utterance()
                return trailing
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
