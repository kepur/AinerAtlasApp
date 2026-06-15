from app.core.security import encrypt_api_key
from app.db.session import SessionLocal
from app.models import AIProvider, AppSettings
from app.services.app_settings import get_app_settings
from app.services.provider_capabilities import get_provider_capabilities


def test_provider_capabilities_reports_llm_mock() -> None:
    with SessionLocal() as db:
        capabilities = {item.key: item for item in get_provider_capabilities(db)}
        assert capabilities["llm"].status in {"mock", "ready", "missing", "key_invalid"}
        assert capabilities["embedding"].key == "embedding"
        assert capabilities["realtime_voice"].key == "realtime_voice"


def test_provider_capabilities_ready_when_llm_key_valid() -> None:
    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="dk",
                provider_type="llm",
                api_base_url="https://api.deepseek.com/v1",
                api_key_encrypted=encrypt_api_key("deepseek-test-key"),
                model_name="deepseek-chat",
                enabled=True,
                priority=1,
            )
        )
        settings = get_app_settings(db)
        settings.default_llm_provider = "dk"
        db.commit()

        llm = next(item for item in get_provider_capabilities(db) if item.key == "llm")
        assert llm.status == "ready"
        assert llm.active_provider == "dk"


def test_delete_provider_clears_default_route() -> None:
    with SessionLocal() as db:
        provider = AIProvider(
            provider_name="temp-llm",
            provider_type="llm",
            api_base_url="https://example.com/v1",
            api_key_encrypted=encrypt_api_key("temp-key"),
            model_name="temp-model",
            enabled=True,
            priority=99,
        )
        db.add(provider)
        db.flush()
        settings = get_app_settings(db)
        settings.default_llm_provider = "temp-llm"
        db.commit()
        provider_id = provider.id

        db.delete(db.get(AIProvider, provider_id))
        settings = get_app_settings(db)
        settings.default_llm_provider = ""
        db.commit()

        assert db.get(AIProvider, provider_id) is None
        assert get_app_settings(db).default_llm_provider == ""
