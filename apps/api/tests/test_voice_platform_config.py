from app.db.session import SessionLocal
from app.models import AppSettings
from app.services.dashscope_omni_realtime import OMNI_REALTIME_WS_DEFAULT, resolve_omni_realtime_url
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
        assert cfg["omni_silence_ms"] == 1000
        assert apply_recommended_vad_patch(db) is False


def test_needs_recommended_vad_patch_detects_legacy_1200():
    assert needs_recommended_vad_patch({"omni_silence_ms": 1200}) is True


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


def test_resolve_omni_realtime_url_ignores_singapore_maas(monkeypatch) -> None:
    """Omni must stay on Beijing even when Fun-ASR uses Singapore MAAS."""
    from app.services.dashscope_client import DashScopeConfig

    monkeypatch.setenv(
        "DASHSCOPE_WEBSOCKET_BASE_URL",
        "wss://ws-84dldz0dg9w204h9.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/inference",
    )
    mock_cfg = DashScopeConfig(
        api_key="test-key",
        workspace_id="",
        compatible_base_url="",
        http_base_url="",
        websocket_base_url="wss://ws-84dldz0dg9w204h9.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/inference",
        asr_model="fun-asr-realtime",
        embedding_model="text-embedding-v4",
        embedding_dimension=1024,
    )
    from unittest.mock import patch

    with patch("app.services.dashscope_omni_realtime.resolve_dashscope_config", return_value=mock_cfg):
        assert resolve_omni_realtime_url(None) == OMNI_REALTIME_WS_DEFAULT


def test_resolve_omni_realtime_url_honors_admin_override() -> None:
    from unittest.mock import patch

    with patch(
        "app.services.dashscope_omni_realtime.get_voice_platform_config",
        return_value={"omni_realtime_url": "wss://custom.example/realtime"},
    ):
        assert resolve_omni_realtime_url(None) == "wss://custom.example/realtime"


def test_resolve_omni_realtime_url_falls_back_to_beijing(monkeypatch) -> None:
    from unittest.mock import patch

    monkeypatch.delenv("DASHSCOPE_WEBSOCKET_BASE_URL", raising=False)
    monkeypatch.delenv("DASHSCOPE_WS_URL", raising=False)
    with patch("app.services.dashscope_omni_realtime.resolve_dashscope_config", return_value=None):
        assert resolve_omni_realtime_url(None) == OMNI_REALTIME_WS_DEFAULT
