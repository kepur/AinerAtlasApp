import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import encrypt_api_key
from app.db.session import Base
from app.models import AIProvider
from app.services.llm import FallbackLLMProvider, get_llm_provider
from app.services.llm_gemini import GeminiLLMProvider


@pytest.mark.anyio
async def test_gemini_provider_parses_structured_json_and_tracks_usage() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1beta/models/gemini-1.5-flash:generateContent"
        assert request.url.params.get("key") == "test-key"
        body = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": '{"main_reply_native":"你好","main_reply_target":"Hello","question":"为什么？","challenge":"换个角度想","suggested_expression":"This matters deeply.","grammar_tips":[{"pattern":"What matters is...","explanation":"强调重点","importance":5}],"patterns":["What matters is..."],"vocabulary":["freedom","stability"],"expression_versions":{"basic":"Hello","advanced":"This matters deeply."}}'
                            }
                        ]
                    }
                }
            ],
            "usageMetadata": {"promptTokenCount": 9, "candidatesTokenCount": 21},
        }
        return httpx.Response(200, json=body)

    provider = GeminiLLMProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta",
        model_name="gemini-1.5-flash",
        provider_id="provider-gemini",
        transport=httpx.MockTransport(handler),
    )

    result = await provider.thought_dialogue(
        user_input="我在想稳定和自由哪个更重要",
        profile=None,
        native_language="zh",
        target_language="en",
        mode="socratic",
        topic="migration",
    )

    assert result.main_reply_native == "你好"
    assert result.main_reply_target == "Hello"
    assert result.patterns == ["What matters is..."]
    assert result.expression_versions["advanced"] == "This matters deeply."
    assert provider.last_usage == {
        "provider_id": "provider-gemini",
        "tokens_input": 9,
        "tokens_output": 21,
        "latency_ms": provider.last_usage["latency_ms"],
        "status": "ok",
    }
    assert provider.last_usage["latency_ms"] >= 0


@pytest.mark.anyio
async def test_gemini_provider_records_rate_limit_status() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"message": "quota exceeded"}})

    provider = GeminiLLMProvider(
        api_key="test-key",
        base_url="https://generativelanguage.googleapis.com/v1beta",
        model_name="gemini-1.5-flash",
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


def test_get_llm_provider_builds_gemini_provider_from_encrypted_key() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)

    with SessionLocal() as db:
        db.add(
            AIProvider(
                provider_name="gemini",
                provider_type="llm",
                api_base_url="https://generativelanguage.googleapis.com/v1beta",
                api_key_encrypted=encrypt_api_key("gemini-secret"),
                model_name="gemini-1.5-flash",
                enabled=True,
                priority=1,
            )
        )
        db.commit()

        provider = get_llm_provider(db=db)

    assert isinstance(provider, FallbackLLMProvider)
    assert isinstance(provider._providers[0], GeminiLLMProvider)
    assert provider._providers[0].api_key == "gemini-secret"