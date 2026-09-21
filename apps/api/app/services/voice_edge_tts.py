"""Microsoft Edge neural TTS provider.

This runs server-side through the ``edge-tts`` package.  It deliberately does
not use the browser or operating system ``speechSynthesis`` implementation, so
the same configured neural voice is used on every client.
"""

from __future__ import annotations

import base64

from app.services.voice import VoiceProvider
from app.services.tts_profile import normalize, profile_for, voice_table


# Built from the shared per-language profiles so the router, the provider and
# the admin voice list can never drift apart.
EDGE_VOICES_BY_LANGUAGE: dict[str, str] = voice_table()


def edge_voice_for(language: str, configured_voice: str = "", gender: str = "") -> str:
    """Resolve a full Edge voice name while respecting a matching admin voice.

    An admin-configured voice only wins when it belongs to the requested
    language; otherwise a Chinese default would end up reading Japanese.
    """
    lang = normalize(language)
    configured = (configured_voice or "").strip()
    if configured and configured.lower().startswith(f"{lang}-") and configured.endswith("Neural"):
        return configured
    return profile_for(lang).voice_for(gender)


def _rate_percent(speed: float) -> str:
    clamped = max(0.5, min(2.0, float(speed or 1.0)))
    percent = round((clamped - 1.0) * 100)
    return f"{percent:+d}%"


def _pitch_hz(pitch: float) -> str:
    clamped = max(0.5, min(1.5, float(pitch or 1.0)))
    hz = round((clamped - 1.0) * 50)
    return f"{hz:+d}Hz"


class EdgeTTSProvider(VoiceProvider):
    def __init__(self, voice: str = "zh-CN-XiaoxiaoNeural", pitch: float = 1.0) -> None:
        self.voice = voice
        self.pitch = pitch

    async def synthesize(self, text: str, voice: str, speed: float = 1.0) -> dict:
        if not text.strip():
            return {"audio_base64": "", "audio_mime": "audio/mpeg", "provider": "edge"}

        import edge_tts

        selected_voice = voice if voice and voice.endswith("Neural") else self.voice
        communicate = edge_tts.Communicate(
            text=text,
            voice=selected_voice,
            rate=_rate_percent(speed),
            pitch=_pitch_hz(self.pitch),
        )
        chunks: list[bytes] = []
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio" and chunk.get("data"):
                chunks.append(chunk["data"])
        audio = b"".join(chunks)
        return {
            "audio_base64": base64.b64encode(audio).decode("ascii") if audio else "",
            "audio_mime": "audio/mpeg",
            "provider": "edge",
            "voice": selected_voice,
        }

    async def transcribe(self, audio_url: str, language: str) -> str:
        raise RuntimeError("Microsoft Edge TTS does not provide speech recognition")

    async def realtime_session(self, config: dict) -> dict:
        return {"provider": "edge", "mode": "tts-only", "config": config}

    async def evaluate_pronunciation(self, audio_url: str, reference_text: str) -> dict:
        raise RuntimeError("Microsoft Edge TTS does not provide pronunciation assessment")
