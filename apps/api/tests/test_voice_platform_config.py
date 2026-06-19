from app.services.voice_platform_config import (
    DEFAULT_VOICE_PLATFORM_CONFIG,
    get_voice_platform_config,
    merge_voice_platform_config,
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
