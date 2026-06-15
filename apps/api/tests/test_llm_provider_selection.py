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
                api_key_encrypted="invalid-ciphertext",
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
                api_key_encrypted="invalid-ciphertext",
                model_name="deepseek-chat",
                enabled=True,
                priority=1,
            )
        )
        db.commit()

        try:
            get_llm_provider("deepseek", db, allow_mock_fallback=False)
            assert False, "expected LLMUnavailableError"
        except LLMUnavailableError:
            pass
