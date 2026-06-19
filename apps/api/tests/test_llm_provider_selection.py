from app.core.security import encrypt_api_key
from app.db.session import SessionLocal
from app.models import AIProvider
from app.services.llm import (
    FallbackLLMProvider,
    LLMUnavailableError,
    MockLLMProvider,
    get_llm_provider,
)
from app.services.llm_openai import OpenAICompatibleLLMProvider


def _first_real_provider(provider):
    if isinstance(provider, FallbackLLMProvider):
        return provider._providers[0]
    return provider


def test_custom_provider_name_is_openai_compatible() -> None:
    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="dk",
                provider_type="llm",
                api_base_url="https://api.deepseek.com",
                api_key_encrypted=encrypt_api_key("test-deepseek-key"),
                model_name="deepseek-chat",
                enabled=True,
                priority=5,
            )
        )
        db.commit()

        provider = _first_real_provider(get_llm_provider("dk", db))
        assert isinstance(provider, OpenAICompatibleLLMProvider)
        assert provider.provider_name == "dk"
        assert "/v1" in str(provider._client.base_url)


def test_get_llm_provider_prioritizes_hint() -> None:
    with SessionLocal() as db:
        db.add_all(
            [
                AIProvider(
                    provider_name="qwen",
                    provider_type="llm",
                    api_base_url="https://example.com/v1",
                    api_key_encrypted=encrypt_api_key("qwen-key"),
                    model_name="qwen-plus",
                    enabled=True,
                    priority=1,
                ),
                AIProvider(
                    provider_name="deepseek",
                    provider_type="llm",
                    api_base_url="https://api.deepseek.com/v1",
                    api_key_encrypted=encrypt_api_key("deepseek-key"),
                    model_name="deepseek-chat",
                    enabled=True,
                    priority=10,
                ),
            ]
        )
        db.commit()

        chain = get_llm_provider("deepseek", db)
        assert isinstance(chain, FallbackLLMProvider)
        assert isinstance(chain._providers[0], OpenAICompatibleLLMProvider)
        assert chain._providers[0].provider_name == "deepseek"


def test_missing_api_key_falls_back_to_mock_when_allowed() -> None:
    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="deepseek",
                provider_type="llm",
                api_base_url="https://api.deepseek.com/v1",
                api_key_encrypted="gAAAA-invalid-ciphertext",
                model_name="deepseek-chat",
                enabled=True,
                priority=1,
            )
        )
        db.commit()

        chain = get_llm_provider("deepseek", db, allow_mock_fallback=True)
        assert isinstance(chain, MockLLMProvider)


def test_missing_api_key_raises_when_mock_disabled() -> None:
    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="deepseek",
                provider_type="llm",
                api_base_url="https://api.deepseek.com/v1",
                api_key_encrypted="gAAAA-invalid-ciphertext",
                model_name="deepseek-chat",
                enabled=True,
                priority=1,
            )
        )
        db.commit()

        try:
            chain = get_llm_provider("deepseek", db, allow_mock_fallback=False)
            assert False, f"expected LLMUnavailableError, got {getattr(chain, '_providers', chain)}"
        except LLMUnavailableError:
            pass


def test_feature_specific_routing() -> None:
    from app.services.llm import get_llm_provider_for_task

    with SessionLocal() as db:
        # Create two enabled providers
        db.add_all([
            AIProvider(
                provider_name="provider-conversational",
                provider_type="llm",
                api_base_url="https://api.openai.com/v1",
                api_key_encrypted=encrypt_api_key("key-conv"),
                model_name="gpt-4o-mini",
                enabled=True,
                priority=1,
            ),
            AIProvider(
                provider_name="provider-analysis",
                provider_type="llm",
                api_base_url="https://api.deepseek.com/v1",
                api_key_encrypted=encrypt_api_key("key-analysis"),
                model_name="deepseek-chat",
                enabled=True,
                priority=2,
            ),
        ])
        # Set routing configuration
        from app.models import AppSettings
        app_settings = db.get(AppSettings, "default") or AppSettings(id="default")
        app_settings.llm_routing = {
            "conversational_reply": "provider-conversational",
            "learning_analysis": "provider-analysis",
        }
        db.add(app_settings)
        db.commit()

        # Resolve for conversational reply (e.g. dialogue)
        provider_conv = get_llm_provider_for_task("dialogue", "auto", db)
        # Should resolve to provider-conversational
        first_real = _first_real_provider(provider_conv)
        assert first_real.provider_name == "provider-conversational"

        # Resolve for learning analysis (e.g. grammar_analysis)
        provider_analysis = get_llm_provider_for_task("grammar_analysis", "auto", db)
        # Should resolve to provider-analysis
        first_real_analysis = _first_real_provider(provider_analysis)
        assert first_real_analysis.provider_name == "provider-analysis"


def test_per_task_routing_overrides_bucket() -> None:
    from app.services.llm import get_llm_provider_for_task

    with SessionLocal() as db:
        db.add_all([
            AIProvider(
                provider_name="provider-game-default",
                provider_type="llm",
                api_base_url="https://api.openai.com/v1",
                api_key_encrypted=encrypt_api_key("key-game"),
                model_name="gpt-4o-mini",
                enabled=True,
                priority=1,
            ),
            AIProvider(
                provider_name="provider-question-special",
                provider_type="llm",
                api_base_url="https://api.deepseek.com/v1",
                api_key_encrypted=encrypt_api_key("key-q"),
                model_name="deepseek-chat",
                enabled=True,
                priority=2,
            ),
        ])
        from app.models import AppSettings
        app_settings = db.get(AppSettings, "default") or AppSettings(id="default")
        app_settings.llm_routing = {
            "games": "provider-game-default",
            "game_question": "provider-question-special",
        }
        db.add(app_settings)
        db.commit()

        q = _first_real_provider(get_llm_provider_for_task("game_question", "auto", db))
        speech = _first_real_provider(get_llm_provider_for_task("game_ai_speech", "auto", db))
        assert q.provider_name == "provider-question-special"
        assert speech.provider_name == "provider-game-default"

