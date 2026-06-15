"""CosyVoice TTS provider via DashScope HTTP API — natural Chinese voices."""

import base64
import time

from app.services.voice import VoiceProvider


COSYVOICE_MODELS = {
    "cosyvoice-v3-flash": {
        "voices": ["longanhuan", "longaxiang", "longafang", "longaxing"],
        "label": "CosyVoice V3 Flash (快)",
    },
    "cosyvoice-v3-plus": {
        "voices": ["longanhuan", "longaxiang", "longafang", "longaxing"],
        "label": "CosyVoice V3 Plus (高质)",
    },
    "cosyvoice-v2": {
        "voices": ["longxiaochun_v2", "longxiaoxia_v2", "longxiaoyue_v2"],
        "label": "CosyVoice V2 (稳定)",
    },
}

COSYVOICE_DEFAULT = {
    "model": "cosyvoice-v3-flash",
    "voice": "longanhuan",
}

COSYVOICE_VOICE_LABELS = {
    "longanhuan": "龙安欢 (温柔女声)",
    "longaxiang": "龙阿香 (活泼女声)",
    "longafang": "龙阿芳 (知性女声)",
    "longaxing": "龙阿星 (清亮女声)",
    "longxiaochun_v2": "龙小春 V2 (甜美女声)",
    "longxiaoxia_v2": "龙小夏 V2 (清新女声)",
    "longxiaoyue_v2": "龙小悦 V2 (温柔女声)",
}


class CosyVoiceProvider(VoiceProvider):
    def __init__(self, api_key: str, model: str = "cosyvoice-v3-flash", voice: str = "longanhuan"):
        self.api_key = api_key
        self.model = model
        self.default_voice = voice

    async def transcribe(self, audio_url: str, language: str) -> str:
        return ""

    async def synthesize(self, text: str, voice: str, speed: float = 1.0) -> dict:
        if not self.api_key:
            return {"audio_base64": "", "audio_url": "", "provider": "cosyvoice", "error": "no API key"}

        try:
            from dashscope.audio.http_tts.http_speech_synthesizer import HttpSpeechSynthesizer
        except ImportError:
            return {"audio_base64": "", "audio_url": "", "provider": "cosyvoice", "error": "dashscope not installed"}

        use_voice = voice or self.default_voice
        started = time.perf_counter()
        result = HttpSpeechSynthesizer.call(
            model=self.model,
            text=text,
            voice=use_voice,
            format="mp3",
            sample_rate=24000,
            volume=50,
            rate=speed,
            pitch=1.0,
            stream=False,
            api_key=self.api_key,
        )

        latency_ms = int((time.perf_counter() - started) * 1000)
        if hasattr(result, "audio_url") and result.audio_url:
            import httpx
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(result.audio_url)
                resp.raise_for_status()
                audio_bytes = resp.content
            encoded = base64.b64encode(audio_bytes).decode("ascii")
            return {
                "audio_base64": encoded,
                "audio_mime": "audio/mpeg",
                "audio_url": f"data:audio/mpeg;base64,{encoded}",
                "provider": "cosyvoice",
                "voice": use_voice,
                "speed": speed,
                "text": text,
                "latency_ms": latency_ms,
            }
        return {"audio_base64": "", "audio_url": "", "provider": "cosyvoice", "error": "no audio returned"}

    async def realtime_session(self, config: dict) -> dict:
        return {"provider": "cosyvoice", "mode": "not-supported"}

    async def evaluate_pronunciation(self, audio_url: str, reference_text: str) -> dict:
        return {"transcript": "", "fluency_score": 50, "accuracy_score": 50}
