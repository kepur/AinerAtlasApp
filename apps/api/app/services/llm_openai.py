from __future__ import annotations

import json
import logging
import re
import time
import asyncio

from openai import AsyncOpenAI, APIError, APITimeoutError, RateLimitError

from app.schemas import ConversationAIResult, GrammarTip, ProfileRead
from app.services.llm import LLMProvider, language_name

logger = logging.getLogger(__name__)

DIALOGUE_SYSTEM_PROMPT = """\
You are AinerSpeak — a language partner helping the user improve their {target_language_name}. \
Have a REAL conversation in {target_language_name}, correct mistakes, and explain WHY in {explanation_language_name}.

Native: {native_language_name} | Target: {target_language_name} | Level: {user_level} | \
Explain in: {explanation_language_name}

Each turn includes topic + mode in the user message. Adapt your style:
- socratic: thoughtful follow-up questions
- debate: respectful counterpoints and probing
- coach: practical tips and encouragement
- free-talk / voice-realtime: natural chat first, coaching only when helpful
- devils_advocate: deliberately take the opposite side and challenge assumptions
- information_collector: structured interview to gather background and goals
- debate_training: guide multi-round debate with feedback
- role_simulation: play a specific character based on topic

## Critical Rules
- Your main reply (main_reply_target) MUST be in {target_language_name}.
- grammar_tips MUST analyze {target_language_name} grammar, NOT {native_language_name}. \
Example: if the user said "I go yesterday", point out "Simple past: 'went' not 'go'".
- patterns: list useful {target_language_name} sentence patterns the user can reuse.
- vocabulary: list useful {target_language_name} words/phrases from this turn.
- question / challenge: ask in {target_language_name} to keep the conversation going.
- Keep explanations in {explanation_language_name} so the user understands the grammar points.

{correction_block}

## Output — strict JSON only, no markdown fences
{{
  "main_reply_native": "Short summary in {explanation_language_name}",
  "main_reply_target": "Your reply in {target_language_name}",
  "user_input_translated": "",
  "user_input_versions": {{}},
  "question": "",
  "challenge": "",
  "suggested_expression": "",
  "grammar_tips": [],
  "patterns": [],
  "vocabulary": [],
  "expression_versions": {{}}{correction_json_extra}
}}
"""

CORRECTION_BLOCK = """\
The user wrote in {target_language_name}. In addition to the above, also:
- Correct any grammar, vocabulary, or naturalness issues.
- Provide a corrected version of the user's sentence.
- List each mistake with type, original text, corrected text, and explanation \
(in {native_language_name}).
"""

CORRECTION_JSON_EXTRA = """,
  "corrected_sentence": "...",
  "mistakes": [{{"type": "grammar|vocabulary|naturalness", "original": "...", "corrected": "...", "explanation": "..."}}]"""

# JSON output block appended to custom DB prompts so they always return the expected fields.
DIALOGUE_JSON_OUTPUT = """

## Output — strict JSON only, no markdown fences
{{
  "main_reply_native": "Short summary in {explanation_language_name}",
  "main_reply_target": "Your full reply in {target_language_name}",
  "user_input_translated": "",
  "user_input_versions": {{}},
  "question": "",
  "challenge": "",
  "suggested_expression": "",
  "grammar_tips": [],
  "patterns": [],
  "vocabulary": [],
  "expression_versions": {{}}{correction_json_extra}
}}"""

# Minimal JSON instruction appended to custom prompts that lack the word "json".
_JSON_INSTRUCTION_SUFFIX = (
    "\n\n## Output — strict JSON only, no markdown fences\n"
    "You MUST reply with a single valid JSON object. Do NOT wrap in ```json fences."
)


def _ensure_json_instruction(prompt: str) -> str:
    """Guarantee the prompt mentions 'json' so response_format=json_object works."""
    if re.search(r'\bjson\b', prompt, re.IGNORECASE):
        return prompt
    return prompt + _JSON_INSTRUCTION_SUFFIX


CHAT_REPLY_PROMPT = """\
You are AinerSpeak — a warm, curious language & thinking partner having a REAL conversation.
Native: {native_language_name} | Target: {target_language_name} | Level: {user_level}

## Your one job here
Reply with a SHORT, natural conversational turn (1-2 sentences) that keeps the dialogue going:
- React to what the user said, then gently probe their thinking or ask a follow-up.
- Reply in the SAME language the user wrote in, so the conversation feels natural \
(if they wrote in {native_language_name}, reply in {native_language_name}; \
if they wrote in {target_language_name}, reply in {target_language_name}).
- Be encouraging and human. NO grammar analysis, NO translations, NO lists, NO JSON.
- Output ONLY the conversational reply text. Nothing else.
"""

CHAT_V2_PROMPT = """\
You are AinerSpeak — a warm, sharp language partner helping the user improve their {target_language_name}.

Native: {native_language_name} | Target: {target_language_name} | Level: {user_level} | \
Explain in: {explanation_language_name}

## Your Task
1. Classify the user's input:
   - `input_language`: the language the user actually wrote in (e.g. "zh", "en")
   - `detected_intent`: one of:
     - `expression_learning` — user wrote in native language, wants to learn how to say it in {target_language_name}
     - `target_correction` — user wrote in {target_language_name}, needs correction & feedback
     - `free_chat` — general conversation in {target_language_name}
     - `meta_chat` — user is asking about the app, learning strategy, etc.

2. Produce a single KEY expression in {target_language_name}:
   - `main_expression`: ONE sentence, at most 18 words. This is the #1 thing the user should learn from this turn.
   - `meaning_native`: translation/explanation of main_expression in {explanation_language_name}

3. Provide 4 variants of the same idea:
   - `natural`: how a native speaker would casually say it
   - `spoken`: conversational / spoken style
   - `written`: formal written style
   - `advanced`: sophisticated / literary style

4. `why_this_expression`: 2-3 bullet points explaining the grammar/usage of main_expression.
   **CRITICAL: ONLY analyze {target_language_name} grammar. NEVER analyze {native_language_name} grammar.**
   Each item has `point` (short label in {explanation_language_name}) and `explanation` (in {explanation_language_name}). ALL explanations MUST be written in {explanation_language_name}.

5. If `detected_intent` is `target_correction`:
   - `corrected_sentence`: the corrected version of user's input
   - `mistakes`: list of {{type, original, corrected, explanation}}

6. `patterns`: 1-3 reusable sentence patterns from this turn (in {target_language_name}).
   Each has `pattern` (template with blanks), `example` (filled example), `add_to_crush` (true/false).

7. `vocabulary`: 3-5 useful {target_language_name} words/phrases from this turn.

8. `agents`: 3 short one-line analyses (each ≤ 25 words), all about {target_language_name}:
   - Grammar Agent: the core grammar structure of main_expression (explain in {explanation_language_name})
   - Native Expression Agent: a more natural / native-sounding alternative (explain in {explanation_language_name})
   - Thinking Coach: an encouragement or thinking prompt (in {explanation_language_name})

9. `next_question`: a follow-up question to keep the conversation going.
   - `target`: the question in {target_language_name}
   - `native`: a hint in {explanation_language_name} so user understands what to answer

{correction_block}

## Output — strict JSON only, no markdown fences
{{
  "input_language": "...",
  "detected_intent": "expression_learning|target_correction|free_chat|meta_chat",
  "main_expression": "One sentence, max 18 words in {target_language_name}",
  "meaning_native": "Translation in {explanation_language_name}",
  "variants": {{
    "natural": "...",
    "spoken": "...",
    "written": "...",
    "advanced": "..."
  }},
  "why_this_expression": [
    {{"point": "...", "explanation": "..."}},
    {{"point": "...", "explanation": "..."}}
  ],
  "corrected_sentence": null,
  "mistakes": [],
  "patterns": [
    {{"pattern": "...", "example": "...", "add_to_crush": true}}
  ],
  "vocabulary": ["word1", "word2", "word3"],
  "agents": [
    {{"agent": "Grammar Agent", "result": "..."}},
    {{"agent": "Native Expression Agent", "result": "..."}},
    {{"agent": "Thinking Coach", "result": "..."}}
  ],
  "next_question": {{
    "target": "Question in {target_language_name}?",
    "native": "Hint in {explanation_language_name}"
  }}
}}
"""


FREEZE_SYSTEM_PROMPT = """\
You are AinerSpeak, an AI expression asset generator.

Given a conversation transcript, generate a comprehensive expression asset package in \
{target_language_name}.

## Output format — strict JSON only, no markdown fences
{{
  "main_reply_native": "A short summary in the user's native language of what was frozen",
  "main_reply_target": "A short summary in {target_language_name}",
  "question": "One follow-up question for the next version (native language)",
  "challenge": "A challenge to deepen the thought (native language)",
  "suggested_expression": "The best single expression from the asset",
  "grammar_tips": [{{"pattern": "...", "explanation": "...", "importance": 4}}],
    "patterns": ["pattern1", "pattern2"],
    "vocabulary": ["word1", "word2"],
    "keywords": ["keyword1", "keyword2"],
    "core_patterns": ["sentence frame 1", "sentence frame 2"],
    "grammar_structures": ["grammar structure 1", "grammar structure 2"],
    "facts": ["fact 1", "fact 2"],
    "values": ["value 1", "value 2"],
    "arguments": ["argument 1", "argument 2"],
  "expression_versions": {{
    "native_full": "Full thought in user's native language",
    "basic": "Simple {target_language_name} version",
    "natural_spoken": "How a native speaker would casually say it",
    "advanced": "Sophisticated {target_language_name} version",
    "written": "Formal written {target_language_name} version",
    "interview": "Version suitable for a job interview",
    "vlog": "Version for a casual video blog",
        "business": "Version for a business context",
        "one_line": "One-sentence summary",
        "speech_30s": "Version for a 30-second answer",
        "speech_1min": "Version for a 1-minute speech",
        "speech_3min": "Version for a 3-minute speech",
        "podcast": "Version for a podcast or long-form conversation",
        "social_chat": "Version for a casual social chat",
        "golden_quote": "Memorable quote version"
  }}
}}
"""


class OpenAICompatibleLLMProvider(LLMProvider):
    """LLM provider for any OpenAI-compatible API (OpenAI, DeepSeek, Qwen, Groq, etc.)."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model_name: str,
        *,
        provider_id: str | None = None,
        provider_name: str | None = None,
        timeout: float = 60,
    ) -> None:
        self.model_name = model_name
        self.provider_id = provider_id
        self.provider_name = provider_name or "openai-compatible"
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url.rstrip("/"),
            timeout=timeout,
        )
        self._stream_json_result: dict | None = None

    # ------------------------------------------------------------------
    # Usage tracking helpers
    # ------------------------------------------------------------------
    @property
    def last_usage(self) -> dict:
        """Return the usage dict from the most recent call (set after each API call)."""
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
            "provider_name": self.provider_name,
            "model_name": self.model_name,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "latency_ms": latency_ms,
            "status": status,
        }

    # ------------------------------------------------------------------
    # thought_dialogue
    # ------------------------------------------------------------------
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
        if explanation_code == target_language:
            explanation_code = native_language
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
            # Custom prompt from DB template: append correction block + JSON schema
            system_prompt = system_prompt_override
            if detect_target_language_input and correction_block:
                system_prompt = f"{system_prompt}\n\n{correction_block}"
            system_prompt = system_prompt + DIALOGUE_JSON_OUTPUT.format(
                explanation_language_name=explanation_name,
                target_language_name=target_name,
                correction_json_extra=correction_json_extra,
            )
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
            task="dialogue",
            conversation_history=conversation_history,
        )


    async def thought_dialogue_stream(
            self,
            user_input: str,
            profile: ProfileRead | None = None,
            native_language: str = "zh",
            target_language: str = "en",
            mode: str = "socratic",
            topic: str = "free-talk",
            detect_target_language_input: bool = False,
            system_prompt_override: str | None = None,
            memory_summary: str = "",
            **kwargs,
        ):
            level = profile.current_level if profile else "B1"
            native_name = language_name(native_language)
            target_name = language_name(target_language)
            explanation_code = profile.explanation_language if profile and profile.explanation_language else native_language
            if explanation_code == target_language:
                explanation_code = native_language
            explanation_name = language_name(explanation_code)

            main_system_prompt = f"""You are AinerSpeak — a warm, sharp language partner. Have a REAL multi-turn conversation.
    Native: {native_name} | Target: {target_name} | Level: {level}
    - Read the conversation history before replying.
    - Output ONLY the reply text in {target_name}. Do NOT output any analysis or JSON."""
            if memory_summary:
                main_system_prompt += f"\n\nMemory:\n{memory_summary}"

            user_content = f"[Topic: {topic}] [Mode: {mode}]\n\n{user_input}"
            conversation_history = kwargs.get("conversation_history") or []

            grammar_task = asyncio.create_task(self._grammar_agent(
                user_input, native_name, target_name, detect_target_language_input))
            expression_task = asyncio.create_task(
                self._expression_agent(user_input, target_name, explanation_name))
            coach_task = asyncio.create_task(self._coach_agent(
                user_input, native_name, target_name, mode, conversation_history))

            stream_gen = self._stream_text_only(
                main_system_prompt,
                user_content,
                task="dialogue_stream",
                conversation_history=conversation_history,
            )

            main_reply_text = ""
            async for chunk in stream_gen:
                main_reply_text += chunk
                yield chunk

            res_tuple = await asyncio.gather(
                grammar_task, expression_task, coach_task, return_exceptions=True
            )

            def safe_dict(res):
                if isinstance(res, Exception):
                    logger.error(f"Agent failed: {res}")
                    return {}
                return res or {}

            g_data = safe_dict(res_tuple[0])
            e_data = safe_dict(res_tuple[1])
            c_data = safe_dict(res_tuple[2])

            final_json = {
                "main_reply_target": main_reply_text.strip(),
                "main_reply_native": c_data.get("main_reply_native", ""),
                "user_input_translated": g_data.get("user_input_translated", ""),
                "user_input_versions": e_data.get("expression_versions", {}),
                "question": c_data.get("question", ""),
                "challenge": c_data.get("challenge", ""),
                "suggested_expression": e_data.get("suggested_expression", ""),
                "grammar_tips": g_data.get("grammar_tips", []),
                "patterns": g_data.get("patterns", []),
                "vocabulary": e_data.get("vocabulary", []),
                "expression_versions": e_data.get("expression_versions", {}),
                "corrected_sentence": g_data.get("corrected_sentence", ""),
                "mistakes": g_data.get("mistakes", [])
            }

            yield "\n\n---JSON_ANALYSIS---\n"
            import json
            yield json.dumps(final_json)

    # ------------------------------------------------------------------
    # chat_reply_stream — fast conversational reply (phase 1)
    # ------------------------------------------------------------------
    async def chat_reply_stream(
        self,
        user_input: str,
        profile: ProfileRead | None = None,
        native_language: str = "zh",
        target_language: str = "en",
        mode: str = "socratic",
        topic: str = "free-talk",
        *,
        memory_summary: str = "",
        conversation_history: list[dict[str, str]] | None = None,
        **kwargs,
    ):
        level = profile.current_level if profile else "B1"
        native_name = language_name(native_language)
        target_name = language_name(target_language)

        system_prompt = CHAT_REPLY_PROMPT.format(
            native_language_name=native_name,
            target_language_name=target_name,
            user_level=level,
        )
        if memory_summary:
            system_prompt = f"{system_prompt}\n\nUser memory:\n{memory_summary}"

        user_content = f"[Topic: {topic}] [Mode: {mode}]\n\n{user_input}"

        async for chunk in self._stream_text_only(
            system_prompt,
            user_content,
            task="chat_reply_stream",
            conversation_history=conversation_history or [],
        ):
            yield chunk

    # ------------------------------------------------------------------
    # chat_v2 — single-call structured JSON
    # ------------------------------------------------------------------
    async def chat_v2(
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
        conversation_history: list[dict[str, str]] | None = None,
    ) -> dict:
        level = profile.current_level if profile else "B1"
        native_name = language_name(native_language)
        target_name = language_name(target_language)
        explanation_code = profile.explanation_language if profile and profile.explanation_language else native_language
        if explanation_code == target_language:
            explanation_code = native_language
        explanation_name = language_name(explanation_code)

        if detect_target_language_input:
            correction_block = CORRECTION_BLOCK.format(
                target_language_name=target_name,
                native_language_name=explanation_name,
            )
        else:
            correction_block = ""

        system_prompt = CHAT_V2_PROMPT.format(
            native_language_name=native_name,
            target_language_name=target_name,
            explanation_language_name=explanation_name,
            user_level=level,
            correction_block=correction_block,
        )

        if memory_summary:
            system_prompt = f"{system_prompt}\n\nUser memory:\n{memory_summary}"

        user_content = f"[Topic: {topic}] [Mode: {mode}]\n\n{user_input}"

        safe_prompt = _ensure_json_instruction(system_prompt)
        started = time.perf_counter()
        messages: list[dict[str, str]] = [{"role": "system", "content": safe_prompt}]
        if conversation_history:
            for turn in conversation_history:
                role = turn.get("role", "user")
                content = (turn.get("content") or "").strip()
                if role in {"user", "assistant"} and content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_content})

        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            latency_ms = int((time.perf_counter() - started) * 1000)
            usage = response.usage
            self._record_usage(
                tokens_input=usage.prompt_tokens if usage else 0,
                tokens_output=usage.completion_tokens if usage else 0,
                latency_ms=latency_ms,
            )
            raw = response.choices[0].message.content or "{}"
            return _parse_json(raw)
        except APIError as exc:
            if getattr(exc, "status_code", 0) == 400 and "json" in str(exc).lower():
                logger.warning("Provider rejected json_object for chat_v2, retrying plain: %s", exc)
                response = await self._client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2048,
                )
                latency_ms = int((time.perf_counter() - started) * 1000)
                usage = response.usage
                self._record_usage(
                    tokens_input=usage.prompt_tokens if usage else 0,
                    tokens_output=usage.completion_tokens if usage else 0,
                    latency_ms=latency_ms,
                )
                raw = response.choices[0].message.content or "{}"
                return _parse_json(raw)
            self._record_usage(latency_ms=int((time.perf_counter() - started) * 1000), status="api_error")
            raise
        except Exception:
            self._record_usage(latency_ms=int((time.perf_counter() - started) * 1000), status="error")
            raise

    # ------------------------------------------------------------------
    # explain_token — quick word/phrase gloss for the TokenExplainSheet
    # ------------------------------------------------------------------
    async def explain_token(
        self,
        token: str,
        *,
        context: str = "",
        native_language: str = "zh",
        target_language: str = "en",
    ) -> dict:
        native_name = language_name(native_language)
        target_name = language_name(target_language)
        system_prompt = (
            f"You explain a single {target_name} word or phrase to a {native_name} learner. "
            f"Reply in {native_name} for meaning/usage. Output strict JSON only.\n"
            '{{"token": "...", "part_of_speech": "...", "meaning": "...", '
            '"usage": "...", "example": "one short {target} example sentence"}}'
        ).replace("{target}", target_name)
        user_content = token if not context else f"Word: {token}\nContext: {context}"
        started = time.perf_counter()
        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": _ensure_json_instruction(system_prompt)},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.4,
                max_tokens=400,
                response_format={"type": "json_object"},
            )
            usage = response.usage
            self._record_usage(
                tokens_input=usage.prompt_tokens if usage else 0,
                tokens_output=usage.completion_tokens if usage else 0,
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
            data = _parse_json(response.choices[0].message.content or "{}")
            data.setdefault("token", token)
            return data
        except Exception:
            self._record_usage(latency_ms=int((time.perf_counter() - started) * 1000), status="error")
            raise

    # ------------------------------------------------------------------
    # complete_json — generic structured JSON completion (games, tools, …)
    # ------------------------------------------------------------------
    async def complete_json(
        self,
        system_prompt: str,
        user_content: str,
        *,
        temperature: float = 0.7,
        max_tokens: int = 1400,
    ) -> dict:
        started = time.perf_counter()
        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": _ensure_json_instruction(system_prompt)},
                    {"role": "user", "content": user_content},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            usage = response.usage
            self._record_usage(
                tokens_input=usage.prompt_tokens if usage else 0,
                tokens_output=usage.completion_tokens if usage else 0,
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
            return _parse_json(response.choices[0].message.content or "{}")
        except Exception:
            self._record_usage(latency_ms=int((time.perf_counter() - started) * 1000), status="error")
            raise

    # ------------------------------------------------------------------
    # complete_json_stream — stream JSON tokens, yield chunks + final dict
    # ------------------------------------------------------------------
    async def complete_json_stream(
        self,
        system_prompt: str,
        user_content: str,
        *,
        temperature: float = 0.7,
        max_tokens: int = 1400,
    ):
        """Stream JSON from the LLM chunk by chunk, yield text tokens.

        Yields:
            str — each text token from the stream
        At the end, the accumulated JSON dict is set as ``self._stream_json_result``,
        and a final marker ``___STREAM_JSON_DONE___`` is yielded so callers know
        parsing is complete.
        """
        started = time.perf_counter()
        buffer = ""
        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": _ensure_json_instruction(system_prompt)},
                    {"role": "user", "content": user_content},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
                stream=True,
            )
            usage = None
            async for chunk in response:
                # Streaming chunks may have an empty choices list (e.g. the final
                # usage-only chunk), so guard before indexing.
                if not getattr(chunk, "choices", None):
                    usage = getattr(chunk, "usage", None) or usage
                    continue
                token = chunk.choices[0].delta.content or ""
                if token:
                    buffer += token
                    yield token
            self._record_usage(
                tokens_input=usage.prompt_tokens if usage else 0,
                tokens_output=usage.completion_tokens if usage else 0,
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
        except Exception as exc:
            self._record_usage(latency_ms=int((time.perf_counter() - started) * 1000), status="error")
            logger.error("LLM streaming JSON error: %s", exc)
            raise

        # Store the parsed result for the caller to retrieve
        self._stream_json_result = _parse_json(buffer)
        yield "___STREAM_JSON_DONE___"

    # ------------------------------------------------------------------
    # generate_expression_asset
    # ------------------------------------------------------------------
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
            system_prompt = FREEZE_SYSTEM_PROMPT.format(
                target_language_name=target_name,
            )

        user_content = f"Title: {title}\n\nConversation transcript:\n{source_text}"

        return await self._call_llm(system_prompt, user_content, task="thought_freeze")

    # ------------------------------------------------------------------

    async def _stream_text_only(
        self,
        system_prompt: str,
        user_content: str,
        task: str,
        *,
        conversation_history: list[dict[str, str]] | None = None,
    ):
        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            for turn in conversation_history:
                role = turn.get("role", "user")
                content = (turn.get("content") or "").strip()
                if role in {"user", "assistant"} and content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_content})

        try:
            started = time.perf_counter()
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                stream=True,
            )
            async for chunk in response:
                content = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else ""
                if content:
                    yield content
            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record_usage(latency_ms=latency_ms)
        except Exception as exc:
            logger.error("LLM streaming error in text only: %s", exc)
            raise

    async def _grammar_agent(self, text: str, native: str, target: str, detect: bool):
        prompt = f"Analyze grammar. Source language might be {native} or {target}. Output strict JSON.\n"
        if detect:
            prompt += f'If in {target}, fix mistakes: {{"corrected_sentence": "...", "mistakes": [{{"type":"grammar|vocabulary|naturalness", "original":"...", "corrected":"...", "explanation":"..."}}]}}.\n'
        prompt += f'Also provide grammar_tips: [{{"pattern":"...", "explanation":"..."}}], patterns: ["..."], user_input_translated: "translation in {target}".'
        prompt = _ensure_json_instruction(prompt)
        res = await self._call_llm(prompt, text, task="grammar_agent")
        return res.model_dump() if hasattr(res, 'model_dump') else {}

    async def _expression_agent(self, text: str, target: str, explanation: str):
        prompt = f"Generate alternative expressions in {target} for the user input. Provide explanations in {explanation}. Output strict JSON.\n"
        prompt += f'Format: {{"expression_versions": {{"basic":"...", "natural_spoken":"...", "advanced":"...", "written":"..."}}, "vocabulary": ["word1", "word2"], "suggested_expression": "most natural version in {target}"}}'
        prompt = _ensure_json_instruction(prompt)
        res = await self._call_llm(prompt, text, task="expression_agent")
        return res.model_dump() if hasattr(res, 'model_dump') else {}

    async def _coach_agent(self, text: str, native: str, target: str, mode: str, history: list):
        prompt = f"You are a conversation coach. Mode: {mode}. Read the input and generate a follow-up question and a challenge in {target} (or {native} if appropriate). Also generate a brief native translation of the assistant\'s hypothetical reply in {native}. Output strict JSON.\n"
        prompt += f'Format: {{"question": "...", "challenge": "...", "main_reply_native": "..."}}'
        prompt = _ensure_json_instruction(prompt)
        res = await self._call_llm(prompt, text, task="coach_agent", conversation_history=history[-4:])
        return res.model_dump() if hasattr(res, 'model_dump') else {}

    # ------------------------------------------------------------------
    # Core LLM call
    # ------------------------------------------------------------------
    async def _call_llm_stream(
        self,
        system_prompt: str,
        user_content: str,
        task: str,
        *,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> AsyncGenerator[str, None]:
        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            for turn in conversation_history:
                role = turn.get("role", "user")
                content = (turn.get("content") or "").strip()
                if role in {"user", "assistant"} and content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_content})

        try:
            started = time.perf_counter()
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                stream=True,
            )
            buffer = ""
            json_buffer = ""
            json_phase = False
            delimiter = "---JSON_ANALYSIS---"
            async for chunk in response:
                content = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else ""
                if content:
                    if json_phase:
                        json_buffer += content
                    else:
                        buffer += content
                        if delimiter in buffer:
                            json_phase = True
                            parts = buffer.split(delimiter, 1)
                            safe_text = parts[0]
                            if safe_text:
                                yield safe_text
                            json_buffer = parts[1]
                        else:
                            # hold back the length of the delimiter just in case we are in the middle of it
                            if len(buffer) > len(delimiter):
                                yield_len = len(buffer) - len(delimiter)
                                yield buffer[:yield_len]
                                buffer = buffer[yield_len:]
            
            # if we never hit json_phase, flush the rest of buffer
            if not json_phase and buffer:
                yield buffer
            
            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record_usage(latency_ms=latency_ms)
            
            yield "\n\n---JSON_ANALYSIS---\n"
            
            data = _parse_json(json_buffer)
            import json
            yield json.dumps(data)
            
        except Exception as exc:
            logger.error("LLM streaming error: %s", exc)
            raise

    async def _call_llm(
        self,
        system_prompt: str,
        user_content: str,
        task: str,
        *,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> ConversationAIResult:
        # Ensure the prompt mentions "json" so response_format=json_object is valid
        safe_prompt = _ensure_json_instruction(system_prompt)

        started = time.perf_counter()
        messages: list[dict[str, str]] = [{"role": "system", "content": safe_prompt}]
        if conversation_history:
            for turn in conversation_history:
                role = turn.get("role", "user")
                content = (turn.get("content") or "").strip()
                if role in {"user", "assistant"} and content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_content})
        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            latency_ms = int((time.perf_counter() - started) * 1000)

            usage = response.usage
            self._record_usage(
                tokens_input=usage.prompt_tokens if usage else 0,
                tokens_output=usage.completion_tokens if usage else 0,
                latency_ms=latency_ms,
            )

            raw = response.choices[0].message.content or "{}"
            data = _parse_json(raw)
            return _build_result(data)

        except APIError as exc:
            # Graceful fallback: if the provider rejects json_object mode (e.g.
            # older models), retry without response_format constraint.
            if getattr(exc, "status_code", 0) == 400 and "json" in str(exc).lower():
                logger.warning(
                    "Provider rejected response_format=json_object, retrying without it: %s",
                    exc,
                )
                return await self._call_llm_plain(messages, started)
            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record_usage(latency_ms=latency_ms, status="api_error")
            logger.error("LLM API error: %s", exc)
            raise
        except APITimeoutError as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record_usage(latency_ms=latency_ms, status="timeout")
            logger.error("LLM timeout after %dms: %s", latency_ms, exc)
            raise
        except RateLimitError as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record_usage(latency_ms=latency_ms, status="rate_limit")
            logger.error("LLM rate limit: %s", exc)
            raise

    async def _call_llm_plain(
        self,
        messages: list[dict[str, str]],
        started: float,
    ) -> ConversationAIResult:
        """Retry without response_format=json_object — relies on prompt instructions."""
        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            latency_ms = int((time.perf_counter() - started) * 1000)
            usage = response.usage
            self._record_usage(
                tokens_input=usage.prompt_tokens if usage else 0,
                tokens_output=usage.completion_tokens if usage else 0,
                latency_ms=latency_ms,
            )
            raw = response.choices[0].message.content or "{}"
            data = _parse_json(raw)
            return _build_result(data)
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record_usage(latency_ms=latency_ms, status="api_error")
            logger.error("LLM plain-mode API error: %s", exc)
            raise

    async def analyze_user_profile(self, user_data: str) -> dict:
        system_prompt = (
            "You are an expert AI Matchmaker and user profiler. "
            "Analyze the following user data (bio, topics, conversations) and output a comprehensive analysis of their personality, "
            "communication style, and dating/friendship preferences.\n"
            "You must respond in pure JSON format containing exactly these keys:\n"
            "- summary: A 2-paragraph summary string.\n"
            "- match_score: An integer score from 0-100 indicating profile completeness/attractiveness.\n"
            "- details: A dictionary containing key traits and preferences."
        )
        safe_prompt = _ensure_json_instruction(system_prompt)
        started = time.perf_counter()
        
        messages = [
            {"role": "system", "content": safe_prompt},
            {"role": "user", "content": user_data}
        ]
        
        try:
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            latency_ms = int((time.perf_counter() - started) * 1000)
            usage = response.usage
            self._record_usage(
                tokens_input=usage.prompt_tokens if usage else 0,
                tokens_output=usage.completion_tokens if usage else 0,
                latency_ms=latency_ms,
            )
            raw = response.choices[0].message.content or "{}"
            data = _parse_json(raw)
            return {
                "summary": data.get("summary", ""),
                "match_score": float(data.get("match_score", 0)),
                "details": data.get("details", {})
            }
        except Exception as e:
            logger.error(f"Error in analyze_user_profile: {e}")
            raise


# ------------------------------------------------------------------
# JSON parsing helpers
# ------------------------------------------------------------------
def _parse_json(raw: str) -> dict:
    """Best-effort parse JSON from LLM output, stripping markdown fences and <think> blocks if present."""
    text = raw.strip()
    # Strip <think>...</think> block if present
    think_start = text.find("<think>")
    think_end = text.find("</think>")
    if think_start != -1 and think_end != -1 and think_end > think_start:
        text = text[:think_start] + text[think_end + 8:]
        text = text.strip()

    if text.startswith("```"):
        first_nl = text.find("\n")
        first_nl = first_nl if first_nl != -1 else 3
        text = text[first_nl:].strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse LLM JSON, returning raw text as main_reply")
        return {"main_reply_native": text, "main_reply_target": text}


def _ensure_dict_str_str(value) -> dict:
    if isinstance(value, dict):
        return {str(k): str(v) for k, v in value.items()}
    if isinstance(value, list):
        res = {}
        for idx, item in enumerate(value):
            if isinstance(item, dict):
                key = item.get("variant") or item.get("type") or item.get("lang") or item.get("name") or f"version_{idx}"
                val = item.get("text") or item.get("content") or item.get("value") or str(item)
                res[str(key)] = str(val)
            else:
                res[f"version_{idx}"] = str(item)
        return res
    return {}


def _to_str_list(raw) -> list[str]:
    """Normalize a list that may contain strings or dicts to list[str]."""
    if not isinstance(raw, list):
        return []
    result = []
    for item in raw:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            # DeepSeek often returns {"word": "...", "meaning": "..."} or {"pattern": "...", ...}
            word = (
                item.get("word") or item.get("pattern") or item.get("expression")
                or item.get("text") or item.get("name") or item.get("content")
                or next(iter(item.values()), None)
            )
            if word:
                result.append(str(word))
        else:
            result.append(str(item))
    return result


def _build_result(data: dict) -> ConversationAIResult:
    tips_raw = data.get("grammar_tips", [])
    grammar_tips = []
    for tip in tips_raw:
        if isinstance(tip, dict):
            grammar_tips.append(
                GrammarTip(
                    pattern=tip.get("pattern", ""),
                    explanation=tip.get("explanation", ""),
                    importance=tip.get("importance", 3),
                )
            )

    vocab_raw = data.get("vocabulary", [])
    kw_raw = data.get("keywords", vocab_raw)
    return ConversationAIResult(
        main_reply_native=data.get("main_reply_native", ""),
        main_reply_target=data.get("main_reply_target", ""),
        user_input_translated=data.get("user_input_translated", ""),
        user_input_versions=_ensure_dict_str_str(data.get("user_input_versions", {})),
        question=data.get("question", ""),
        challenge=data.get("challenge", ""),
        suggested_expression=data.get("suggested_expression", ""),
        grammar_tips=grammar_tips,
        patterns=_to_str_list(data.get("patterns", [])),
        vocabulary=_to_str_list(vocab_raw),
        keywords=_to_str_list(kw_raw),
        core_patterns=_to_str_list(data.get("core_patterns", data.get("patterns", []))),
        grammar_structures=_to_str_list(data.get("grammar_structures", [])),
        facts=_to_str_list(data.get("facts", [])),
        values=_to_str_list(data.get("values", [])),
        arguments=_to_str_list(data.get("arguments", [])),
        expression_versions=_ensure_dict_str_str(data.get("expression_versions", {})),
        corrected_sentence=data.get("corrected_sentence"),
        mistakes=data.get("mistakes"),
    )
