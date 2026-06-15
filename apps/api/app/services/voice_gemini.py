from __future__ import annotations

from app.services.voice import VoiceProvider


class GeminiVoiceProvider(VoiceProvider):
    async def transcribe(self, audio_url: str, language: str) -> str:
        raise NotImplementedError("Provider not yet implemented")

    async def synthesize(self, text: str, voice: str, speed: float = 1.0) -> dict:
        raise NotImplementedError("Provider not yet implemented")

    async def realtime_session(self, config: dict) -> dict:
        raise NotImplementedError("Provider not yet implemented")

    async def evaluate_pronunciation(self, audio_url: str, reference_text: str) -> dict:
        raise NotImplementedError("Provider not yet implemented")
