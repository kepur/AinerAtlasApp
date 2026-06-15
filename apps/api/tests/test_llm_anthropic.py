import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import encrypt_api_key
from app.db.session import Base
from app.models import AIProvider
from app.services.llm import FallbackLLMProvider, get_llm_provider
from app.services.llm_anthropic import AnthropicLLMProvider


@pytest.mark.anyio
async def test_anthropic_provider_parses_structured_json_and_tracks_usage() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/messages"
        body = {
            "content": [
                {
                    "type": "text",
                    "text": '{"main_reply_native":"你好","main_reply_target":"Hello","question":"为什么？","challenge":"更深入一点","suggested_expression":"It matters to me.","grammar_tips":[{"pattern":"not only...but also","explanation":"用于递进","importance":4}],"patterns":["not only...but also"],"vocabulary":["value","stability"],"expression_versions":{"basic":"Hello","advanced":"It matters to me."}}',
                }
            ],
            "usage": {"input_tokens": 12, "output_tokens": 34},
        }
        return httpx.Response(200, json=body)

    provider = AnthropicLLMProvider(
        api_key="test-key",
        base_url="https://api.anthropic.com",
        model_name="claude-3-5-haiku-latest",
        provider_id="provider-1",
        transport=httpx.MockTransport(handler),
    )

    result = await provider.thought_dialogue(
        user_input="我想表达稳定和自由很重要",
        profile=None,
        native_language="zh",
        target_language="en",
        mode="socratic",
        topic="migration",
    )

    assert result.main_reply_native == "你好"
    assert result.main_reply_target == "Hello"
    assert result.patterns == ["not only...but also"]
    assert result.expression_versions["advanced"] == "It matters to me."
    assert provider.last_usage == {
        "provider_id": "provider-1",
        "tokens_input": 12,
        "tokens_output": 34,
        "latency_ms": provider.last_usage["latency_ms"],
        "status": "ok",
    }
    assert provider.last_usage["latency_ms"] >= 0


@pytest.mark.anyio
async def test_anthropic_provider_records_rate_limit_status() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"message": "rate limited"}})

    provider = AnthropicLLMProvider(
        api_key="test-key",
        base_url="https://api.anthropic.com",
        model_name="claude-3-5-haiku-latest",
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(httpx.HTTPStatusError):
        await provider.thought_dialogue(
            user_input="hello",
            profile=None,
            native_language="zh",
            target_language="en",
            mode="socratic",
            topic="test",
        )

    assert provider.last_usage["status"] == "rate_limit"


def test_get_llm_provider_builds_anthropic_provider_from_encrypted_key() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="anthropic",
                provider_type="llm",
                api_base_url="https://api.anthropic.com",
                api_key_encrypted=encrypt_api_key("anthropic-secret"),
                model_name="claude-3-5-haiku-latest",
                enabled=True,
                priority=1,
            )
        )
        db.commit()

        provider = get_llm_provider(db=db)

    assert isinstance(provider, FallbackLLMProvider)
    assert isinstance(provider._providers[0], AnthropicLLMProvider)
    assert provider._providers[0]._client.headers["x-api-key"] == "anthropic-secret"