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

        def _err_detail(resp) -> str:
            """Surface the real DashScope error (not just 'Unknown')."""
            msg = getattr(resp, "message", "") or ""
            code = getattr(resp, "code", "") or ""
            if "FreeTierOnly" in str(msg) or "free tier" in str(msg).lower():
                return "阿里云 DashScope 免费额度已用尽：请在控制台关闭“仅用免费额度”模式或开通付费后重试。"
            return str(msg) or str(code) or "TTS 合成失败"

        # Try the configured model, then the alternate qwen-tts model (separate quota).
        models = [self.model] + [m for m in QWEN_TTS_MODELS if m != self.model]
        last_resp = None
        for model in models:
            response = dashscope.MultiModalConversation.call(
                model=model, api_key=self.api_key, text=text, voice=use_voice,
            )
            last_resp = response
            if response.status_code == 200:
                latency_ms = int((time.perf_counter() - started) * 1000)
                audio_url = response.output.audio.url if response.output and response.output.audio else ""
                if not audio_url:
                    return {"audio_base64": "", "audio_url": "", "provider": "qwentts", "error": "no audio URL returned"}
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
                    "model": model,
                    "speed": speed,
                    "text": text,
                    "latency_ms": latency_ms,
                }
        return {"audio_base64": "", "audio_url": "", "provider": "qwentts", "error": _err_detail(last_resp)}

    async def realtime_session(self, config: dict) -> dict:
        return {"provider": "qwentts", "mode": "not-supported"}

    async def evaluate_pronunciation(self, audio_url: str, reference_text: str) -> dict:
        return {"transcript": "", "fluency_score": 50, "accuracy_score": 50}
