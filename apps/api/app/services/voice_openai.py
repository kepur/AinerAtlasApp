from __future__ import annotations

import base64
import re
import time
from difflib import SequenceMatcher

import httpx

from app.services.voice import MockVoiceProvider, VoiceProvider

VOICE_MAP = {
    "warm-neutral": "nova",
    "calm": "alloy",
    "energetic": "shimmer",
    "deep": "onyx",
    "bright": "fable",
    "gentle-female": "nova",
    "warm-male": "echo",
    "calm-female": "sage",
    "bright-female": "fable",
    "deep-male": "onyx",
    "energetic-male": "ash",
    "gentle-male": "coral",
    "warm-female": "nova",
    "expressive-female": "fable",
    "expressive-male": "shimmer",
}

VOICE_OPTIONS = [
    {"id": "nova", "label": "Nova (温暖女声)", "gender": "female", "tone": "warm", "desc": "自然温暖的女性声音，适合日常对话"},
    {"id": "echo", "label": "Echo (温暖男声)", "gender": "male", "tone": "warm", "desc": "温暖的男性声音，适合朗读和讲述"},
    {"id": "alloy", "label": "Alloy (中性)", "gender": "neutral", "tone": "calm", "desc": "平静中性声音，适合语法讲解"},
    {"id": "fable", "label": "Fable (明亮女声)", "gender": "female", "tone": "bright", "desc": "明亮清晰的女声，适合单词跟读"},
    {"id": "sage", "label": "Sage (温柔女声)", "gender": "female", "tone": "gentle", "desc": "温柔知性的女声，适合长文本朗读"},
    {"id": "onyx", "label": "Onyx (深沉男声)", "gender": "male", "tone": "deep", "desc": "沉稳厚重的男声，适合正式表达"},
    {"id": "shimmer", "label": "Shimmer (活力女声)", "gender": "female", "tone": "energetic", "desc": "活力四射的女声，适合口语练习"},
    {"id": "ash", "label": "Ash (沉稳男声)", "gender": "male", "tone": "deep", "desc": "成熟沉稳的男声，适合商务表达"},
    {"id": "coral", "label": "Coral (柔和男声)", "gender": "male", "tone": "gentle", "desc": "柔和亲切的男声，适合教学场景"},
]


class OpenAIVoiceProvider(VoiceProvider):
    def __init__(
        self,
        api_key: str,
        api_base_url: str = "https://api.openai.com/v1",
        model_name: str = "gpt-4o-mini-tts",
        whisper_model: str = "whisper-1",
    ):
        self.api_key = api_key
        self.api_base_url = api_base_url.rstrip("/")
        self.model_name = model_name
        self.whisper_model = whisper_model
        self._fallback = MockVoiceProvider()

    async def transcribe(self, audio_url: str, language: str) -> str:
        if not self.api_key:
            return await self._fallback.transcribe(audio_url, language)

        audio_bytes = await self._load_audio(audio_url)
        if not audio_bytes:
            return await self._fallback.transcribe(audio_url, language)

        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.api_base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                data={"model": self.whisper_model, "language": language},
                files={"file": ("audio.webm", audio_bytes, "audio/webm")},
            )
            response.raise_for_status()
            payload = response.json()
        return payload.get("text", "").strip()

    async def synthesize(self, text: str, voice: str, speed: float = 1.0) -> dict:
        if not self.api_key:
            result = await self._fallback.synthesize(text, voice, speed)
            result["provider"] = "mock"
            return result

        openai_voice = VOICE_MAP.get(voice, "nova")
        started = time.perf_counter()
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.api_base_url}/audio/speech",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model_name,
                    "input": text,
                    "voice": openai_voice,
                    "speed": speed,
                    "response_format": "mp3",
                },
            )
            response.raise_for_status()
            audio_bytes = response.content

        latency_ms = int((time.perf_counter() - started) * 1000)
        encoded = base64.b64encode(audio_bytes).decode("ascii")
        return {
            "audio_base64": encoded,
            "audio_mime": "audio/mpeg",
            "audio_url": f"data:audio/mpeg;base64,{encoded}",
            "provider": "openai",
            "voice": openai_voice,
            "speed": speed,
            "text": text,
            "latency_ms": latency_ms,
        }

    async def realtime_session(self, config: dict) -> dict:
        if not self.api_key:
            return await self._fallback.realtime_session(config)
        return {
            "provider": "openai",
            "mode": "realtime-placeholder",
            "client_secret": "configure-openai-realtime-separately",
            "config": config,
        }

    async def evaluate_pronunciation(self, audio_url: str, reference_text: str) -> dict:
        transcript = await self.transcribe(audio_url, "en")
        return build_pronunciation_scores(transcript, reference_text, audio_url)

    async def _load_audio(self, audio_url: str) -> bytes:
        if audio_url.startswith("data:"):
            _, encoded = audio_url.split(",", 1)
            return base64.b64decode(encoded)
        if audio_url.startswith("base64:"):
            return base64.b64decode(audio_url.removeprefix("base64:"))
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(audio_url)
            response.raise_for_status()
            return response.content


def build_pronunciation_scores(
    transcript: str,
    reference_text: str,
    audio_url: str,
) -> dict:
    ref_words = _tokenize(reference_text)
    spoken_words = _tokenize(transcript)
    matcher = SequenceMatcher(None, ref_words, spoken_words)
    matches = sum(block.size for block in matcher.get_matching_blocks())
    accuracy = round((matches / max(len(ref_words), 1)) * 100, 1)
    fluency = round(min(100, accuracy + (8 if len(spoken_words) >= len(ref_words) * 0.8 else -5)), 1)
    confidence = round((accuracy + fluency) / 2, 1)

    corrections: list[dict[str, str]] = []
    for idx, ref_word in enumerate(ref_words):
        spoken = spoken_words[idx] if idx < len(spoken_words) else ""
        if spoken.lower() != ref_word.lower():
            corrections.append(
                {
                    "word": ref_word,
                    "spoken": spoken or "(missing)",
                    "suggestion": ref_word,
                }
            )
        if len(corrections) >= 5:
            break

    filler_words = _collect_filler_words(transcript)
    pause_feedback = _build_pause_feedback(
        fluency=fluency,
        accuracy=accuracy,
        spoken_word_count=len(spoken_words),
        reference_word_count=len(ref_words),
        filler_words=filler_words,
    )

    return {
        "transcript": transcript,
        "reference_text": reference_text,
        "fluency_score": fluency,
        "accuracy_score": accuracy,
        "pronunciation_score": accuracy,
        "confidence_score": confidence,
        "top_corrections": corrections,
        "suggestions": [
            "放慢语速，确保每个关键词发音清晰。",
            "跟读时先听完整句，再分段模仿重音位置。",
        ],
        "filler_words": filler_words,
        "pause_feedback": pause_feedback,
        "audio_url": audio_url,
    }


def _tokenize(text: str) -> list[str]:
    return [word for word in re.findall(r"[A-Za-z']+", text.lower()) if word]


def _collect_filler_words(transcript: str) -> list[dict[str, int | str]]:
    lowered = transcript.lower()
    filler_patterns = {
        "um": r"\bum\b",
        "uh": r"\buh\b",
        "like": r"\blike\b",
        "actually": r"\bactually\b",
        "you know": r"\byou\s+know\b",
        "i mean": r"\bi\s+mean\b",
    }
    results: list[dict[str, int | str]] = []
    for phrase, pattern in filler_patterns.items():
        count = len(re.findall(pattern, lowered))
        if count:
            results.append({"phrase": phrase, "count": count})
    return results


def _build_pause_feedback(
    fluency: float,
    accuracy: float,
    spoken_word_count: int,
    reference_word_count: int,
    filler_words: list[dict[str, int | str]],
) -> list[str]:
    feedback: list[str] = []
    if spoken_word_count < max(1, int(reference_word_count * 0.8)):
        feedback.append("后半句有省略，先按意群分段完成整句再提速。")
    if filler_words:
        phrases = ", ".join(str(item["phrase"]) for item in filler_words[:3])
        feedback.append(f"注意减少口头填充词：{phrases}。")
    if fluency < 80:
        feedback.append("建议先做慢速跟读，再做完整复述，减少中途卡顿。")
    if accuracy < 80:
        feedback.append("关键词发音还不够稳定，先单词重读再回到整句。")
    if not feedback:
        feedback.append("停顿控制整体自然，可以继续提升句尾连读和重音层次。")
    return feedback[:3]
