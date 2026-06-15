from __future__ import annotations

import os
from time import perf_counter
from urllib.parse import urlencode

import httpx
from loguru import logger

from app.schemas import ProviderTestRequest, ProviderTestResult


OPENAI_COMPATIBLE_PROVIDERS = {
    "openai",
    "deepseek",
    "qwen",
    "dashscope",
    "openrouter",
    "moonshot",
    "groq",
    "siliconflow",
    "openai-compatible",
}


DEFAULT_BASE_URLS = {
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com",
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
    "deepseek": "https://api.deepseek.com/v1",
    "qwen": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "dashscope": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "moonshot": "https://api.moonshot.cn/v1",
    "groq": "https://api.groq.com/openai/v1",
    "ollama": "http://localhost:11434",
}


DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-latest",
    "gemini": "gemini-1.5-flash",
    "deepseek": "deepseek-v4-pro",
    "qwen": "qwen-plus",
    "dashscope": "qwen-plus",
    "openrouter": "openai/gpt-4o-mini",
    "moonshot": "moonshot-v1-8k",
    "groq": "llama-3.1-8b-instant",
    "ollama": "llama3.1",
}


async def test_provider_connection(payload: ProviderTestRequest) -> ProviderTestResult:
    started = perf_counter()
    provider_key = normalize_provider_key(payload.provider_name)
    model = payload.model_name or DEFAULT_MODELS.get(provider_key, payload.model_name)
    base_url = normalize_base_url(payload.api_base_url or DEFAULT_BASE_URLS.get(provider_key, ""))
    api_key = payload.api_key.strip()

    logger.info("Testing provider {} ({}), model={}", payload.provider_name, provider_key, model)

    try:
        if provider_key == "mock":
            return build_result(
                payload=payload,
                started=started,
                ok=True,
                model=model or "local-deterministic",
                message="Mock provider is available.",
                response_preview="pong",
            )
        if provider_key == "anthropic":
            return await test_anthropic(payload, base_url, model, api_key, started)
        if provider_key == "gemini":
            return await test_gemini(payload, base_url, model, api_key, started)
        if provider_key == "ollama":
            return await test_ollama(payload, base_url, model, started)
        if payload.provider_type == "voice" and provider_key in {"dashscope", "dashscope-voice"}:
            return await test_dashscope_voice(payload, model, api_key, started)
        if payload.provider_type == "embedding" or provider_key == "dashscope-embedding":
            return await test_embedding(payload, model, api_key, started)
        if provider_key in OPENAI_COMPATIBLE_PROVIDERS:
            return await test_openai_compatible(payload, base_url, model, api_key, started)
        return await test_openai_compatible(payload, base_url, model, api_key, started)
    except httpx.TimeoutException as exc:
        logger.warning("Provider {} timed out: {}", payload.provider_name, exc)
        return build_result(
            payload=payload,
            started=started,
            ok=False,
            model=model,
            message="Provider connection timed out.",
            error=str(exc),
        )
    except Exception as exc:  # noqa: BLE001 - this endpoint must return diagnostics.
        logger.error("Provider {} test failed: {}", payload.provider_name, exc)
        return build_result(
            payload=payload,
            started=started,
            ok=False,
            model=model,
            message="Provider connection failed.",
            error=str(exc),
        )


async def test_openai_compatible(
    payload: ProviderTestRequest,
    base_url: str,
    model: str,
    api_key: str,
    started: float,
) -> ProviderTestResult:
    if not base_url:
        raise ValueError("API Base URL is required.")
    if not api_key:
        raise ValueError("API Key is required.")

    url = f"{base_url}/chat/completions"
    body = {
        "model": model,
        "messages": [{"role": "user", "content": "Reply with the single word: pong"}],
        "temperature": 0,
        "max_tokens": 8,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if normalize_provider_key(payload.provider_name) == "openrouter":
        headers["HTTP-Referer"] = "https://ainerspeak.com"
        headers["X-Title"] = "AinerSpeak"

    async with httpx.AsyncClient(timeout=payload.timeout_seconds) as client:
        response = await client.post(url, headers=headers, json=body)
    return response_result(payload, started, model, url, response)


async def test_anthropic(
    payload: ProviderTestRequest,
    base_url: str,
    model: str,
    api_key: str,
    started: float,
) -> ProviderTestResult:
    if not base_url:
        raise ValueError("API Base URL is required.")
    if not api_key:
        raise ValueError("API Key is required.")

    url = f"{base_url}/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "max_tokens": 8,
        "messages": [{"role": "user", "content": "Reply with the single word: pong"}],
    }
    async with httpx.AsyncClient(timeout=payload.timeout_seconds) as client:
        response = await client.post(url, headers=headers, json=body)
    return response_result(payload, started, model, url, response)


async def test_gemini(
    payload: ProviderTestRequest,
    base_url: str,
    model: str,
    api_key: str,
    started: float,
) -> ProviderTestResult:
    if not base_url:
        raise ValueError("API Base URL is required.")
    if not api_key:
        raise ValueError("API Key is required.")

    query = urlencode({"key": api_key})
    url = f"{base_url}/models/{model}:generateContent?{query}"
    body = {"contents": [{"parts": [{"text": "Reply with the single word: pong"}]}]}
    async with httpx.AsyncClient(timeout=payload.timeout_seconds) as client:
        response = await client.post(url, json=body)
    safe_url = f"{base_url}/models/{model}:generateContent?key=***"
    return response_result(payload, started, model, safe_url, response)


async def test_ollama(
    payload: ProviderTestRequest,
    base_url: str,
    model: str,
    started: float,
) -> ProviderTestResult:
    if not base_url:
        raise ValueError("Ollama Base URL is required.")

    url = f"{base_url}/api/generate"
    body = {"model": model, "prompt": "Reply with the single word: pong", "stream": False}
    async with httpx.AsyncClient(timeout=payload.timeout_seconds) as client:
        response = await client.post(url, json=body)
    return response_result(payload, started, model, url, response)


async def test_dashscope_voice(
    payload: ProviderTestRequest,
    model: str,
    api_key: str,
    started: float,
) -> ProviderTestResult:
    if not api_key:
        raise ValueError("API Key is required.")

    compatible_url = str((payload.config or {}).get("compatible_base_url") or "").strip()
    if compatible_url:
        return await test_openai_compatible(
            payload,
            normalize_base_url(compatible_url),
            model or "qwen-plus",
            api_key,
            started,
        )

    # Validate DashScope credentials (same key used by ASR / MAAS voice).
    return await test_embedding(payload, "text-embedding-v4", api_key, started)


async def test_embedding(
    payload: ProviderTestRequest,
    model: str,
    api_key: str,
    started: float,
) -> ProviderTestResult:
    if not api_key:
        raise ValueError("API Key is required.")

    from http import HTTPStatus

    from dashscope import TextEmbedding

    from app.services.dashscope_client import apply_dashscope_config

    workspace_id = str((payload.config or {}).get("workspace_id") or "")
    if payload.api_base_url:
        os.environ["DASHSCOPE_HTTP_BASE_URL"] = payload.api_base_url.rstrip("/")
    apply_dashscope_config()
    dimension = int((payload.config or {}).get("dimension") or 1024)
    response = TextEmbedding.call(
        model=model or "text-embedding-v4",
        input="AinerSpeak provider connectivity test",
        dimension=dimension,
        api_key=api_key,
        workspace=workspace_id or None,
    )
    ok = response.status_code == HTTPStatus.OK
    preview = str(getattr(response, "output", ""))[:500]
    return build_result(
        payload=payload,
        started=started,
        ok=ok,
        model=model or "text-embedding-v4",
        message="Embedding provider connection succeeded." if ok else "Embedding provider failed.",
        request_url=payload.api_base_url or "dashscope://text-embedding",
        response_preview=preview,
        error="" if ok else preview,
    )


def response_result(
    payload: ProviderTestRequest,
    started: float,
    model: str,
    url: str,
    response: httpx.Response,
) -> ProviderTestResult:
    preview = response.text[:500]
    ok = 200 <= response.status_code < 300
    return build_result(
        payload=payload,
        started=started,
        ok=ok,
        model=model,
        message="Provider connection succeeded." if ok else f"Provider returned HTTP {response.status_code}.",
        request_url=url,
        response_preview=preview,
        error="" if ok else preview,
    )


def build_result(
    payload: ProviderTestRequest,
    started: float,
    ok: bool,
    model: str,
    message: str,
    request_url: str = "",
    response_preview: str = "",
    error: str = "",
) -> ProviderTestResult:
    return ProviderTestResult(
        ok=ok,
        provider_name=payload.provider_name,
        provider_type=payload.provider_type,
        model_name=model,
        latency_ms=int((perf_counter() - started) * 1000),
        message=message,
        request_url=request_url,
        response_preview=response_preview,
        error=error,
    )


def normalize_provider_key(provider_name: str) -> str:
    return provider_name.strip().lower().replace(" ", "-").replace("_", "-")


def normalize_base_url(base_url: str) -> str:
    return base_url.strip().rstrip("/")
