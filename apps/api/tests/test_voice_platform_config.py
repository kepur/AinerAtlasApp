from app.db.session import SessionLocal
from app.models import AppSettings
from app.services.voice_platform_config import (
    DEFAULT_VOICE_PLATFORM_CONFIG,
    RECOMMENDED_VAD_PATCH,
    apply_recommended_vad_patch,
    get_voice_coach_batch_settings,
    get_voice_platform_config,
    merge_voice_platform_config,
    needs_recommended_vad_patch,
    pick_omni_model,
    resolve_realtime_engine,
)


class FakeSession:
    pass


def test_merge_voice_platform_config():
    merged = merge_voice_platform_config({"omni_voice": "Ethan"})
    assert merged["omni_voice"] == "Ethan"
    assert merged["realtime_engine"] == DEFAULT_VOICE_PLATFORM_CONFIG["realtime_engine"]
    assert merged["omni_tap_to_end"] is True


def test_merge_voice_platform_numeric_fields():
    merged = merge_voice_platform_config(
        {"omni_vad_threshold": "0.72", "omni_silence_ms": "600", "omni_tap_to_end": "false"}
    )
    assert merged["omni_vad_threshold"] == 0.72
    assert merged["omni_silence_ms"] == 600
    assert merged["omni_tap_to_end"] is False


def test_pick_omni_model_round_robin():
    cfg = {"omni_models": ["a", "b", "c"], "omni_model_index": 0}
    model, idx = pick_omni_model(cfg)
    assert model == "a"
    assert idx == 1
    cfg["omni_model_index"] = idx
    model, idx = pick_omni_model(cfg)
    assert model == "b"
    cfg["omni_model_index"] = idx
    model, idx = pick_omni_model(cfg)
    assert model == "c"


def test_resolve_realtime_engine_default():
    assert resolve_realtime_engine(None) == "fun-asr"
    cfg = get_voice_platform_config(None)
    assert cfg["realtime_engine"] == "fun-asr"


def test_needs_recommended_vad_patch_detects_legacy_silence():
    assert needs_recommended_vad_patch({"omni_silence_ms": 600}) is True
    assert needs_recommended_vad_patch(RECOMMENDED_VAD_PATCH) is False


def test_apply_recommended_vad_patch_updates_db(fresh_test_database):
    with SessionLocal() as db:
        settings = db.get(AppSettings, "default") or AppSettings(id="default")
        if settings.id != "default":
            settings.id = "default"
        settings.voice_platform_config = {"omni_silence_ms": 600, "omni_vad_type": "server_vad"}
        db.add(settings)
        db.commit()

        assert apply_recommended_vad_patch(db) is True
        cfg = get_voice_platform_config(db)
        assert cfg["omni_silence_ms"] == 1200
        assert apply_recommended_vad_patch(db) is False


def test_voice_coach_batch_settings_merge():
    merged = merge_voice_platform_config(
        {
            "voice_coach_schedule": "weekly",
            "voice_coach_vip_only": "false",
            "voice_coach_cron_hour": 25,
            "voice_coach_weekly_day": "bad",
        }
    )
    assert merged["voice_coach_schedule"] == "weekly"
    assert merged["voice_coach_vip_only"] is False
    assert merged["voice_coach_cron_hour"] == 23
    assert merged["voice_coach_weekly_day"] == "sun"
    batch = get_voice_coach_batch_settings(None)
    assert batch["schedule"] == "daily"
    assert batch["vip_only"] is True
