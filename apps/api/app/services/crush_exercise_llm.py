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
    llm_exercise = await generate_exercise_llm(db, item)
    if llm_exercise and llm_exercise.prompt and llm_exercise.correct_answer:
        return llm_exercise
    return generate_rule_exercise(item)
