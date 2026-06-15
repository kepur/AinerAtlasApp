from app.core.config import get_settings
from app.core.security import decrypt_api_key, encrypt_api_key
from app.db.session import SessionLocal
from app.models import AIProvider, AppSettings
from app.services.dashscope_client import resolve_dashscope_api_key, resolve_dashscope_config
from app.services.runtime_config import get_runtime_config
from app.services.seed_aliyun import seed_aliyun_providers


def test_dashscope_api_key_prefers_db_over_env(monkeypatch) -> None:
    monkeypatch.setenv("DASHSCOPE_API_KEY", "env-key-should-not-win")
    get_settings.cache_clear()

    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="qwen",
                provider_type="llm",
                api_key_encrypted=encrypt_api_key("db-admin-key"),
                model_name="qwen-plus",
                enabled=True,
                priority=1,
            )
        )
        db.commit()
        assert resolve_dashscope_api_key(db) == "db-admin-key"


def test_dashscope_api_key_falls_back_to_env_when_db_empty(monkeypatch) -> None:
    monkeypatch.setenv("DASHSCOPE_API_KEY", "env-fallback-key")
    get_settings.cache_clear()

    with SessionLocal() as db:
        assert resolve_dashscope_api_key(db) == "env-fallback-key"


def test_dashscope_config_prefers_db_urls(monkeypatch) -> None:
    monkeypatch.setenv("DASHSCOPE_API_KEY", "")
    monkeypatch.setenv("DASHSCOPE_COMPATIBLE_BASE_URL", "https://env-compatible.example/v1")
    monkeypatch.setenv("DASHSCOPE_HTTP_BASE_URL", "https://env-http.example/v1")
    monkeypatch.setenv("DASHSCOPE_WEBSOCKET_BASE_URL", "wss://env-ws.example/inference")
    get_settings.cache_clear()

    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="qwen",
                provider_type="llm",
                api_key_encrypted=encrypt_api_key("db-key"),
                api_base_url="https://db-compatible.example/v1",
                model_name="qwen-plus",
                enabled=True,
                priority=1,
                config={"workspace_id": "ws-from-admin"},
            )
        )
        db.add(
            AIProvider(
                provider_name="dashscope",
                provider_type="voice",
                api_key_encrypted=encrypt_api_key("db-key"),
                api_base_url="https://db-http.example/v1",
                model_name="fun-asr-realtime",
                enabled=True,
                priority=1,
                config={"ws_url": "wss://db-ws.example/inference", "workspace_id": "ws-from-admin"},
            )
        )
        db.commit()

        config = resolve_dashscope_config(db)
        assert config is not None
        assert config.compatible_base_url == "https://db-compatible.example/v1"
        assert config.http_base_url == "https://db-http.example/v1"
        assert config.websocket_base_url == "wss://db-ws.example/inference"
        assert config.workspace_id == "ws-from-admin"


def test_runtime_config_prefers_admin_defaults() -> None:
    with SessionLocal() as db:
        settings_row = db.get(AppSettings, "default") or AppSettings(id="default")
        settings_row.default_llm_provider = "qwen"
        settings_row.default_voice_provider = "dashscope"
        settings_row.realtime_asr_provider = "dashscope"
        settings_row.default_embedding_provider = "dashscope-embedding"
        db.add(settings_row)
        db.commit()

        runtime = get_runtime_config(db)
        assert runtime.default_llm_provider == "qwen"
        assert runtime.default_voice_provider == "dashscope"
        assert runtime.realtime_asr_provider == "dashscope"
        assert runtime.default_embedding_provider == "dashscope-embedding"


def test_seed_aliyun_does_not_overwrite_admin_key(monkeypatch) -> None:
    monkeypatch.setenv("DASHSCOPE_API_KEY", "env-bootstrap-key")
    get_settings.cache_clear()

    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="qwen",
                provider_type="llm",
                api_key_encrypted=encrypt_api_key("admin-configured-key"),
                model_name="qwen-plus",
                enabled=True,
                priority=1,
            )
        )
        db.commit()

        seed_aliyun_providers(db, get_settings())
        db.commit()

        provider = db.query(AIProvider).filter_by(provider_name="qwen").one()
        assert decrypt_api_key(provider.api_key_encrypted) == "admin-configured-key"
