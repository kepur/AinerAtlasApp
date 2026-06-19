from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decrypt_api_key
from app.schemas import ConversationAIResult, GrammarTip, ProfileRead

logger = logging.getLogger(__name__)

LLM_UNAVAILABLE_MESSAGE = (
    "LLM 未连接：请在 Admin 后台配置并测试 LLM Provider，或检查 API Key 是否有效。"
)


class LLMUnavailableError(Exception):
    """Raised when no real LLM provider is configured or all providers failed."""

    def __init__(self, message: str = LLM_UNAVAILABLE_MESSAGE, *, hint: str | None = None) -> None:
        self.message = message
        self.hint = hint
        super().__init__(message)


class LLMProvider(ABC):
    @abstractmethod
    async def thought_dialogue(
        self,
        user_input: str,
        profile: ProfileRead | None,
        native_language: str,
        target_language: str,
        mode: str,
        topic: str,
        **kwargs,
    ) -> ConversationAIResult:
        raise NotImplementedError

    @abstractmethod
    async def thought_dialogue_stream(
        self,
        user_input: str,
        profile: ProfileRead | None,
        native_language: str,
        target_language: str,
        mode: str,
        topic: str,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        raise NotImplementedError

    @abstractmethod
    async def generate_expression_asset(
        self,
        source_text: str,
        target_language: str,
        title: str,
        **kwargs,
    ) -> ConversationAIResult:
        raise NotImplementedError

    @abstractmethod
    async def chat_v2(
        self,
        user_input: str,
        profile: "ProfileRead | None",
        native_language: str,
        target_language: str,
        mode: str,
        topic: str,
        **kwargs,
    ) -> dict:
        raise NotImplementedError

    @abstractmethod
    async def analyze_user_profile(
        self,
        user_data: str,
        **kwargs,
    ) -> dict:
        raise NotImplementedError

    async def analyze_voice_coach(
        self,
        user_data: str,
        **kwargs,
    ) -> dict:
        """Voice Coach daily profile analysis. Falls back to analyze_user_profile."""
        return await self.analyze_user_profile(user_data, **kwargs)

    async def chat_reply_stream(
        self,
        user_input: str,
        profile: "ProfileRead | None" = None,
        native_language: str = "zh",
        target_language: str = "en",
        mode: str = "socratic",
        topic: str = "free-talk",
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Stream a fast conversational reply (phase 1 of Conversation-First).

        Default: degrade to a single-shot ``thought_dialogue`` call, yielded once.
        OpenAI-compatible and Mock providers override this with real streaming.
        """
        result = await self.thought_dialogue(
            user_input, profile, native_language, target_language, mode, topic, **kwargs
        )
        text = result.main_reply_target or result.main_reply_native or ""
        if text:
            yield text

    async def explain_token(
        self,
        token: str,
        *,
        context: str = "",
        native_language: str = "zh",
        target_language: str = "en",
    ) -> dict:
        """Explain a single word/phrase. Default: minimal echo (no LLM)."""
        return {"token": token, "meaning": "", "usage": "", "example": "", "part_of_speech": ""}

    async def complete_json(
        self,
        system_prompt: str,
        user_content: str,
        *,
        temperature: float = 0.7,
        max_tokens: int = 1400,
    ) -> dict:
        """Generic structured JSON completion. Default: not supported."""
        raise NotImplementedError("complete_json not supported by this provider")

    async def complete_json_stream(
        self,
        system_prompt: str,
        user_content: str,
        *,
        temperature: float = 0.7,
        max_tokens: int = 1400,
    ):
        """Streaming JSON completion. Yields text chunks, stores final dict.

        Default implementation falls back to single-shot complete_json.
        """
        result = await self.complete_json(
            system_prompt, user_content,
            temperature=temperature, max_tokens=max_tokens,
        )
        self._stream_json_result = result
        yield "___STREAM_JSON_DONE___"

    @property
    def last_usage(self) -> dict:
        return {}


class MockLLMProvider(LLMProvider):
    provider_name = "mock"

    @property
    def last_usage(self) -> dict:
        return {
            "provider_name": self.provider_name,
            "model_name": "local-deterministic",
            "tokens_input": 0,
            "tokens_output": 0,
            "latency_ms": 0,
            "status": "mock",
        }

    async def thought_dialogue(
        self,
        user_input: str,
        profile: ProfileRead | None,
        native_language: str,
        target_language: str,
        mode: str,
        topic: str,
        **kwargs,
    ) -> ConversationAIResult:
        level = profile.current_level if profile else "B1"
        target_name = language_name(target_language)
        memory_summary = kwargs.get("memory_summary", "")
        native_reply = (
            f"我理解你的核心想法：{user_input}。"
            f"从 {topic} 这个主题看，我会继续追问：这个观点背后你最重视的价值是什么？"
        )
        target_reply = (
            f"I understand your main point: {compact(user_input)}. "
            "What value matters most behind this opinion?"
        )
        suggested = (
            "It is not merely about making a practical choice, "
            "but about building a life that matches my values."
        )
        user_input_translated = "I want a life with more stability and freedom."
        if "稳定" not in user_input and "自由" not in user_input:
            user_input_translated = f"My point is: {compact(user_input)}."
        return ConversationAIResult(
            main_reply_native=native_reply,
            main_reply_target=target_reply,
            user_input_translated=user_input_translated,
            user_input_versions={
                "basic": user_input_translated,
                "natural_spoken": "I want a life that feels more stable and gives me more freedom.",
                "advanced": "What I am really looking for is a more stable life with greater freedom to choose how I live.",
            },
            question="如果条件变差，你是否仍然坚持这个选择？为什么？",
            challenge="请给这个观点补一个反例，看看它是否仍然成立。",
            suggested_expression=suggested,
            grammar_tips=[
                GrammarTip(
                    pattern="not merely... but...",
                    explanation='用于表达"不仅仅是 A，而是更深层的 B"。',
                    importance=5,
                ),
                GrammarTip(
                    pattern="What matters most is...",
                    explanation="适合表达价值排序和核心判断。",
                    importance=4,
                ),
            ],
            patterns=["not merely... but...", "What matters most is...", "a way to do sth"],
            vocabulary=["stability", "freedom", "dignity", "trade-off"],
            expression_versions={
                "basic": "I think this is important because it reflects my real values."
                f" ({target_name})",
                "natural_spoken": "For me, this is not just a practical issue."
                " It is about the kind of life I want.",
                "advanced": suggested,
                "written": "This choice should be understood not only as a practical decision, "
                "but also as an expression of long-term values and personal priorities.",
            },
        )

    async def chat_v2(
        self,
        user_input: str,
        profile: ProfileRead | None,
        native_language: str,
        target_language: str,
        mode: str,
        topic: str,
        **kwargs,
    ) -> dict:
        return {
            "input_language": native_language,
            "detected_intent": "expression_learning",
            "main_expression": "I want a life with more stability and freedom.",
            "meaning_native": "我想要一个更稳定、更自由的生活。",
            "variants": {
                "natural": "I just want a more stable and free life.",
                "spoken": "I'm looking for more stability and freedom in life.",
                "written": "I aspire to a life characterized by greater stability and freedom.",
                "advanced": "What I truly seek is a life that affords both stability and the freedom to grow.",
            },
            "why_this_expression": [
                {"point": "want + noun phrase", "explanation": "want 后面可以直接接名词短语，表达愿望。"},
                {"point": "with = 带有", "explanation": "with 在这里表示具有某种特征，修饰 life。"},
            ],
            "corrected_sentence": None,
            "mistakes": [],
            "patterns": [
                {"pattern": "I want a ... with more ...", "example": "I want a job with more flexibility.", "add_to_crush": True},
            ],
            "vocabulary": ["stability", "freedom", "aspire"],
            "agents": [
                {"agent": "Grammar Agent", "result": "Uses 'want + noun phrase' — a simple, correct structure."},
                {"agent": "Native Expression Agent", "result": "Natives often say 'I just want a stable, free life.'"},
                {"agent": "Thinking Coach", "result": "可以继续说说，稳定和自由哪个对你更重要？"},
            ],
            "next_question": {
                "target": "What does stability mean to you in daily life?",
                "native": "你觉得日常生活中的稳定具体指什么？",
            },
        }

    async def chat_reply_stream(
        self,
        user_input: str,
        profile: ProfileRead | None = None,
        native_language: str = "zh",
        target_language: str = "en",
        mode: str = "socratic",
        topic: str = "free-talk",
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        import asyncio
        reply = "听起来你有自己的想法，能再多说说背后的原因吗？"
        for ch in reply:
            yield ch
            await asyncio.sleep(0.01)

    async def explain_token(
        self,
        token: str,
        *,
        context: str = "",
        native_language: str = "zh",
        target_language: str = "en",
    ) -> dict:
        return {
            "token": token,
            "part_of_speech": "phrase",
            "meaning": f"{token} 的意思（示例）。",
            "usage": "用于日常表达，语气自然。",
            "example": f"I really like to {token}.",
        }

    async def thought_dialogue_stream(
        self,
        user_input: str,
        profile: ProfileRead | None,
        native_language: str,
        target_language: str,
        mode: str,
        topic: str,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        # Mock streaming by yielding words
        reply = "这是一条来自 Mock 接口的回复。This is a mock streaming response."
        import asyncio
        for char in reply:
            yield char
            await asyncio.sleep(0.02)
        # Yield the final JSON delimiter
        yield "\n\n---JSON_ANALYSIS---\n"
        import json
        yield json.dumps({
            "main_reply_target": "This is a mock streaming response.",
            "question": "What's next?",
            "challenge": "Can you try again?",
            "suggested_expression": "This is a test.",
            "grammar_tips": [],
            "patterns": [],
            "vocabulary": [],
            "expression_versions": {}
        })

    async def generate_expression_asset(
        self,
        source_text: str,
        target_language: str,
        title: str,
        **kwargs,
    ) -> ConversationAIResult:
        return ConversationAIResult(
            main_reply_native=f"已将《{title}》整理为表达资产。",
            main_reply_target="Your thought has been turned into a reusable expression asset.",
            question="下一版你想让它更像面试回答、演讲稿，还是日常聊天？",
            challenge="请补充一个真实例子，让这个观点更有说服力。",
            suggested_expression="This idea reflects a long-term value rather than a short-term preference.",
            grammar_tips=[
                GrammarTip(
                    pattern="rather than",
                    explanation="用于对比短期偏好和长期价值。",
                    importance=4,
                )
            ],
            patterns=["rather than", "reflects a long-term value", "from my perspective"],
            vocabulary=["long-term value", "preference", "perspective", "priority"],
            keywords=["long-term value", "stability", "freedom", "priority"],
            core_patterns=[
                "What matters most is...",
                "It is less about... and more about...",
                "I would still choose it even if...",
            ],
            grammar_structures=[
                "rather than",
                "not only... but also...",
                "even if + clause",
            ],
            facts=[
                "The speaker values stability and freedom over short-term gain.",
                "The choice is framed as a life decision, not only a practical one.",
            ],
            values=["stability", "freedom", "long-term fit"],
            arguments=[
                "A lower short-term return can still be worthwhile if the life context is better.",
                "Long-term priorities matter more than temporary convenience.",
            ],
            expression_versions={
                "native_full": source_text,
                "basic": "This is important to me because it reflects what I really value.",
                "natural_spoken": "To me, it is less about a quick result and more about the life I want to build.",
                "advanced": (
                    "From my perspective, this is not a temporary preference, "
                    "but a reflection of my long-term priorities."
                ),
                "written": (
                    "This view represents a deeper set of values and can serve as a foundation "
                    "for future decisions."
                ),
                "vlog": "If I am being honest, this is really about the kind of life I want, not just the next result.",
                "interview": "This matters to me because it shows how I make decisions under uncertainty.",
                "business": "Strategically, I would prioritize long-term operating stability over a short-term upside.",
                "one_line": "I care more about long-term stability and freedom than short-term convenience.",
                "speech_30s": "For me, this decision is not mainly about a quick win. It is about choosing a life that gives me more stability, freedom, and long-term alignment.",
                "speech_1min": "If I had to explain this in one minute, I would say the decision is ultimately about values. I am not simply comparing short-term benefits. I am asking what kind of life I want to build over the next several years, and stability and freedom rank higher for me than convenience.",
                "speech_3min": "When I think about this choice in depth, I do not judge it only by short-term gains. I look at whether it supports a stable life, more freedom, and better long-term priorities. Even if the immediate return is lower, I would still consider it worthwhile if it creates a more sustainable future.",
                "podcast": "One idea I keep coming back to is that good decisions are often about long-term fit, not just immediate reward.",
                "social_chat": "Honestly, I just want a life that feels more stable and free, even if it is not the easiest option at first.",
                "golden_quote": "A meaningful life is built by long-term values, not short-term convenience.",
            },
        )

    async def complete_json(
        self,
        system_prompt: str,
        user_content: str,
        *,
        temperature: float = 0.7,
        max_tokens: int = 1400,
    ) -> dict:
        return {
            "character_reply": "This is a mock romance reply from MockLLMProvider.",
            "emotion": "happy",
            "relationship_change": 5,
            "learning_point": "Use 'mock' to simulate.",
            # For detective:
            "ai_response": "Mock detective ai_response.",
            # For roleplay:
            "story": {},
            "feed_items": [{"type": "narrator", "text": "Mock narrator text"}]
        }

    async def analyze_user_profile(
        self,
        user_data: str,
        **kwargs,
    ) -> dict:
        return {
            "summary": "该用户偏好结构化表达，乐于探讨跨文化话题，适合与同样目标明确的学习者匹配。",
            "match_score": 72,
            "personality_type": "理性探索者",
            "mbti": "INTJ",
            "age_group": "25-34",
            "hobbies": ["阅读", "旅行", "摄影"],
            "match_tags": ["跨文化", "英语提升", "深度对话", "理性表达"],
            "details": {
                "communication_style": "清晰直接",
                "social_preference": "小圈子深聊",
                "learning_style": "场景化练习",
                "reasoning_depth": 68,
                "emotional_maturity": 62,
                "knowledge_breadth": 70,
                "values_summary": "重视成长与真实表达",
            },
        }

    async def analyze_voice_coach(self, user_data: str, **kwargs) -> dict:
        return {
            "user_summary": "用户正在提升英语口语，关注自然表达与跨文化话题，适合场景化对练。",
            "coach_identity": (
                "You are AinerSpeak Voice Coach — warm, proactive, and culturally aware. "
                "Lead with curiosity and help the user speak more naturally."
            ),
            "user_context_prompt": (
                "B1 English learner from China. Wants confident spoken English for work and travel. "
                "Responds well to follow-up questions and gentle corrections."
            ),
            "ability_snapshot": {
                "grammar": 62,
                "vocabulary": 58,
                "fluency": 55,
                "expression": 60,
                "overall_level": "B1",
            },
            "strengths": ["思路清晰", "愿意表达观点", "学习动力强"],
            "weaknesses_to_improve": ["时态一致性", "介词搭配", "口语流利度", "连接词使用"],
            "interests": ["欧洲生活", "职业发展", "旅行", "文化差异"],
            "focus_topics": ["daily conversation", "opinion expression", "work scenarios"],
            "opening_greeting": (
                "Hey! Good to see you — I've been thinking about our practice on expressing opinions. "
                "How has your week been?"
            ),
            "opening_questions": [
                "What's something interesting that happened to you recently?",
                "Is there a topic you'd like to debate or explore in English today?",
            ],
            "session_directives": (
                "Speak first. One question at a time. Recast errors naturally. "
                "Push slightly on grammar weak spots while keeping flow."
            ),
        }


class FallbackLLMProvider(LLMProvider):
    """Wraps multiple providers and tries them in order until one succeeds."""

    def __init__(self, providers: list[LLMProvider], db: Session | None = None) -> None:
        self._providers = providers
        self._active: LLMProvider | None = None
        self.db = db

    @property
    def providers(self) -> list[LLMProvider]:
        return self._providers

    @property
    def last_usage(self) -> dict:
        if self._active:
            return self._active.last_usage
        return {}

    def _record_llm_call(
        self,
        provider: LLMProvider,
        method_name: str,
        args: tuple,
        kwargs: dict,
        response: str | None,
        error: Exception | None,
        latency_ms: int,
    ) -> None:
        if not self.db:
            return
        try:
            from app.models import LLMCallLog
            import json
            from app.db.session import SessionLocal

            # Format prompt/inputs safely
            prompt_data = {}
            if args:
                prompt_data["args"] = [str(a)[:1000] for a in args]
            if kwargs:
                cleaned_kwargs = {}
                for k, v in kwargs.items():
                    if k == "profile" and v:
                        cleaned_kwargs[k] = {"user_id": getattr(v, "user_id", None)}
                    elif isinstance(v, (str, int, float, bool, list, dict)) or v is None:
                        cleaned_kwargs[k] = v
                    else:
                        cleaned_kwargs[k] = str(v)[:2000]
                prompt_data["kwargs"] = cleaned_kwargs

            prompt_str = json.dumps(prompt_data, ensure_ascii=False, default=str)[:50000]
            
            provider_name = getattr(provider, "provider_name", type(provider).__name__)
            model_name = getattr(provider, "model_name", "unknown")
            status = "success" if error is None else "failed"
            error_str = f"{type(error).__name__}: {str(error)}" if error else None
            if error_str:
                error_str = error_str[:10000]
            if response:
                response = response[:50000]

            with SessionLocal() as log_db:
                call_log = LLMCallLog(
                    provider_name=provider_name,
                    model_name=model_name,
                    method_name=method_name,
                    prompt=prompt_str,
                    response=response,
                    error=error_str,
                    status=status,
                    latency_ms=latency_ms,
                )
                log_db.add(call_log)
                log_db.commit()
        except Exception as log_exc:
            logger.error("Failed to record LLM call log to database: %s", log_exc)

    async def thought_dialogue(self, *args, **kwargs) -> ConversationAIResult:
        return await self._try_all("thought_dialogue", *args, **kwargs)

    async def generate_expression_asset(self, *args, **kwargs) -> ConversationAIResult:
        return await self._try_all("generate_expression_asset", *args, **kwargs)

    async def chat_v2(self, *args, **kwargs) -> dict:
        return await self._try_all("chat_v2", *args, **kwargs)

    async def explain_token(self, *args, **kwargs) -> dict:
        return await self._try_all("explain_token", *args, **kwargs)

    async def complete_json(self, *args, **kwargs) -> dict:
        return await self._try_all("complete_json", *args, **kwargs)

    async def complete_json_stream(self, *args, **kwargs):
        last_exc: Exception | None = None
        for provider in self._providers:
            start_time = time.perf_counter()
            chunks = []
            try:
                self._active = provider
                gen = provider.complete_json_stream(*args, **kwargs)
                async for chunk in gen:
                    chunks.append(chunk)
                    yield chunk
                # Ensure _stream_json_result is propagated
                if hasattr(provider, "_stream_json_result"):
                    self._stream_json_result = provider._stream_json_result
                
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                res_str = "".join(chunks)
                self._record_llm_call(provider, "complete_json_stream", args, kwargs, res_str, None, latency_ms)
                return
            except Exception as exc:  # noqa: BLE001
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                pname = type(provider).__name__
                logger.warning("Provider %s failed for complete_json_stream: %s", pname, exc)
                
                res_str = "".join(chunks) if chunks else None
                self._record_llm_call(provider, "complete_json_stream", args, kwargs, res_str, exc, latency_ms)
                
                last_exc = exc
                continue
        if last_exc:
            raise last_exc
        raise RuntimeError("No LLM providers available")

    async def analyze_user_profile(self, *args, **kwargs) -> dict:
        return await self._try_all("analyze_user_profile", *args, **kwargs)

    async def analyze_voice_coach(self, *args, **kwargs) -> dict:
        return await self._try_all("analyze_voice_coach", *args, **kwargs)

    async def thought_dialogue_stream(self, *args, **kwargs) -> AsyncGenerator[str, None]:
        last_exc: Exception | None = None
        for provider in self._providers:
            start_time = time.perf_counter()
            chunks = []
            try:
                self._active = provider
                gen = provider.thought_dialogue_stream(*args, **kwargs)
                async for chunk in gen:
                    chunks.append(chunk)
                    yield chunk
                
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                res_str = "".join(chunks)
                self._record_llm_call(provider, "thought_dialogue_stream", args, kwargs, res_str, None, latency_ms)
                return
            except Exception as exc:  # noqa: BLE001
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                pname = type(provider).__name__
                logger.warning("Provider %s failed for thought_dialogue_stream: %s", pname, exc)
                
                res_str = "".join(chunks) if chunks else None
                self._record_llm_call(provider, "thought_dialogue_stream", args, kwargs, res_str, exc, latency_ms)
                
                last_exc = exc
                continue
        if last_exc:
            raise last_exc
        raise RuntimeError("No LLM providers available")

    async def chat_reply_stream(self, *args, **kwargs) -> AsyncGenerator[str, None]:
        last_exc: Exception | None = None
        for provider in self._providers:
            start_time = time.perf_counter()
            chunks = []
            try:
                self._active = provider
                gen = provider.chat_reply_stream(*args, **kwargs)
                async for chunk in gen:
                    chunks.append(chunk)
                    yield chunk
                
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                res_str = "".join(chunks)
                self._record_llm_call(provider, "chat_reply_stream", args, kwargs, res_str, None, latency_ms)
                return
            except Exception as exc:  # noqa: BLE001
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                pname = type(provider).__name__
                logger.warning("Provider %s failed for chat_reply_stream: %s", pname, exc)
                
                res_str = "".join(chunks) if chunks else None
                self._record_llm_call(provider, "chat_reply_stream", args, kwargs, res_str, exc, latency_ms)
                
                last_exc = exc
                continue
        if last_exc:
            raise last_exc
        raise RuntimeError("No LLM providers available")

    async def _try_all(self, method_name: str, *args, **kwargs) -> Any:
        last_exc: Exception | None = None
        for provider in self._providers:
            start_time = time.perf_counter()
            try:
                self._active = provider
                result = await getattr(provider, method_name)(*args, **kwargs)
                
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                
                # Format result for logging
                res_str = None
                if result is not None:
                    if hasattr(result, "to_dict"):
                        res_str = str(result.to_dict())
                    elif hasattr(result, "dict"):
                        res_str = str(result.dict())
                    else:
                        res_str = str(result)
                
                self._record_llm_call(provider, method_name, args, kwargs, res_str, None, latency_ms)
                return result
            except Exception as exc:  # noqa: BLE001
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                pname = type(provider).__name__
                logger.warning("Provider %s failed for %s: %s", pname, method_name, exc)
                
                self._record_llm_call(provider, method_name, args, kwargs, None, exc, latency_ms)
                
                last_exc = exc
                continue
        if last_exc:
            raise last_exc
        raise RuntimeError("No LLM providers available")


def compact(text: str, limit: int = 120) -> str:
    normalized = " ".join(text.split())
    return normalized if len(normalized) <= limit else f"{normalized[:limit]}..."


def language_name(code: str) -> str:
    names = {
        "en": "English",
        "zh": "Chinese",
        "de": "German",
        "es": "Spanish",
        "fr": "French",
        "sr": "Serbian",
        "ja": "Japanese",
        "ko": "Korean",
    }
    return names.get(code, code)


# ------------------------------------------------------------------
# Provider registry — called from route handlers
# ------------------------------------------------------------------

OPENAI_COMPATIBLE_TYPES = {
    "openai", "deepseek", "qwen", "dashscope", "openrouter", "moonshot",
    "groq", "siliconflow", "openai-compatible",
}

ANTHROPIC_TYPES = {"anthropic", "claude"}
GEMINI_TYPES = {"gemini", "google", "google-ai"}

DEFAULT_BASE_URLS = {
    "anthropic": "https://api.anthropic.com",
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
    "openai": "https://api.openai.com/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "qwen": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "dashscope": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "moonshot": "https://api.moonshot.cn/v1",
    "groq": "https://api.groq.com/openai/v1",
}

DEFAULT_MODELS = {
    "anthropic": "claude-3-5-haiku-latest",
    "gemini": "gemini-1.5-flash",
    "openai": "gpt-4o-mini",
    "deepseek": "deepseek-v4-pro",
    "qwen": "qwen-plus",
    "dashscope": "qwen-plus",
    "openrouter": "openai/gpt-4o-mini",
    "moonshot": "moonshot-v1-8k",
    "groq": "llama-3.1-8b-instant",
}


def _decrypt_api_key(encrypted: str) -> str:
    return decrypt_api_key(encrypted)


def _normalize_provider_key(name: str) -> str:
    return name.strip().lower().replace(" ", "-").replace("_", "-")


def _normalize_openai_base_url(base_url: str, provider_key: str) -> str:
    cleaned = base_url.strip().rstrip("/")
    if not cleaned:
        return DEFAULT_BASE_URLS.get(provider_key, "")
    if provider_key in {"deepseek", "dk"} and cleaned.endswith("deepseek.com"):
        return f"{cleaned}/v1"
    if cleaned.endswith(("/v1", "/v1beta")):
        return cleaned
    return cleaned


def _build_llm_provider_from_row(row, model_override: str | None = None) -> LLMProvider | None:
    key = _normalize_provider_key(row.provider_name)
    if key in ("mock", "mock-voice"):
        return None

    api_key = _decrypt_api_key(row.api_key_encrypted)
    if not api_key:
        if row.api_key_encrypted:
            logger.warning(
                "LLM provider %s has encrypted key but decryption failed "
                "(check ENCRYPTION_KEY and re-save API key in Admin)",
                row.provider_name,
            )
        return None

    base_url = _normalize_openai_base_url(row.api_base_url or "", key)
    model = model_override or row.model_name or DEFAULT_MODELS.get(key, "gpt-4o-mini")

    if key in ANTHROPIC_TYPES:
        from app.services.llm_anthropic import AnthropicLLMProvider

        if not base_url:
            base_url = DEFAULT_BASE_URLS.get(key, "")
        return AnthropicLLMProvider(
            api_key=api_key,
            base_url=base_url,
            model_name=model,
            provider_id=row.id,
        )

    if key in GEMINI_TYPES:
        from app.services.llm_gemini import GeminiLLMProvider

        if not base_url:
            base_url = DEFAULT_BASE_URLS.get(key, "")
        return GeminiLLMProvider(
            api_key=api_key,
            base_url=base_url,
            model_name=model,
            provider_id=row.id,
        )

    if key in OPENAI_COMPATIBLE_TYPES or row.provider_type == "llm":
        from app.services.llm_openai import OpenAICompatibleLLMProvider

        if not base_url:
            base_url = DEFAULT_BASE_URLS.get(key, "")
        if not base_url:
            logger.warning("LLM provider %s skipped: missing API base URL", row.provider_name)
            return None
        return OpenAICompatibleLLMProvider(
            api_key=api_key,
            base_url=base_url,
            model_name=model,
            provider_id=row.id,
            provider_name=row.provider_name,
        )

    return None


def wrap_provider_with_logging(provider: LLMProvider, db: Session) -> LLMProvider:
    provider_class = type(provider)
    if provider_class.__name__.startswith("Logging"):
        return provider

    if isinstance(provider, FallbackLLMProvider):
        return provider

    class_name = f"Logging{provider_class.__name__}"

    def wrap_sync_or_async_method(method_name):
        original_method = getattr(provider_class, method_name, None)
        if not original_method:
            return None

        import inspect
        if inspect.isasyncgenfunction(original_method):
            async def wrapped_stream(self, *args, **kwargs):
                start_time = time.perf_counter()
                chunks = []
                fallback_logger = FallbackLLMProvider([], db=db)
                try:
                    gen = original_method(self, *args, **kwargs)
                    async for chunk in gen:
                        chunks.append(chunk)
                        yield chunk
                    latency_ms = int((time.perf_counter() - start_time) * 1000)
                    res_str = "".join(chunks)
                    fallback_logger._record_llm_call(self, method_name, args, kwargs, res_str, None, latency_ms)
                except Exception as exc:
                    latency_ms = int((time.perf_counter() - start_time) * 1000)
                    res_str = "".join(chunks) if chunks else None
                    fallback_logger._record_llm_call(self, method_name, args, kwargs, res_str, exc, latency_ms)
                    raise
            return wrapped_stream
        else:
            async def wrapped_method(self, *args, **kwargs):
                start_time = time.perf_counter()
                fallback_logger = FallbackLLMProvider([], db=db)
                try:
                    result = await original_method(self, *args, **kwargs)
                    latency_ms = int((time.perf_counter() - start_time) * 1000)
                    
                    res_str = None
                    if result is not None:
                        if hasattr(result, "to_dict"):
                            res_str = str(result.to_dict())
                        elif hasattr(result, "dict"):
                            res_str = str(result.dict())
                        else:
                            res_str = str(result)
                            
                    fallback_logger._record_llm_call(self, method_name, args, kwargs, res_str, None, latency_ms)
                    return result
                except Exception as exc:
                    latency_ms = int((time.perf_counter() - start_time) * 1000)
                    fallback_logger._record_llm_call(self, method_name, args, kwargs, None, exc, latency_ms)
                    raise
            return wrapped_method

    methods_to_wrap = [
        "thought_dialogue",
        "generate_expression_asset",
        "chat_v2",
        "explain_token",
        "complete_json",
        "complete_json_stream",
        "analyze_user_profile",
        "analyze_voice_coach",
        "thought_dialogue_stream",
        "chat_reply_stream",
    ]

    overrides = {}
    for m in methods_to_wrap:
        wrapped = wrap_sync_or_async_method(m)
        if wrapped:
            overrides[m] = wrapped

    try:
        logging_subclass = type(class_name, (provider_class,), overrides)
        provider.__class__ = logging_subclass
    except Exception:
        pass

    return provider


def get_llm_provider(
    hint: str = "mock",
    db: Session | None = None,
    *,
    allow_mock_fallback: bool | None = None,
) -> LLMProvider:
    """Build an LLM provider, reading from DB when available.

    Enabled DB providers are tried by priority. When ``hint`` names a specific
    provider (from Admin runtime routing), that provider is tried first.
    MockLLMProvider is only used when ``allow_mock_fallback`` is True (explicit
    ``hint=mock`` or dev/test opt-in).
    """
    hint_key = _normalize_provider_key(hint)
    if allow_mock_fallback is None:
        allow_mock_fallback = hint_key == "mock"

    if db is None:
        if allow_mock_fallback:
            return MockLLMProvider()
        raise LLMUnavailableError(hint=hint)

    from app.models import AIProvider

    rows = list(
        db.scalars(
            select(AIProvider)
            .where(AIProvider.enabled.is_(True), AIProvider.provider_type == "llm")
            .order_by(AIProvider.priority.asc())
        )
    )

    built: list[tuple[str, LLMProvider]] = []
    for row in rows:
        provider = _build_llm_provider_from_row(row)
        if provider:
            built.append((_normalize_provider_key(row.provider_name), provider))

    if hint_key not in {"", "mock", "auto"}:
        prioritized = [provider for name, provider in built if name == hint_key]
        rest = [provider for name, provider in built if name != hint_key]
        providers = prioritized + rest
    else:
        providers = [provider for _, provider in built]

    if not providers:
        if allow_mock_fallback:
            logger.warning("No real LLM provider available; using MockLLMProvider")
            return MockLLMProvider()
        raise LLMUnavailableError(hint=hint)

    if allow_mock_fallback:
        providers.append(MockLLMProvider())

    if hint_key not in {"", "mock", "auto"} and not any(name == hint_key for name, _ in built):
        logger.warning(
            "Preferred LLM provider %r unavailable; falling back to next real provider",
            hint,
        )

    if len(providers) == 1:
        provider = providers[0]
        if db is not None:
            provider = wrap_provider_with_logging(provider, db)
        return provider

    return FallbackLLMProvider(providers, db=db)


def require_llm_provider(hint: str, db: Session) -> LLMProvider:
    """Return a real LLM provider chain; never silently fall back to mock."""
    return get_llm_provider(hint, db, allow_mock_fallback=False)


def assert_real_llm_usage(provider: LLMProvider) -> dict:
    """Reject mock responses that slipped through the provider chain."""
    usage = getattr(provider, "last_usage", None) or {}
    if usage.get("status") == "mock" or usage.get("provider_name") == "mock":
        raise LLMUnavailableError()
    return usage


TASK_MODEL_HINTS = {
    "dialogue": {"prefer": "cheap", "fallback": "quality"},
    "dialogue_stream": {"prefer": "cheap", "fallback": "quality"},
    "grammar_agent": {"prefer": "cheap", "fallback": "quality"},
    "expression_agent": {"prefer": "cheap", "fallback": "quality"},
    "coach_agent": {"prefer": "cheap", "fallback": "quality"},
    "thought_freeze": {"prefer": "quality", "fallback": "cheap"},
    "pattern_mining": {"prefer": "cheap", "fallback": "quality"},
    "vocabulary_mining": {"prefer": "cheap", "fallback": "quality"},
    "topic_generation": {"prefer": "quality", "fallback": "cheap"},
    "match_explanation": {"prefer": "quality", "fallback": "cheap"},
    "group_summary": {"prefer": "quality", "fallback": "cheap"},
    "safety_check": {"prefer": "cheap", "fallback": "quality"},
    # Social Logic game tasks
    "game_ai_speech": {"prefer": "quality", "fallback": "cheap"},
    "game_ai_answer": {"prefer": "quality", "fallback": "cheap"},
    "game_challenge_hud": {"prefer": "quality", "fallback": "cheap"},
    "game_question": {"prefer": "quality", "fallback": "cheap"},
    "game_reasoning": {"prefer": "quality", "fallback": "cheap"},
    "game_summary": {"prefer": "quality", "fallback": "cheap"},
    "game_translate": {"prefer": "cheap", "fallback": "quality"},
    "game_vote_reason": {"prefer": "cheap", "fallback": "quality"},
}


def _resolve_model_for_task(db: Session, task_type: str, default_model: str) -> str:
    from app.models import AIProviderModel

    hint = TASK_MODEL_HINTS.get(task_type, {})
    prefer = hint.get("prefer", "cheap")

    models = list(
        db.scalars(
            select(AIProviderModel)
            .where(
                AIProviderModel.enabled.is_(True),
                AIProviderModel.task_types.contains([task_type]),
            )
            .order_by(AIProviderModel.priority.asc())
        )
    )

    if models:
        for m in models:
            if prefer == "quality" and m.cost_per_1k_input >= 0.001:
                return m.model_name
            elif prefer == "cheap" and m.cost_per_1k_input < 0.001:
                return m.model_name
        return models[0].model_name

    return default_model


def get_llm_provider_for_task(
    task_type: str,
    hint: str = "auto",
    db: Session | None = None,
    *,
    allow_mock_fallback: bool | None = None,
) -> LLMProvider:
    if db is None:
        return get_llm_provider(hint, db, allow_mock_fallback=allow_mock_fallback)

    from app.services.runtime_config import resolve_llm_provider_for_task

    if hint in {"auto", ""}:
        resolved_hint = resolve_llm_provider_for_task(task_type, db)
        if resolved_hint and resolved_hint != "auto":
            hint = resolved_hint

    provider = get_llm_provider(hint, db, allow_mock_fallback=allow_mock_fallback)

    if hasattr(provider, "model_name"):
        task_model = _resolve_model_for_task(db, task_type, provider.model_name)
        if task_model and task_model != provider.model_name:
            if isinstance(provider, FallbackLLMProvider):
                for p in provider.providers:
                    if hasattr(p, "model_name"):
                        p.model_name = task_model
            else:
                provider.model_name = task_model

    return provider


# Markers that identify a low-latency "flash" chat model.
_FAST_MODEL_MARKERS = ("flash", "mini", "fast", "lite", "turbo", "haiku", "nano")


def get_fast_llm_provider(
    db: Session | None,
    default_hint: str = "auto",
    *,
    allow_mock_fallback: bool | None = None,
) -> LLMProvider:
    """Return a provider backed by a low-latency *flash* model when one is
    configured, preferring a provider other than the quality default.

    Use for throwaway / flavor generation (a conversational reply turn, game
    flavor speeches) where time-to-first-token matters more than peak quality.
    Falls back to the default provider when no fast model exists, so callers get
    a zero-behaviour-change default.
    """
    if db is None:
        return get_llm_provider(default_hint, db, allow_mock_fallback=allow_mock_fallback)
    try:
        from app.models import AIProvider

        rows = list(db.scalars(select(AIProvider).where(AIProvider.enabled.is_(True))))
        candidates = [
            r for r in rows
            if any(m in (r.model_name or "").lower() for m in _FAST_MODEL_MARKERS)
        ]
        # Prefer a non-default provider (the default is the quality model we keep
        # for reasoning); stable secondary sort keeps the pick deterministic.
        candidates.sort(key=lambda r: (r.provider_name == default_hint, r.provider_name))
        if candidates:
            return get_llm_provider(
                candidates[0].provider_name, db, allow_mock_fallback=allow_mock_fallback,
            )
    except Exception:  # noqa: BLE001
        logger.warning("get_fast_llm_provider lookup failed; using default", exc_info=True)
    return get_llm_provider(default_hint, db, allow_mock_fallback=allow_mock_fallback)
