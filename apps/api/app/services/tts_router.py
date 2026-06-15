"""TTS language router.

Picks the best available TTS provider + voice for a given piece of text based on
the detected (or hinted) language and a provider capability table. This avoids
the "read English with a Chinese TTS" problem described in the product spec:
some providers are great at Chinese but weak at English and vice-versa.

The router is *additive* — it only takes over when it can confidently pick a
better provider for the detected language; otherwise the caller falls back to
the AppSettings-configured default provider.
"""
from __future__ import annotations

import base64
import logging
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decrypt_api_key
from app.models import AIProvider, AppSettings

logger = logging.getLogger(__name__)

# Per-provider language proficiency (0-100) + cost tier. Mirrors the spec's
# provider_voice_capabilities table, scoped to the providers we actually ship.
PROVIDER_VOICE_CAPABILITIES: dict[str, dict] = {
    "cosyvoice": {"zh": 95, "en": 60, "ja": 50, "ko": 50, "emotion": 80, "cost": "low"},
    "qwentts":   {"zh": 92, "en": 65, "ja": 45, "ko": 45, "emotion": 70, "cost": "low"},
    "openai":    {"zh": 82, "en": 92, "ja": 85, "ko": 85, "emotion": 85, "cost": "medium"},
    "mock":      {"zh": 10, "en": 10, "ja": 10, "ko": 10, "emotion": 10, "cost": "free"},
}

# Default voice per provider, keyed by language ("*" = fallback).
DEFAULT_VOICE: dict[str, dict[str, str]] = {
    "cosyvoice": {"*": "longanhuan"},
    "qwentts":   {"zh": "Cherry", "*": "Cherry"},
    "openai":    {"en": "alloy", "zh": "alloy", "*": "alloy"},
    "mock":      {"*": "warm-neutral"},
}

# Providers that authenticate via the shared DashScope key.
_DASHSCOPE_PROVIDERS = {"cosyvoice", "qwentts"}


def detect_text_language(text: str) -> str:
    """Best-effort dominant-language detection via Unicode script analysis."""
    if not text or not text.strip():
        return "en"
    cjk = latin = hangul = kana = cyrillic = total = 0
    for ch in text:
        if ch.isspace() or unicodedata.category(ch).startswith("P"):
            continue
        total += 1
        name = unicodedata.name(ch, "")
        if "CJK" in name or "CHINESE" in name:
            cjk += 1
        elif "HANGUL" in name:
            hangul += 1
        elif "HIRAGANA" in name or "KATAKANA" in name:
            kana += 1
        elif "CYRILLIC" in name:
            cyrillic += 1
        elif ch.isascii() and ch.isalpha():
            latin += 1
    if total == 0:
        return "en"
    r = lambda c: c / total
    if r(kana) > 0.1:
        return "ja"
    if r(hangul) > 0.3:
        return "ko"
    if r(cjk) > 0.2:
        return "zh"
    if r(cyrillic) > 0.3:
        return "ru"
    return "en"


def split_by_language(text: str) -> list[tuple[str, str]]:
    """Split mixed text into consecutive same-language runs.

    Returns a list of (segment, language) tuples. Useful for future per-segment
    synthesis; the single-shot endpoint currently routes by dominant language.
    """
    if not text:
        return []
    runs: list[tuple[str, str]] = []
    cur: list[str] = []
    cur_lang: str | None = None
    for ch in text:
        if ch.isspace() or not ch.isalnum():
            cur.append(ch)
            continue
        lang = detect_text_language(ch)
        if cur_lang is None:
            cur_lang = lang
        if lang != cur_lang and cur:
            runs.append(("".join(cur).strip(), cur_lang))
            cur = []
            cur_lang = lang
        cur.append(ch)
    if cur and cur_lang:
        runs.append(("".join(cur).strip(), cur_lang))
    return [(seg, lang) for seg, lang in runs if seg]


def _enabled_voice_providers(db: Session) -> set[str]:
    rows = db.scalars(
        select(AIProvider).where(
            AIProvider.enabled.is_(True),
            AIProvider.provider_type == "voice",
        )
    )
    names = {row.provider_name for row in rows}
    return names


def _resolve_provider_key(db: Session, provider_name: str) -> str:
    """Resolve an API key for the named voice provider."""
    from app.services.dashscope_client import resolve_dashscope_api_key

    app = db.get(AppSettings, "default")
    global_keys = (getattr(app, "global_api_keys", []) or []) if app else []

    def get_global(platform: str) -> str:
        if isinstance(global_keys, list):
            for e in global_keys:
                if isinstance(e, dict) and e.get("platform") == platform:
                    return e.get("api_key", "")
        return ""

    row = db.scalar(
        select(AIProvider).where(
            AIProvider.provider_name == provider_name,
            AIProvider.enabled.is_(True),
        ).limit(1)
    )
    if row and row.api_key_encrypted:
        try:
            k = decrypt_api_key(row.api_key_encrypted)
            if k:
                return k
        except Exception:  # noqa: BLE001
            pass

    if provider_name in _DASHSCOPE_PROVIDERS:
        return get_global("dashscope") or resolve_dashscope_api_key(db) or ""
    if provider_name == "openai":
        return get_global("openai") or ""
    return ""


def choose_provider(db: Session, language: str, configured_default: str) -> tuple[str, str]:
    """Pick the best enabled provider + voice for ``language``.

    Falls back to ``configured_default`` when no enabled provider clearly wins.
    Returns (provider_name, voice).
    """
    enabled = _enabled_voice_providers(db)
    # Always allow the configured default to participate even if not typed "voice".
    candidates = set(enabled) | {configured_default}
    candidates = {c for c in candidates if c in PROVIDER_VOICE_CAPABILITIES}

    if not candidates:
        return configured_default, _voice_for(configured_default, language)

    best = max(
        candidates,
        key=lambda p: PROVIDER_VOICE_CAPABILITIES.get(p, {}).get(language, 0),
    )
    # If the best score is no better than the configured default, keep default
    # (respects admin choice when capabilities tie).
    default_score = PROVIDER_VOICE_CAPABILITIES.get(configured_default, {}).get(language, 0)
    best_score = PROVIDER_VOICE_CAPABILITIES.get(best, {}).get(language, 0)
    chosen = best if best_score > default_score else configured_default
    return chosen, _voice_for(chosen, language)


def _voice_for(provider_name: str, language: str) -> str:
    table = DEFAULT_VOICE.get(provider_name, {})
    return table.get(language) or table.get("*") or "alloy"


async def synthesize_routed(
    db: Session,
    text: str,
    *,
    language: str | None = None,
    speed: float = 1.0,
    configured_default: str = "browser",
) -> dict | None:
    """Detect language, route to the best provider, synthesize.

    Returns the provider's synthesize() dict, or ``None`` when routing could not
    pick a usable provider (caller should fall back to its default path).
    """
    lang = (language or "").split("-")[0].lower() or detect_text_language(text)
    if lang not in {"zh", "en", "ja", "ko", "ru"}:
        lang = detect_text_language(text)

    base_default = configured_default if configured_default in PROVIDER_VOICE_CAPABILITIES else "openai"
    provider_name, voice = choose_provider(db, lang, base_default)

    api_key = _resolve_provider_key(db, provider_name)
    if not api_key and provider_name != "openai":
        # No key for the routed provider — let the caller fall back.
        return None

    try:
        provider = _build_provider(provider_name, api_key, voice)
        if provider is None:
            return None
        result = await provider.synthesize(text, voice, speed)
        result.setdefault("routed_language", lang)
        result.setdefault("routed_provider", provider_name)
        return result
    except Exception as exc:  # noqa: BLE001
        logger.warning("TTS routing failed for provider %s (%s): %s", provider_name, lang, exc)
        return None


def _build_provider(provider_name: str, api_key: str, voice: str):
    from app.services.voice_cosyvoice import CosyVoiceProvider
    from app.services.voice_qwentts import QwenTTSProvider
    from app.services.voice_openai import OpenAIVoiceProvider

    if provider_name == "cosyvoice":
        return CosyVoiceProvider(api_key=api_key, voice=voice)
    if provider_name == "qwentts":
        return QwenTTSProvider(api_key=api_key, voice=voice)
    if provider_name == "openai":
        return OpenAIVoiceProvider(api_key=api_key)
    return None


async def synthesize_segments(
    db: Session,
    text: str,
    *,
    speed: float = 1.0,
    configured_default: str = "browser",
) -> list[dict]:
    """Split mixed-language text and synthesize each run with its best provider.

    Returns an ordered list of segment dicts ({text, language, provider, audio_*})
    for the frontend to play back-to-back — avoids reading English with a Chinese
    voice in mixed sentences like "want to + verb 表达想做某事".
    """
    base_default = configured_default if configured_default in PROVIDER_VOICE_CAPABILITIES else "openai"
    segments = split_by_language(text)
    if len(segments) <= 1:
        # Single language — one routed clip.
        one = await synthesize_routed(
            db, text, speed=speed, configured_default=configured_default
        )
        lang = detect_text_language(text)
        if one:
            return [{**one, "text": text, "language": lang}]
        return [{"text": text, "language": lang, "audio_url": "", "audio_base64": ""}]

    out: list[dict] = []
    for seg_text, lang in segments:
        provider_name, voice = choose_provider(db, lang, base_default)
        api_key = _resolve_provider_key(db, provider_name)
        clip: dict = {"text": seg_text, "language": lang, "provider": provider_name, "audio_url": "", "audio_base64": ""}
        if api_key or provider_name == "openai":
            try:
                provider = _build_provider(provider_name, api_key, voice)
                if provider is not None:
                    res = await provider.synthesize(seg_text, voice, speed)
                    clip.update({
                        "audio_url": res.get("audio_url", ""),
                        "audio_base64": res.get("audio_base64", ""),
                        "audio_mime": res.get("audio_mime", "audio/mpeg"),
                    })
            except Exception as exc:  # noqa: BLE001
                logger.warning("Segment TTS failed (%s/%s): %s", provider_name, lang, exc)
        out.append(clip)
    return out


def _segment_audio_bytes(clip: dict) -> bytes:
    """Extract raw audio bytes from a segment clip (base64 or data: URL)."""
    b64 = clip.get("audio_base64") or ""
    if not b64:
        url = clip.get("audio_url") or ""
        if url.startswith("data:") and "," in url:
            b64 = url.split(",", 1)[1]
    if not b64:
        return b""
    try:
        return base64.b64decode(b64)
    except Exception:  # noqa: BLE001
        return b""


async def synthesize_mixed_single(
    db: Session,
    text: str,
    *,
    speed: float = 1.0,
    configured_default: str = "browser",
) -> dict:
    """Mixed-language synthesis returned as ONE concatenated MP3 + the segments.

    MP3 is frame-based, so byte-concatenating per-language clips plays back as a
    single continuous file in browsers. Falls back to segments-only when any clip
    lacks decodable audio (frontend then plays them sequentially).
    """
    segments = await synthesize_segments(
        db, text, speed=speed, configured_default=configured_default
    )
    chunks = [_segment_audio_bytes(c) for c in segments]
    if segments and all(chunks):
        merged = b"".join(chunks)
        return {
            "audio_base64": base64.b64encode(merged).decode("ascii"),
            "audio_mime": "audio/mpeg",
            "segments": segments,
        }
    # Could not concatenate (missing audio on some segment) — let frontend play parts.
    return {"audio_base64": "", "audio_mime": "audio/mpeg", "segments": segments}
