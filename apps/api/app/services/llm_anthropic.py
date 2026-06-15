from __future__ import annotations

import logging
import time

import httpx

from app.schemas import ConversationAIResult, ProfileRead
from app.services.llm import LLMProvider, language_name
from app.services.llm_openai import (
    CORRECTION_BLOCK,
    CORRECTION_JSON_EXTRA,
    DIALOGUE_SYSTEM_PROMPT,
    FREEZE_SYSTEM_PROMPT,
    _build_result,
    _parse_json,
)

logger = logging.getLogger(__name__)


class AnthropicLLMProvider(LLMProvider):
    """LLM provider for Anthropic Claude models via the Messages API."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model_name: str,
        *,
        provider_id: str | None = None,
        timeout: float = 60,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.model_name = model_name
        self.provider_id = provider_id
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            transport=transport,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )

    @property
    def last_usage(self) -> dict:
        return getattr(self, "_last_usage", {})

    def _record_usage(
        self,
        *,
        tokens_input: int = 0,
        tokens_output: int = 0,
        latency_ms: int = 0,
        status: str = "ok",
    ) -> None:
        self._last_usage = {
            "provider_id": self.provider_id,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "latency_ms": latency_ms,
            "status": status,
        }

    async def thought_dialogue(
        self,
        user_input: str,
        profile: ProfileRead | None,
        native_language: str,
        target_language: str,
        mode: str,
        topic: str,
        *,
        detect_target_language_input: bool = False,
        system_prompt_override: str | None = None,
        memory_summary: str = "",
        **kwargs,
    ) -> ConversationAIResult:
        level = profile.current_level if profile else "B1"
        native_name = language_name(native_language)
        target_name = language_name(target_language)
        explanation_code = profile.explanation_language if profile and profile.explanation_language else native_language
        explanation_name = language_name(explanation_code)

        if detect_target_language_input:
            correction_block = CORRECTION_BLOCK.format(
                target_language_name=target_name,
                native_language_name=explanation_name,
            )
            correction_json_extra = CORRECTION_JSON_EXTRA
        else:
            correction_block = ""
            correction_json_extra = ""

        if system_prompt_override:
            # Custom prompt from DB template: inject correction block if needed
            system_prompt = system_prompt_override
            if detect_target_language_input and correction_block:
                system_prompt = f"{system_prompt}\n\n{correction_block}"
        else:
            system_prompt = DIALOGUE_SYSTEM_PROMPT.format(
                native_language_name=native_name,
                target_language_name=target_name,
                explanation_language_name=explanation_name,
                user_level=level,
                correction_block=correction_block,
                correction_json_extra=correction_json_extra,
            )

        if memory_summary:
            system_prompt = f"{system_prompt}\n\n{memory_summary}"

        user_content = f"[Topic: {topic}] [Mode: {mode}]\n\n{user_input}"
        conversation_history = kwargs.get("conversation_history") or []
        return await self._call_llm(
            system_prompt,
            user_content,
            conversation_history=conversation_history,
        )

    async def generate_expression_asset(
        self,
        source_text: str,
        target_language: str,
        title: str,
        *,
        system_prompt_override: str | None = None,
    ) -> ConversationAIResult:
        target_name = language_name(target_language)
        if system_prompt_override:
            system_prompt = system_prompt_override
        else:
            system_prompt = FREEZE_SYSTEM_PROMPT.format(target_language_name=target_name)

        user_content = f"Title: {title}\n\nConversation transcript:\n{source_text}"
        return await self._call_llm(system_prompt, user_content)

    async def _call_llm(
        self,
        system_prompt: str,
        user_content: str,
        *,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> ConversationAIResult:
        started = time.perf_counter()
        messages: list[dict[str, str]] = []
        if conversation_history:
            for turn in conversation_history:
                role = turn.get("role", "user")
                content = (turn.get("content") or "").strip()
                if role in {"user", "assistant"} and content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_content})
        try:
            response = await self._client.post(
                "/v1/messages",
                json={
                    "model": self.model_name,
                    "system": system_prompt,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2048,
                },
            )
            latency_ms = int((time.perf_counter() - started) * 1000)
            response.raise_for_status()

            payload = response.json()
            usage = payload.get("usage", {})
            self._record_usage(
                tokens_input=usage.get("input_tokens", 0),
                tokens_output=usage.get("output_tokens", 0),
                latency_ms=latency_ms,
            )

            raw = _extract_text_content(payload.get("content", []))
            return _build_result(_parse_json(raw))
        except httpx.TimeoutException as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record_usage(latency_ms=latency_ms, status="timeout")
            logger.error("Anthropic timeout after %dms: %s", latency_ms, exc)
            raise
        except httpx.HTTPStatusError as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            status_name = "rate_limit" if exc.response.status_code == 429 else "api_error"
            self._record_usage(latency_ms=latency_ms, status=status_name)
            logger.error("Anthropic API error %s: %s", exc.response.status_code, exc)
            raise


def _extract_text_content(content_blocks: list[dict]) -> str:
    parts: list[str] = []
    for block in content_blocks:
        if block.get("type") == "text" and block.get("text"):
            parts.append(block["text"])
    return "\n".join(parts)