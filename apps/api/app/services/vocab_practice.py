"""Vocabulary Crush — cloze + near-synonym pick quiz + batch AI debrief."""

from __future__ import annotations

import json
import random
import re
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserMastery, VocabularyItem, utc_now
from app.schemas import PracticeExercise
from app.services.dashscope_client import resolve_dashscope_api_key, resolve_dashscope_config
from app.services.practice import grade_answer
from app.services.voice_platform_config import get_voice_platform_config

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'-]*")
_CLOZE = "______"

_SEMANTIC_NEIGHBORS: dict[str, list[str]] = {
    "stability": ["balance", "steadiness", "consistency", "durability"],
    "perspective": ["viewpoint", "outlook", "standpoint", "angle"],
    "tradeoff": ["compromise", "exchange", "sacrifice", "balance"],
    "trade-off": ["compromise", "exchange", "sacrifice", "balance"],
    "suffocating": ["oppressive", "stifling", "crushing", "overwhelming"],
    "overwhelming": ["overpowering", "intense", "crushing", "suffocating"],
    "resilience": ["toughness", "endurance", "grit", "durability"],
    "ambiguous": ["vague", "unclear", "uncertain", "equivocal"],
    "inevitable": ["unavoidable", "certain", "inescapable", "bound"],
    "significant": ["substantial", "considerable", "meaningful", "notable"],
    "appropriate": ["suitable", "fitting", "proper", "relevant"],
    "consequence": ["outcome", "result", "effect", "impact"],
    "motivation": ["drive", "incentive", "ambition", "purpose"],
    "comfortable": ["cozy", "relaxed", "easy", "secure"],
    "challenge": ["obstacle", "difficulty", "hardship", "test"],
}

_GENERIC_NEIGHBORS = [
    "important", "significant", "essential", "natural", "effective",
    "proper", "appropriate", "common", "critical", "valuable",
    "steady", "consistent", "reliable", "solid", "clear",
]


def _norm_word(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.strip().lower())


def _example_sentence(item: VocabularyItem) -> str:
    for ex in item.examples or []:
        if isinstance(ex, str) and ex.strip():
            return ex.strip()
        if isinstance(ex, dict):
            for key in ("example", "sentence", "text", "usage"):
                val = ex.get(key)
                if val and str(val).strip():
                    return str(val).strip()
    return "This word often appears when people discuss similar topics in English."


def _cloze_sentence(sentence: str, word: str) -> str:
    if not word.strip():
        return sentence
    pattern = re.compile(r"\b" + re.escape(word.strip()) + r"\b", re.IGNORECASE)
    cloze, n = pattern.subn(_CLOZE, sentence, count=1)
    if n == 0:
        return f"{sentence.rstrip('.')} — {_CLOZE}."
    return cloze


def _other_vocab_words(db: Session | None, user_id: str, exclude_word: str, limit: int = 12) -> list[str]:
    if not db or not user_id:
        return []
    rows = list(
        db.scalars(
            select(VocabularyItem.word)
            .where(
                VocabularyItem.user_id == user_id,
                VocabularyItem.mastery_status.not_in(["ignored"]),
            )
            .limit(limit + 5)
        )
    )
    out: list[str] = []
    skip = _norm_word(exclude_word)
    for w in rows:
        if _norm_word(w) != skip and w.strip():
            out.append(w.strip())
        if len(out) >= limit:
            break
    return out


def _near_synonym_distractors(word: str, *, other_words: list[str], count: int = 3) -> list[str]:
    key = _norm_word(word)
    pool: list[str] = []

    for k, neighbors in _SEMANTIC_NEIGHBORS.items():
        if _norm_word(k) == key:
            pool.extend(neighbors)
            break

    pool.extend(other_words)
    if len(pool) < count:
        pool.extend(_GENERIC_NEIGHBORS)

    picked: list[str] = []
    seen = {key}
    for candidate in pool:
        ckey = _norm_word(candidate)
        if not ckey or ckey in seen:
            continue
        seen.add(ckey)
        picked.append(candidate.strip())
        if len(picked) >= count:
            break
    return picked


def generate_vocab_exercise(
    item: VocabularyItem,
    *,
    db: Session | None = None,
    user_id: str | None = None,
) -> PracticeExercise:
    """Cloze + near-synonym options. Never leak Chinese meaning or target word in the prompt."""
    word = item.word.strip()
    sentence = _example_sentence(item)

    if _norm_word(word) not in {_norm_word(t) for t in _WORD_RE.findall(sentence)}:
        sentence = f"People often say that {word} plays a key role in this kind of discussion."

    cloze = _cloze_sentence(sentence, word)
    other_words = _other_vocab_words(db, user_id or item.user_id, word)
    distractors = _near_synonym_distractors(word, other_words=other_words, count=3)

    options = [word, *distractors[:3]]
    random.shuffle(options)

    return PracticeExercise(
        exercise_type="pick_near_synonym",
        prompt="读句子，从下列近义表达中选出最贴切填入空白的一项",
        hint=cloze,
        correct_answer=word,
        options=options,
    )


def grade_vocab_answer(exercise: PracticeExercise, answer: str) -> bool:
    if exercise.exercise_type in ("pick_target_word", "pick_near_synonym"):
        return _norm_word(answer) == _norm_word(exercise.correct_answer)
    return grade_answer(exercise, answer)


def apply_vocab_practice_result(item: VocabularyItem, *, correct: bool) -> str:
    item.last_seen_at = utc_now()
    if correct:
        gain = 10.0 if item.mastery_score < 50 else 6.0
        item.mastery_score = min(100.0, item.mastery_score + gain)
    else:
        item.mastery_score = max(0.0, item.mastery_score - 6.0)

    thresholds = {"seen": 30, "understood": 55, "usable": 75, "mastered": 90}
    for level, threshold in thresholds.items():
        if item.mastery_score >= threshold:
            item.mastery_status = level

    item.updated_at = utc_now()
    if item.mastery_score >= 90:
        return "词汇已掌握，将从待练队列移除"
    if correct:
        return "回答正确！注意近义词在语境里的细微差别"
    return "再比较一下各选项与句意的贴合度"


def select_vocab_batch(db: Session, user_id: str, *, size: int = 10) -> list[VocabularyItem]:
    limit = max(1, min(size, 10))
    rows = list(
        db.scalars(
            select(VocabularyItem)
            .where(
                VocabularyItem.user_id == user_id,
                VocabularyItem.mastery_status.not_in(["mastered", "ignored"]),
            )
            .order_by(VocabularyItem.mastery_score.asc(), VocabularyItem.priority.desc())
            .limit(limit)
        )
    )
    if rows:
        return rows

    mastery_vocab = list(
        db.scalars(
            select(UserMastery)
            .where(
                UserMastery.user_id == user_id,
                UserMastery.item_type == "vocabulary",
                UserMastery.status.not_in(["mastered", "ignored"]),
            )
            .order_by(UserMastery.mastery_score.asc())
            .limit(limit)
        )
    )
    bridged: list[VocabularyItem] = []
    for row in mastery_vocab:
        bridged.append(
            VocabularyItem(
                id=row.id,
                user_id=user_id,
                word=row.title,
                meaning=row.examples[1] if len(row.examples or []) > 1 else "",
                language_code=row.language_code,
                mastery_status=row.status,
                mastery_score=row.mastery_score,
                examples=list(row.examples or [])[:3],
                priority=row.priority,
            )
        )
    return bridged


def _rule_batch_insights(results: list[dict[str, Any]]) -> dict[str, Any]:
    insights = []
    for row in results:
        word = str(row.get("word", ""))
        meaning = str(row.get("meaning", ""))
        correct = bool(row.get("correct"))
        sentence = str(row.get("sentence", ""))
        if correct:
            explanation = f"「{word}」在该语境下最贴切，中文大意是「{meaning}」。"
            tip = "近义词常可互换，但搭配和语气不同——以整句为准。"
        else:
            picked = str(row.get("user_answer", ""))
            explanation = (
                f"你选了「{picked or '?'}」，此处更合适的近义表达是「{word}」（{meaning}）。"
                f" 参考句：{sentence}"
            )
            tip = "别只看中文释义，比较各选项与句子搭配是否自然。"
        insights.append({"word": word, "correct": correct, "explanation": explanation, "tip": tip})

    correct_n = sum(1 for r in results if r.get("correct"))
    total = len(results) or 1
    summary = f"本组 {total} 题，答对 {correct_n} 个。{'近义辨析不错，' if correct_n >= total * 0.7 else '建议重点看错题的语境差异，'}继续下一组。"
    return {
        "summary": summary,
        "word_insights": insights,
        "encouragement": "消灭待练队列里的每一个词，口语就会越来越自然。",
    }


async def generate_batch_analysis(db: Session | None, results: list[dict[str, Any]]) -> dict[str, Any]:
    if not results:
        return {"summary": "暂无练习记录", "word_insights": [], "encouragement": ""}

    cfg = get_voice_platform_config(db)
    if not cfg.get("crush_llm_enabled", True) or not resolve_dashscope_api_key(db):
        return _rule_batch_insights(results)

    payload = json.dumps(results, ensure_ascii=False)
    system = (
        "You are an English vocabulary coach for Chinese learners. "
        "Given batch near-synonym quiz results JSON, return ONLY valid JSON with keys: "
        "summary (string, Chinese), word_insights (array of {word, correct, explanation, tip}), "
        "encouragement (string, Chinese). "
        "Explain why the chosen near-synonym fits or does not fit the sentence context; "
        "contrast with wrong picks."
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
            return _rule_batch_insights(results)
        chunk = raw[raw.index("{") : raw.rindex("}") + 1]
        data = json.loads(chunk)
        insights = data.get("word_insights")
        if not isinstance(insights, list):
            return _rule_batch_insights(results)
        return {
            "summary": str(data.get("summary") or _rule_batch_insights(results)["summary"]),
            "word_insights": insights,
            "encouragement": str(data.get("encouragement") or ""),
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Vocab batch analysis LLM failed: {}", exc)
        return _rule_batch_insights(results)
