"""Per-language TTS: the right voice and pace for the content's language.

The regression these guard against: the Edge branch picked a voice by looking
for Han characters, so kana, Hangul, Cyrillic and Arabic all reached an
English voice, and a single global speed was applied to every language.
"""

from __future__ import annotations

import pytest

from app.services.tts_profile import (
    PROFILES,
    effective_pitch,
    effective_speed,
    profile_for,
    supported_languages,
    voice_table,
)
from app.services.voice_edge_tts import EDGE_VOICES_BY_LANGUAGE, edge_voice_for


# ---------------------------------------------------------------------------
# The profile table
# ---------------------------------------------------------------------------

def test_every_catalog_language_has_a_voice() -> None:
    """Any language offered in the UI must be speakable."""
    from app.services.languages import LOCALE_CATALOG

    missing = sorted(set(LOCALE_CATALOG) - supported_languages())
    assert not missing, f"no TTS profile for: {missing}"


@pytest.mark.parametrize("code", sorted(PROFILES))
def test_voices_belong_to_their_language(code: str) -> None:
    """A profile's voices must carry that language's locale prefix."""
    p = PROFILES[code]
    assert p.female.lower().startswith(f"{code}-"), p.female
    assert p.male.lower().startswith(f"{code}-"), p.male
    assert p.female.endswith("Neural") and p.male.endswith("Neural")


@pytest.mark.parametrize("code", sorted(PROFILES))
def test_rates_stay_in_a_sane_band(code: str) -> None:
    """Corrections nudge the pace; they must not make speech unusable."""
    assert 0.85 <= PROFILES[code].rate <= 1.15


def test_rates_actually_differ_between_languages() -> None:
    """The whole point: syllable-dense languages are slowed more than others."""
    assert profile_for("es").rate < profile_for("en").rate
    assert profile_for("ja").rate < profile_for("en").rate
    assert profile_for("zh").rate > profile_for("ja").rate


def test_profiles_carry_a_reason_for_their_rate() -> None:
    """A tuned constant without a rationale is impossible to revisit."""
    for code, p in PROFILES.items():
        if p.rate != 1.0:
            assert p.note, f"{code} bends the rate with no note"


# ---------------------------------------------------------------------------
# Voice resolution
# ---------------------------------------------------------------------------

def test_language_selects_its_own_voice() -> None:
    assert edge_voice_for("ja") == "ja-JP-NanamiNeural"
    assert edge_voice_for("ko") == "ko-KR-SunHiNeural"
    assert edge_voice_for("ar") == "ar-SA-ZariyahNeural"


def test_a_mismatched_configured_voice_is_ignored() -> None:
    """The regression: a Chinese admin voice must not read Japanese."""
    assert edge_voice_for("ja", "zh-CN-XiaoxiaoNeural") == "ja-JP-NanamiNeural"
    assert edge_voice_for("sr", "Cherry") == "sr-RS-SophieNeural"


def test_a_matching_configured_voice_wins() -> None:
    """An admin who picked a same-language voice keeps it."""
    assert edge_voice_for("zh", "zh-CN-YunjianNeural") == "zh-CN-YunjianNeural"


def test_gender_selects_the_matching_voice() -> None:
    assert edge_voice_for("ja", gender="male") == "ja-JP-KeitaNeural"
    assert edge_voice_for("ja", gender="female") == "ja-JP-NanamiNeural"


def test_unknown_language_falls_back_to_english() -> None:
    assert edge_voice_for("xx") == "en-US-AriaNeural"


def test_router_and_provider_share_one_table() -> None:
    """They drifted apart before: the router listed fewer languages, so an
    explicit "hi"/"ar" hint was dropped."""
    from app.services.tts_router import DEFAULT_VOICE

    router_langs = set(DEFAULT_VOICE["edge"]) - {"*"}
    assert router_langs == set(EDGE_VOICES_BY_LANGUAGE) == supported_languages()
    assert EDGE_VOICES_BY_LANGUAGE == voice_table()


# ---------------------------------------------------------------------------
# Speed / pitch
# ---------------------------------------------------------------------------

def test_admin_speed_scales_every_language() -> None:
    """The global setting still controls overall pace."""
    slow = {lang: effective_speed(lang, 0.7) for lang in PROFILES}
    fast = {lang: effective_speed(lang, 1.2) for lang in PROFILES}
    assert all(slow[l] < fast[l] for l in PROFILES)


def test_language_correction_is_applied_on_top() -> None:
    assert effective_speed("es", 1.0) == pytest.approx(0.92)
    assert effective_speed("zh", 1.0) == pytest.approx(1.05)
    assert effective_speed("en", 1.0) == pytest.approx(1.0)


def test_speed_is_clamped_to_what_edge_accepts() -> None:
    assert effective_speed("es", 10.0) <= 2.0
    assert effective_speed("es", 0.01) >= 0.5
    assert effective_pitch("zh", 99.0) <= 1.5


def test_pitch_is_uniform_across_languages() -> None:
    """No cross-language basis to bend pitch, so the admin's value applies as-is."""
    values = {effective_pitch(lang, 1.1) for lang in PROFILES}
    assert len(values) == 1


# ---------------------------------------------------------------------------
# Game character voices
# ---------------------------------------------------------------------------

def test_game_presets_follow_the_language_on_edge() -> None:
    """A Japanese character must not speak in an American voice.

    The preset fixes the character's gender; the language picks the voice.
    """
    from app.services.game_assets import provider_voice_for

    assert provider_voice_for("male_calm", "edge", "ja") == "ja-JP-KeitaNeural"
    assert provider_voice_for("female_warm", "edge", "ja") == "ja-JP-NanamiNeural"
    assert provider_voice_for("male_calm", "edge", "sr") == "sr-RS-NicholasNeural"
    assert provider_voice_for("female_warm", "edge", "ko") == "ko-KR-SunHiNeural"


def test_game_presets_keep_gender_across_languages() -> None:
    from app.services.game_assets import VOICE_PRESETS, provider_voice_for
    from app.services.tts_profile import PROFILES

    for preset in VOICE_PRESETS:
        gender = preset.get("gender", "")
        if gender not in {"male", "female"}:
            continue
        for lang, profile in PROFILES.items():
            got = provider_voice_for(preset["id"], "edge", lang)
            expected = profile.male if gender == "male" else profile.female
            assert got == expected, f"{preset['id']} in {lang}"


def test_paid_providers_keep_their_own_preset_voices() -> None:
    """Only Edge is language-mapped; the paid tables are untouched."""
    from app.services.game_assets import provider_voice_for

    assert provider_voice_for("female_warm", "qwentts", "ja") == "Cherry"
    assert provider_voice_for("male_calm", "openai", "ja") == "onyx"


def test_preset_without_language_keeps_legacy_behaviour() -> None:
    from app.services.game_assets import provider_voice_for

    assert provider_voice_for("male_calm", "edge") == "en-US-GuyNeural"


# ---------------------------------------------------------------------------
# Admin per-language voice overrides
# ---------------------------------------------------------------------------

class _FakeSettings:
    def __init__(self, overrides):
        self.tts_voice_overrides = overrides


class _FakeDb:
    def __init__(self, overrides):
        self._settings = _FakeSettings(overrides)

    def get(self, _model, _pk):
        return self._settings


def test_override_replaces_the_default_voice() -> None:
    from app.services.tts_profile import resolve_voice

    db = _FakeDb({"edge": {"ja": "ja-JP-KeitaNeural"}})
    assert resolve_voice(db, "ja") == "ja-JP-KeitaNeural"
    # Untouched languages keep their profile default.
    assert resolve_voice(db, "ko") == "ko-KR-SunHiNeural"


def test_overrides_are_namespaced_per_provider() -> None:
    """Qwen-TTS names ("Cherry") must never leak into Edge requests."""
    from app.services.tts_profile import resolve_voice

    db = _FakeDb({"qwentts": {"ja": "Cherry"}})
    assert resolve_voice(db, "ja", provider="edge") == "ja-JP-NanamiNeural"
    assert resolve_voice(db, "ja", provider="qwentts") == "Cherry"


def test_a_pin_does_not_silence_the_other_gender() -> None:
    """Pinning a male voice for Japanese must not make female characters male."""
    from app.services.tts_profile import resolve_voice

    db = _FakeDb({"edge": {"ja": "ja-JP-KeitaNeural"}})
    assert resolve_voice(db, "ja", gender="male") == "ja-JP-KeitaNeural"
    assert resolve_voice(db, "ja", gender="female") == "ja-JP-NanamiNeural"


def test_a_third_party_pin_applies_to_both_genders() -> None:
    """A voice outside the profile's two slots is an explicit choice."""
    from app.services.tts_profile import resolve_voice

    db = _FakeDb({"edge": {"ko": "ko-KR-HyunsuMultilingualNeural"}})
    assert resolve_voice(db, "ko") == "ko-KR-HyunsuMultilingualNeural"
    assert resolve_voice(db, "ko", gender="male") == "ko-KR-HyunsuMultilingualNeural"


def test_blank_and_malformed_overrides_are_ignored() -> None:
    from app.services.tts_profile import resolve_voice, voice_overrides

    assert voice_overrides(_FakeDb({}), "edge") == {}
    assert voice_overrides(_FakeDb({"edge": "not-a-dict"}), "edge") == {}
    assert voice_overrides(_FakeDb({"edge": {"ja": "   "}}), "edge") == {}
    assert resolve_voice(_FakeDb({"edge": {"ja": ""}}), "ja") == "ja-JP-NanamiNeural"


def test_a_missing_settings_row_falls_back_to_defaults() -> None:
    """Speech must survive a database that cannot answer."""
    from app.services.tts_profile import resolve_voice, voice_overrides

    class Broken:
        def get(self, *_a):
            raise RuntimeError("db down")

    assert voice_overrides(Broken(), "edge") == {}
    assert resolve_voice(Broken(), "ja") == "ja-JP-NanamiNeural"
    assert resolve_voice(None, "ja") == "ja-JP-NanamiNeural"


def test_fingerprint_changes_when_a_pin_changes() -> None:
    """Cache keys embed this, so re-pinning must invalidate cached audio."""
    from app.services.tts_profile import overrides_fingerprint

    none = overrides_fingerprint(_FakeDb({}), "edge")
    keita = overrides_fingerprint(_FakeDb({"edge": {"ja": "ja-JP-KeitaNeural"}}), "edge")
    nanami = overrides_fingerprint(_FakeDb({"edge": {"ja": "ja-JP-NanamiNeural"}}), "edge")
    assert len({none, keita, nanami}) == 3


def test_override_schema_normalizes_and_rejects_bad_shapes() -> None:
    from app.schemas import AppSettingsUpdate

    ok = AppSettingsUpdate(tts_voice_overrides={"EDGE": {"JA": " ja-JP-KeitaNeural ", "ko": ""}})
    assert ok.tts_voice_overrides == {"edge": {"ja": "ja-JP-KeitaNeural"}}

    with pytest.raises(Exception):
        AppSettingsUpdate(tts_voice_overrides={"edge": "not-a-dict"})
