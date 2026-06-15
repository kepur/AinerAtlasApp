from __future__ import annotations

from sqlalchemy import select

from app.models import GrammarPattern, UserMastery, utc_now
from app.schemas import GrammarTip


def mine_learning_items(
    db,
    *,
    user_id: str,
    target_language: str,
    grammar_tips: list[GrammarTip],
    patterns: list[str],
    vocabulary: list[str],
) -> list[str]:
    tips_by_pattern = {tip.pattern: tip for tip in grammar_tips if tip.pattern}

    for pattern in dict.fromkeys([*patterns, *tips_by_pattern.keys()]):
        tip = tips_by_pattern.get(pattern)
        _ensure_grammar_pattern(
            db,
            pattern_name=pattern,
            target_language=target_language,
            native_language="zh",
            description=tip.explanation if tip else "Extracted from conversation mining.",
            examples=[pattern],
            pattern_type="pattern",
            difficulty=tip.importance if tip else 2,
        )

    return _upsert_mastery_items(
        db,
        user_id=user_id,
        target_language=target_language,
        patterns=patterns,
        vocabulary=vocabulary,
    )


def mine_from_analysis(
    db,
    *,
    user_id: str,
    target_language: str,
    native_language: str,
    analysis: dict,
) -> list[str]:
    grammar_tips = [
        GrammarTip(
            pattern=str(tip.get("pattern", "")).strip(),
            explanation=str(tip.get("explanation", "")).strip(),
            importance=int(tip.get("importance", 3) or 3),
        )
        for tip in analysis.get("grammar_tips", [])
        if isinstance(tip, dict) and str(tip.get("pattern", "")).strip()
    ]

    added = mine_learning_items(
        db,
        user_id=user_id,
        target_language=target_language,
        grammar_tips=grammar_tips,
        patterns=analysis.get("core_patterns") or analysis.get("patterns", []),
        vocabulary=[],
    )

    for mistake in analysis.get("mistakes") or []:
        if not isinstance(mistake, dict):
            continue
        original = str(mistake.get("original", "")).strip()
        corrected = str(mistake.get("corrected", "")).strip()
        explanation = str(mistake.get("explanation", "")).strip()
        error_type = str(mistake.get("type", "grammar_error")).strip()
        title = corrected or original or error_type
        if not title:
            continue

        examples = []
        if original and corrected:
            examples.append(f"{original} -> {corrected}")
        if explanation:
            examples.append(explanation)

        _ensure_grammar_pattern(
            db,
            pattern_name=title,
            target_language=target_language,
            native_language=native_language,
            description=explanation or "Extracted from correction analysis.",
            examples=examples,
            pattern_type="error",
            difficulty=5,
        )
        mined = _upsert_mastery_item(
            db,
            user_id=user_id,
            item_type="grammar",
            title=title,
            target_language=target_language,
            examples=examples,
            priority=5,
        )
        if mined:
            added.append(mined)

    return added


def _ensure_grammar_pattern(
    db,
    *,
    pattern_name: str,
    target_language: str,
    native_language: str,
    description: str,
    examples: list[str],
    pattern_type: str,
    difficulty: int,
) -> None:
    code = f"{target_language}:pattern:{_slug(pattern_name)}"
    record = db.scalar(select(GrammarPattern).where(GrammarPattern.code == code))
    if record:
        record.description = description or record.description
        record.pattern_type = pattern_type or record.pattern_type
        record.difficulty = max(record.difficulty, difficulty)
        record.examples = list(dict.fromkeys([*record.examples, *examples]))[:8]
        return

    db.add(
        GrammarPattern(
            code=code,
            name=pattern_name,
            language_code=target_language,
            language_pair=f"{native_language}-{target_language}",
            pattern_type=pattern_type,
            description=description,
            examples=examples,
            difficulty=difficulty,
        )
    )


def _upsert_mastery_items(
    db,
    *,
    user_id: str,
    target_language: str,
    patterns: list[str],
    vocabulary: list[str],
) -> list[str]:
    added: list[str] = []
    for item_type, items in {"pattern": patterns, "vocabulary": vocabulary}.items():
        for title in items:
            created = _upsert_mastery_item(
                db,
                user_id=user_id,
                item_type=item_type,
                title=title,
                target_language=target_language,
                priority=4,
            )
            if created:
                added.append(created)
    return added


def _upsert_mastery_item(
    db,
    *,
    user_id: str,
    item_type: str,
    title: str,
    target_language: str,
    examples: list[str] | None = None,
    priority: int = 4,
) -> str | None:
    item_id = f"{target_language}:{item_type}:{_slug(title)}"
    mastery = db.scalar(
        select(UserMastery).where(
            UserMastery.user_id == user_id,
            UserMastery.item_id == item_id,
            UserMastery.item_type == item_type,
        )
    )
    if mastery:
        mastery.last_seen_at = utc_now()
        mastery.priority = min(5, mastery.priority + 1)
        if examples:
            mastery.examples = list(dict.fromkeys([*mastery.examples, *examples]))[:8]
        return None

    db.add(
        UserMastery(
            user_id=user_id,
            item_type=item_type,
            item_id=item_id,
            title=title,
            language_code=target_language,
            mastery_score=20,
            priority=priority,
            examples=examples or [],
            last_seen_at=utc_now(),
            status="new",
        )
    )
    return title


def _slug(text: str) -> str:
    normalized = text.lower().strip()
    for char in ("...", ".", ",", " ", "—", "-"):
        normalized = normalized.replace(char, "_")
    while "__" in normalized:
        normalized = normalized.replace("__", "_")
    return normalized.strip("_")[:100]
