from __future__ import annotations

from abc import ABC, abstractmethod

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decrypt_api_key
from app.models import AIProvider


class VoiceProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_url: str, language: str) -> str:
        raise NotImplementedError

    @abstractmethod
    async def synthesize(self, text: str, voice: str, speed: float = 1.0) -> dict:
        raise NotImplementedError

    @abstractmethod
    async def realtime_session(self, config: dict) -> dict:
        raise NotImplementedError

    @abstractmethod
    async def evaluate_pronunciation(self, audio_url: str, reference_text: str) -> dict:
        raise NotImplementedError


class MockVoiceProvider(VoiceProvider):
    async def transcribe(self, audio_url: str, language: str) -> str:
        return f"I think Europe has more freedom than I expected."

    async def synthesize(self, text: str, voice: str, speed: float = 1.0) -> dict:
        return {
            "audio_url": "",
            "audio_base64": "",
            "audio_mime": "audio/mpeg",
            "provider": "mock",
            "voice": voice,
            "speed": speed,
            "text": text,
        }

    async def realtime_session(self, config: dict) -> dict:
        return {
            "provider": "mock",
            "mode": "realtime-placeholder",
            "client_secret": "mock-client-secret",
            "config": config,
        }

    async def evaluate_pronunciation(self, audio_url: str, reference_text: str) -> dict:
        from app.services.voice_openai import build_pronunciation_scores

        transcript = await self.transcribe(audio_url, "en")
        return build_pronunciation_scores(transcript, reference_text, audio_url)


def get_voice_provider(provider_name: str = "mock", db: Session | None = None) -> VoiceProvider:
    from app.services.voice_openai import OpenAIVoiceProvider
    from app.services.voice_cosyvoice import CosyVoiceProvider
    from app.services.voice_qwentts import QwenTTSProvider

    if db is not None:
        provider = db.scalar(
            select(AIProvider)
            .where(AIProvider.provider_name == provider_name, AIProvider.provider_type == "voice")
            .limit(1)
        )
        if provider and provider.enabled:
            api_key = decrypt_api_key(provider.api_key_encrypted)
            if provider.provider_name == "qwentts":
                return QwenTTSProvider(api_key=api_key, voice="Cherry")
            if provider.provider_name == "cosyvoice" or provider.api_base_url and "dashscope" in provider.api_base_url.lower():
                return CosyVoiceProvider(api_key=api_key, voice="longanhuan")
            if provider.provider_name in {"openai", "mock-voice"} or provider.provider_type == "voice":
                if api_key or provider.provider_name == "openai":
                    return OpenAIVoiceProvider(
                        api_key=api_key,
                        api_base_url=provider.api_base_url or "https://api.openai.com/v1",
                        model_name=provider.model_name or "gpt-4o-mini-tts",
                    )

    if provider_name == "qwentts":
        return QwenTTSProvider(api_key="")
    if provider_name == "cosyvoice":
        return CosyVoiceProvider(api_key="")

    if provider_name in {"openai", "openai-voice"}:
        return OpenAIVoiceProvider(api_key="")

    return MockVoiceProvider()
