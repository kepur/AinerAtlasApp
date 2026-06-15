"""Qwen-TTS provider via DashScope MultiModalConversation API."""

import base64
import time

from app.services.voice import VoiceProvider


QWEN_TTS_VOICES = {
    "Cherry": "Cherry (甜美女声)",
    "Stella": "Stella (知性女声)",
    "Ethan": "Ethan (稳重男声)",
}

QWEN_TTS_MODELS = ["qwen3-tts-flash", "qwen3-tts-instruct-flash"]


class QwenTTSProvider(VoiceProvider):
    def __init__(self, api_key: str, model: str = "qwen3-tts-flash", voice: str = "Cherry"):
        self.api_key = api_key
        self.model = model
        self.default_voice = voice

    async def transcribe(self, audio_url: str, language: str) -> str:
        return ""

    async def synthesize(self, text: str, voice: str, speed: float = 1.0) -> dict:
        if not self.api_key:
            return {"audio_base64": "", "audio_url": "", "provider": "qwentts", "error": "no API key"}

        try:
            import dashscope
        except ImportError:
            return {"audio_base64": "", "audio_url": "", "provider": "qwentts", "error": "dashscope not installed"}

        use_voice = voice or self.default_voice
        started = time.perf_counter()
        response = dashscope.MultiModalConversation.call(
            model=self.model,
            api_key=self.api_key,
            text=text,
            voice=use_voice,
        )

        latency_ms = int((time.perf_counter() - started) * 1000)
        if response.status_code == 200:
            audio_url = response.output.audio.url if response.output and response.output.audio else ""
            if audio_url:
                import httpx
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(audio_url)
                    resp.raise_for_status()
                    audio_bytes = resp.content
                encoded = base64.b64encode(audio_bytes).decode("ascii")
                return {
                    "audio_base64": encoded,
                    "audio_mime": "audio/mpeg",
                    "audio_url": f"data:audio/mpeg;base64,{encoded}",
                    "provider": "qwentts",
                    "voice": use_voice,
                    "speed": speed,
                    "text": text,
                    "latency_ms": latency_ms,
                }
            return {"audio_base64": "", "audio_url": "", "provider": "qwentts", "error": "no audio URL returned"}
        return {"audio_base64": "", "audio_url": "", "provider": "qwentts", "error": str(response.code)}

    async def realtime_session(self, config: dict) -> dict:
        return {"provider": "qwentts", "mode": "not-supported"}

    async def evaluate_pronunciation(self, audio_url: str, reference_text: str) -> dict:
        return {"transcript": "", "fluency_score": 50, "accuracy_score": 50}
