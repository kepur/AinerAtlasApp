"""Per-language speech profiles for the default (Edge) TTS provider.

The learning content is pluggable by language (see
:mod:`app.services.language_contract`); its voice has to be too. A single
global voice + speed means a Japanese learner hears kana read by an English
voice at an English pace, which teaches the wrong prosody.

Each language therefore carries its own voice and a *rate correction*. The
correction is relative, not absolute: the admin's global ``tts_speed`` still
controls overall pace, and this only adjusts languages against each other.

Why the rates differ: languages vary in syllabic rate — syllable-timed ones
(Spanish, Italian) are spoken with more syllables per second than
stress-timed ones (English, German), and Japanese is mora-timed and denser
still. A learner needs the fast ones slowed down more to pick words apart.
These are conservative starting values meant to be tuned by ear, not measured
constants; every one of them is overridable per language from this table.

Pitch is left at 1.0 everywhere on purpose. There is no comparable
cross-language basis for raising or lowering it, so the admin's global pitch
applies uniformly rather than being guessed at per language.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TtsProfile:
    """How one language should sound on the default provider."""

    language: str
    female: str
    male: str
    # Relative to the admin's configured speed (1.0 = no language correction).
    rate: float = 1.0
    pitch: float = 1.0
    # Why this rate — kept next to the value so tuning it is an informed edit.
    note: str = ""

    def voice_for(self, gender: str = "") -> str:
        return self.male if (gender or "").lower().startswith("m") else self.female


# Every voice here was verified against `edge_tts.list_voices()`.
PROFILES: dict[str, TtsProfile] = {
    "zh": TtsProfile(
        "zh", "zh-CN-XiaoxiaoNeural", "zh-CN-YunjianNeural", rate=1.05,
        note="Tonal: slowing it too far distorts the tone contours learners need.",
    ),
    "en": TtsProfile(
        "en", "en-US-AriaNeural", "en-US-GuyNeural", rate=1.00,
        note="Reference point for the other rates.",
    ),
    "ja": TtsProfile(
        "ja", "ja-JP-NanamiNeural", "ja-JP-KeitaNeural", rate=0.95,
        note="Mora-timed and dense; needs room to hear each mora.",
    ),
    "ko": TtsProfile(
        "ko", "ko-KR-SunHiNeural", "ko-KR-InJoonNeural", rate=0.97,
        note="Final-consonant liaison blurs word edges at speed.",
    ),
    "es": TtsProfile(
        "es", "es-ES-ElviraNeural", "es-ES-AlvaroNeural", rate=0.92,
        note="Among the highest syllabic rates; the biggest correction.",
    ),
    "it": TtsProfile(
        "it", "it-IT-ElsaNeural", "it-IT-DiegoNeural", rate=0.93,
        note="Syllable-timed and fast, like Spanish.",
    ),
    "fr": TtsProfile(
        "fr", "fr-FR-DeniseNeural", "fr-FR-HenriNeural", rate=0.95,
        note="Liaison runs words together; slower keeps boundaries audible.",
    ),
    "pt": TtsProfile(
        "pt", "pt-BR-FranciscaNeural", "pt-BR-AntonioNeural", rate=0.95,
        note="Heavy vowel reduction in unstressed syllables.",
    ),
    "de": TtsProfile(
        "de", "de-DE-KatjaNeural", "de-DE-ConradNeural", rate=1.02,
        note="Already unhurried; long compounds read better near full speed.",
    ),
    "ru": TtsProfile(
        "ru", "ru-RU-SvetlanaNeural", "ru-RU-DmitryNeural", rate=0.97,
        note="Consonant clusters plus unstressed-vowel reduction.",
    ),
    "sr": TtsProfile(
        "sr", "sr-RS-SophieNeural", "sr-RS-NicholasNeural", rate=0.96,
        note="Dense consonant clusters; case endings land at word end.",
    ),
    "ar": TtsProfile(
        "ar", "ar-SA-ZariyahNeural", "ar-SA-HamedNeural", rate=0.92,
        note="Pharyngeal and emphatic consonants are unfamiliar to most learners.",
    ),
    "hi": TtsProfile(
        "hi", "hi-IN-SwaraNeural", "hi-IN-MadhurNeural", rate=0.95,
        note="Aspirated/retroflex contrasts are lost when rushed.",
    ),
    "bn": TtsProfile(
        "bn", "bn-BD-NabanitaNeural", "bn-BD-PradeepNeural", rate=0.95,
        note="Same aspiration contrasts as Hindi.",
    ),
}

FALLBACK = PROFILES["en"]


def normalize(language: str) -> str:
    return (language or "").strip().lower().replace("_", "-").split("-", 1)[0]


def profile_for(language: str) -> TtsProfile:
    """The speech profile for a language, falling back to English."""
    return PROFILES.get(normalize(language), FALLBACK)


def supported_languages() -> set[str]:
    return set(PROFILES)


def voice_table(gender: str = "") -> dict[str, str]:
    """language -> voice map, the single source both the router and the
    provider build their tables from."""
    return {code: p.voice_for(gender) for code, p in PROFILES.items()}


# ---------------------------------------------------------------------------
# Admin overrides
# ---------------------------------------------------------------------------
# The table above is the default. Admins can pin a different voice per language
# from the console; overrides are stored per provider because each provider
# names its voices differently (Edge: "ja-JP-KeitaNeural", Qwen-TTS: "Cherry"),
# so switching provider must not carry the wrong names over.

def voice_overrides(db, provider: str = "edge") -> dict[str, str]:
    """Admin-pinned voices for ``provider``, keyed by language."""
    from app.models import AppSettings

    try:
        app = db.get(AppSettings, "default") if db is not None else None
    except Exception:  # noqa: BLE001 — a settings read must never break speech
        return {}
    if not app:
        return {}
    stored = getattr(app, "tts_voice_overrides", None) or {}
    if not isinstance(stored, dict):
        return {}
    group = stored.get(provider) or {}
    if not isinstance(group, dict):
        return {}
    return {
        normalize(lang): str(voice).strip()
        for lang, voice in group.items()
        if isinstance(voice, str) and voice.strip()
    }


def overrides_fingerprint(db, provider: str = "edge") -> str:
    """Short digest of the admin's voice pins.

    Cache keys include it so changing a language's voice invalidates the audio
    cached under the old one instead of serving it forever.
    """
    import hashlib

    pins = voice_overrides(db, provider)
    if not pins:
        return "0"
    raw = ";".join(f"{k}={v}" for k, v in sorted(pins.items()))
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:8]


def resolve_voice(
    db, language: str, *, provider: str = "edge", gender: str = "",
) -> str:
    """The voice to speak ``language`` with: admin override, else the profile.

    A gendered request (a game character) only honours the override when the
    override is itself that gender's slot, so pinning a female voice for
    Japanese does not silence male characters.
    """
    lang = normalize(language)
    profile = profile_for(lang)
    pinned = voice_overrides(db, provider).get(lang, "")
    if not pinned:
        return profile.voice_for(gender)

    if not gender:
        return pinned
    # With an explicit gender, the pin applies only to the matching slot.
    wanted = profile.voice_for(gender)
    other = profile.male if wanted == profile.female else profile.female
    return pinned if pinned != other else wanted


def effective_speed(language: str, configured_speed: float) -> float:
    """Apply the language's rate correction to the admin's configured speed."""
    base = float(configured_speed or 1.0)
    corrected = base * profile_for(language).rate
    # Stay inside what the Edge SSML rate accepts.
    return max(0.5, min(2.0, corrected))


def effective_pitch(language: str, configured_pitch: float) -> float:
    base = float(configured_pitch or 1.0)
    return max(0.5, min(1.5, base * profile_for(language).pitch))


# ---------------------------------------------------------------------------
# Catalog for the admin console
# ---------------------------------------------------------------------------

_EDGE_CATALOG_CACHE: dict[str, list[dict]] | None = None


async def edge_voice_catalog() -> dict[str, list[dict]]:
    """Every Edge voice, grouped by language, for the admin's pickers.

    Fetched from the provider (not hardcoded) so the console can never offer a
    voice that no longer exists. Cached per process; the list rarely changes.
    """
    global _EDGE_CATALOG_CACHE
    if _EDGE_CATALOG_CACHE is not None:
        return _EDGE_CATALOG_CACHE

    import edge_tts

    grouped: dict[str, list[dict]] = {}
    try:
        for v in await edge_tts.list_voices():
            short = v.get("ShortName", "")
            locale = v.get("Locale", "")
            if not short or not locale:
                continue
            lang = normalize(locale)
            grouped.setdefault(lang, []).append({
                "value": short,
                "locale": locale,
                "gender": (v.get("Gender") or "").lower(),
                # "ja-JP-NanamiNeural" -> "Nanami"
                "label": short.split("-")[-1].replace("Neural", "").replace("Multilingual", " Multilingual"),
            })
    except Exception:  # noqa: BLE001 — fall back to the built-in profiles
        for lang, p in PROFILES.items():
            grouped[lang] = [
                {"value": p.female, "locale": lang, "gender": "female", "label": p.female},
                {"value": p.male, "locale": lang, "gender": "male", "label": p.male},
            ]

    for voices in grouped.values():
        voices.sort(key=lambda item: (item["gender"] != "female", item["value"]))
    _EDGE_CATALOG_CACHE = grouped
    return grouped


def profile_summary() -> list[dict]:
    """The built-in default for each language, shown as the console's baseline."""
    from app.services.languages import LOCALE_CATALOG

    out = []
    for code, p in PROFILES.items():
        info = LOCALE_CATALOG.get(code, {})
        out.append({
            "language": code,
            "name": info.get("name", code),
            "native_name": info.get("native_name", code),
            "default_female": p.female,
            "default_male": p.male,
            "rate": p.rate,
            "note": p.note,
        })
    out.sort(key=lambda r: r["language"])
    return out
