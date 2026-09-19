from time import perf_counter

import httpx
import pytest
from fastapi.testclient import TestClient
from openai import AsyncOpenAI
from pydantic import ValidationError

from app.core.security import encrypt_api_key
from app.db.session import SessionLocal
from app.main import app
from app.models import AIProvider
from app.schemas import ProviderCreate, ProviderTestRequest, ProviderTestResult
from app.services.llm import FallbackLLMProvider, MockLLMProvider, get_llm_provider
from app.services.provider_model_queue import model_queue
from app.services.provider_tester import response_result
from app.services.provider_tester import test_provider_connection as probe_provider_connection


def test_admin_can_save_and_reorder_shared_key_model_queue() -> None:
    with TestClient(app) as client:
        login = client.post("/api/auth/login", json={
            "email": "admin@ainerspeak.com", "password": "ChangeMe123!",
        })
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        payload = {
            "provider_name": "cloud-queue-test", "provider_type": "llm",
            "api_base_url": "https://cloud.example/v1", "api_key": "shared-key",
            "model_name": "first", "config": {"model_queue": ["first", "second"]},
        }
        created = client.post("/api/admin/providers", headers=headers, json=payload)
        assert created.status_code == 200, created.text
        provider_id = created.json()["id"]
        assert created.json()["config"]["model_queue"] == ["first", "second"]
        assert "api_key" not in created.json()

        payload.update({
            "api_key": "", "model_name": "second",
            "config": {
                "model_queue": ["second", "first"],
                "last_test": {"ok": True, "model_name": "first"},
            },
        })
        saved = client.put(f"/api/admin/providers/{provider_id}", headers=headers, json=payload)
        assert saved.status_code == 200, saved.text
        assert saved.json()["api_key_status"] == "valid"
        assert "last_test" not in saved.json()["config"]
        with SessionLocal() as db:
            chain = get_llm_provider("cloud-queue-test", db)
            assert isinstance(chain, FallbackLLMProvider)
            assert [provider.model_name for provider in chain.providers[:2]] == ["second", "first"]


def test_queue_schema_requires_ordered_unique_models() -> None:
    assert model_queue("first", {}) == ["first"]
    assert model_queue("first", {"model_queue": ["first", "second"]}) == ["first", "second"]
    ProviderCreate(
        provider_name="cloud", model_name="first", config={"model_queue": ["first", "second"]}
    )
    for names in (["first", "first"], ["second", "first"], ["first", 3]):
        with pytest.raises(ValidationError):
            ProviderCreate(provider_name="cloud", model_name="first", config={"model_queue": names})


def test_connection_probe_rejects_http_200_without_content() -> None:
    request = ProviderTestRequest(provider_name="cloud", model_name="first")
    result = response_result(
        request, perf_counter(), "first", "https://cloud.example/v1/chat/completions",
        httpx.Response(200, json={"choices": [{"message": {"content": ""}}]}),
    )
    assert not result.ok


@pytest.mark.anyio
async def test_one_cloud_tries_models_in_order_without_changing_credentials() -> None:
    seen: list[tuple[str, str]] = []

    def respond(request: httpx.Request) -> httpx.Response:
        import json

        name = json.loads(request.content)["model"]
        seen.append((name, request.headers["Authorization"]))
        if name == "first":
            return httpx.Response(
                503, json={"error": {"message": "unavailable", "type": "server_error"}}
            )
        if name == "second":
            return httpx.Response(200, json={"choices": [{"message": {"content": ""}}]})
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"answer":"ok"}'}}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as http_client:
        with SessionLocal() as db:
            db.add(AIProvider(
                provider_name="cloud", provider_type="llm", api_base_url="https://cloud.example/v1",
                api_key_encrypted=encrypt_api_key("shared-key"), model_name="first",
                config={"model_queue": ["first", "second", "third"]},
            ))
            db.commit()
            chain = get_llm_provider("cloud", db)
            assert isinstance(chain, FallbackLLMProvider)
            assert [p.model_name for p in chain.providers] == ["first", "second", "third"]
            assert all(p._client.max_retries == 0 for p in chain.providers)
            for provider in chain.providers:
                provider._client = AsyncOpenAI(
                    api_key="shared-key", base_url="https://cloud.example/v1",
                    http_client=http_client, max_retries=0,
                )
            assert await chain.complete_json("Reply JSON", "hi") == {"answer": "ok"}
            assert chain.last_usage["model_name"] == "third"
    assert seen == [(name, "Bearer shared-key") for name in ("first", "second", "third")]


@pytest.mark.anyio
async def test_stream_switches_only_before_first_visible_token() -> None:
    class Empty(MockLLMProvider):
        async def chat_reply_stream(self, *args, **kwargs):
            yield " "

    class Works(MockLLMProvider):
        async def chat_reply_stream(self, *args, **kwargs):
            yield "hello"

    chain = FallbackLLMProvider([Empty(), Works()])
    assert [part async for part in chain.chat_reply_stream("hi")] == ["hello"]

    class Breaks(MockLLMProvider):
        async def chat_reply_stream(self, *args, **kwargs):
            yield "partial"
            raise RuntimeError("lost connection")

    chain = FallbackLLMProvider([Breaks(), Works()])
    chunks = []
    with pytest.raises(RuntimeError, match="lost connection"):
        async for part in chain.chat_reply_stream("hi"):
            chunks.append(part)
    assert chunks == ["partial"]


@pytest.mark.anyio
async def test_json_stream_does_not_expose_empty_first_model_marker() -> None:
    class Empty(MockLLMProvider):
        async def complete_json_stream(self, *args, **kwargs):
            self._stream_json_result = {}
            yield "___STREAM_JSON_DONE___"

    class Works(MockLLMProvider):
        async def complete_json_stream(self, *args, **kwargs):
            self._stream_json_result = {"answer": "ok"}
            yield '{"answer":"ok"}'
            yield "___STREAM_JSON_DONE___"

    chain = FallbackLLMProvider([Empty(), Works()])
    assert [part async for part in chain.complete_json_stream("Reply JSON", "hi")] == [
        '{"answer":"ok"}', "___STREAM_JSON_DONE___",
    ]
    assert chain._stream_json_result == {"answer": "ok"}


@pytest.mark.anyio
async def test_draft_connection_test_reports_each_model_attempt(monkeypatch) -> None:
    async def fake_probe(payload):
        ok = payload.model_name == "second"
        return ProviderTestResult(
            ok=ok, provider_name=payload.provider_name, provider_type="llm",
            model_name=payload.model_name, latency_ms=1, message="ok" if ok else "no token",
        )

    monkeypatch.setattr("app.services.provider_tester._test_provider_single", fake_probe)
    result = await probe_provider_connection(ProviderTestRequest(
        provider_name="cloud", model_name="first",
        config={"model_queue": ["first", "second", "third"]},
    ))
    assert result.ok and result.model_name == "second"
    assert [(item["model"], item["ok"]) for item in result.model_attempts] == [
        ("first", False), ("second", True),
    ]
