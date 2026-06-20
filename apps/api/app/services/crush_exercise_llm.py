"""LLM-generated Pattern Crush exercises via DashScope Qwen-Turbo / Plus."""

from __future__ import annotations

import json
import random
from typing import Any

from loguru import logger
from sqlalchemy.orm import Session

from app.models import UserMastery
from app.schemas import PracticeExercise
from app.services.dashscope_client import resolve_dashscope_api_key, resolve_dashscope_config
from app.services.practice import generate_exercise as generate_rule_exercise
from app.services.voice_platform_config import get_voice_platform_config


async def generate_exercise_llm(db: Session | None, item: UserMastery) -> PracticeExercise | None:
    cfg = get_voice_platform_config(db)
    if not cfg.get("crush_llm_enabled", True):
        return None
    if not resolve_dashscope_api_key(db):
        return None

    exercise_types = ["translate", "fix_error", "choose_natural"]
    exercise_type = random.choice(exercise_types)
    examples = item.examples or []
    example_line = examples[0] if examples else item.title

    system = (
        "You generate short language-learning crush-game exercises as JSON. "
        "Return ONLY valid JSON with keys: exercise_type, prompt, hint, correct_answer, options (array, optional)."
    )
    user = (
        f"Language: {item.language_code}\n"
        f"Pattern/title: {item.title}\n"
        f"Example: {example_line}\n"
        f"Exercise type: {exercise_type}\n"
        "Make the exercise practical and level-appropriate."
    )

    try:
        from openai import AsyncOpenAI

        ds_cfg = resolve_dashscope_config(db)
        api_key = resolve_dashscope_api_key(db)
        if not api_key:
            return None
        base_url = (
            ds_cfg.compatible_base_url
            if ds_cfg and ds_cfg.compatible_base_url
            else "https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        model = str(cfg.get("crush_llm_model") or "qwen-turbo")
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.7,
        )
        raw = resp.choices[0].message.content or ""

        text = str(raw).strip()
        if "{" not in text:
            return None
        chunk = text[text.index("{") : text.rindex("}") + 1]
        data: dict[str, Any] = json.loads(chunk)
        return PracticeExercise(
            exercise_type=str(data.get("exercise_type") or exercise_type),
            prompt=str(data.get("prompt") or ""),
            hint=str(data.get("hint") or ""),
            correct_answer=str(data.get("correct_answer") or item.title),
            options=data.get("options") if isinstance(data.get("options"), list) else None,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Crush LLM exercise generation failed: {}", exc)
        return None


async def generate_exercise_smart(db: Session | None, item: UserMastery) -> PracticeExercise:
    """Stable default: rule-based exercises during play; LLM runs only after a 10-item batch."""
    return generate_rule_exercise(item, exercise_type="choose_natural")


def _rule_grammar_batch_insights(results: list[dict[str, Any]]) -> dict[str, Any]:
    insights = []
    for row in results:
        title = str(row.get("title", ""))
        example = str(row.get("example", ""))
        correct = bool(row.get("correct"))
        if correct:
            explanation = f"「{title}」是更自然的表达。"
            tip = "记住这个句型在真实对话里的搭配方式。"
        else:
            picked = str(row.get("user_answer", ""))
            explanation = f"你选了「{picked or '?'}」，此处更自然的是「{title}」。"
            if example:
                explanation += f" 参考：{example}"
            tip = "比较各选项的语气与搭配，而不只看字面意思。"
        insights.append({"title": title, "correct": correct, "explanation": explanation, "tip": tip})

    correct_n = sum(1 for r in results if r.get("correct"))
    total = len(results) or 1
    summary = f"本组 {total} 题，答对 {correct_n} 个。"
    return {
        "summary": summary,
        "insights": insights,
        "encouragement": "继续下一组，把高频句型一个个消灭掉。",
    }


async def generate_grammar_batch_analysis(db: Session | None, results: list[dict[str, Any]]) -> dict[str, Any]:
    if not results:
        return {"summary": "暂无练习记录", "insights": [], "encouragement": ""}

    cfg = get_voice_platform_config(db)
    if not cfg.get("crush_llm_enabled", True) or not resolve_dashscope_api_key(db):
        return _rule_grammar_batch_insights(results)

    payload = json.dumps(results, ensure_ascii=False)
    system = (
        "You are an English expression coach for Chinese learners. "
        "Given batch pattern-crush quiz results JSON, return ONLY valid JSON with keys: "
        "summary (string, Chinese), insights (array of {title, correct, explanation, tip}), "
        "encouragement (string, Chinese)."
    )
    user = f"Batch results:\n{payload}"

    try:
        from openai import AsyncOpenAI

        ds_cfg = resolve_dashscope_config(db)
        api_key = resolve_dashscope_api_key(db)
        base_url = (
            ds_cfg.compatible_base_url
            if ds_cfg and ds_cfg.compatible_base_url
            else "https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        model = str(cfg.get("crush_llm_model") or cfg.get("explain_llm_model") or "qwen-turbo")
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.5,
        )
        raw = str(resp.choices[0].message.content or "").strip()
        if "{" not in raw:
            return _rule_grammar_batch_insights(results)
        chunk = raw[raw.index("{") : raw.rindex("}") + 1]
        data = json.loads(chunk)
        insights = data.get("insights")
        if not isinstance(insights, list):
            return _rule_grammar_batch_insights(results)
        return {
            "summary": str(data.get("summary") or _rule_grammar_batch_insights(results)["summary"]),
            "insights": insights,
            "encouragement": str(data.get("encouragement") or ""),
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Grammar batch analysis LLM failed: {}", exc)
        return _rule_grammar_batch_insights(results)
