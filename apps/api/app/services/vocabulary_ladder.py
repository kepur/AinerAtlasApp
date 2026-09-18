"""Vocabulary milestone ladder backed by real learner mastery records."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserMastery, VocabularyItem


VOCABULARY_MILESTONES = [
    {
        "key": "foundation_500",
        "target": 500,
        "label": "500 基础词汇",
        "range": "0–500",
        "outcome": "覆盖人物、数字、时间、食物、交通和高频动作，先能活下来。",
    },
    {
        "key": "independent_800",
        "target": 800,
        "label": "800 日常独立",
        "range": "501–800",
        "outcome": "补齐住房、办事、健康与社交高频词，能处理重复日常场景。",
    },
    {
        "key": "sweet_spot_1200",
        "target": 1200,
        "label": "1200 甜点区间 · 毕业",
        "range": "801–1200",
        "outcome": "进入投入产出比最好的主动词汇区间，之后按个人生活缺口继续扩展。",
    },
]


def _normalise_language(language: str) -> str:
    return (language or "en").strip().lower().split("-", 1)[0] or "en"


def _normalise_word(word: str) -> str:
    return " ".join((word or "").strip().casefold().split())


def build_vocabulary_ladder(
    db: Session,
    user_id: str,
    language: str,
) -> dict[str, object]:
    """Count unique vocabulary by the strongest persisted mastery evidence."""
    language_code = _normalise_language(language)
    records: dict[str, tuple[str, float]] = {}

    item_rows = db.execute(
        select(
            VocabularyItem.word,
            VocabularyItem.mastery_status,
            VocabularyItem.mastery_score,
        ).where(
            VocabularyItem.user_id == user_id,
            VocabularyItem.language_code == language_code,
            VocabularyItem.mastery_status != "ignored",
        )
    ).all()
    mastery_rows = db.execute(
        select(
            UserMastery.title,
            UserMastery.status,
            UserMastery.mastery_score,
        ).where(
            UserMastery.user_id == user_id,
            UserMastery.item_type == "vocabulary",
            UserMastery.language_code == language_code,
            UserMastery.status != "ignored",
        )
    ).all()

    status_rank = {
        "unseen": 0,
        "seen": 1,
        "reviewing": 2,
        "understood": 3,
        "usable": 4,
        "mastered": 5,
    }
    for word, status, score in [*item_rows, *mastery_rows]:
        key = _normalise_word(str(word or ""))
        if not key:
            continue
        candidate = (str(status or "seen"), float(score or 0))
        existing = records.get(key)
        if not existing or (
            status_rank.get(candidate[0], 0), candidate[1]
        ) > (
            status_rank.get(existing[0], 0), existing[1]
        ):
            records[key] = candidate

    collected_count = len(records)
    active_count = sum(
        1 for status, score in records.values()
        if status in {"usable", "mastered"} or score >= 75
    )
    mastered_count = sum(
        1 for status, score in records.values()
        if status == "mastered" or score >= 90
    )

    next_target = next(
        (milestone["target"] for milestone in VOCABULARY_MILESTONES
         if mastered_count < milestone["target"]),
        1200,
    )
    previous_target = 0
    ladder = []
    for milestone in VOCABULARY_MILESTONES:
        target = int(milestone["target"])
        completed = mastered_count >= target
        is_current = not completed and target == next_target
        segment_progress = max(0, min(mastered_count, target) - previous_target)
        segment_size = target - previous_target
        ladder.append({
            **milestone,
            "status": "completed" if completed else "current" if is_current else "locked",
            "progress_count": segment_size if completed else segment_progress if is_current else 0,
            "segment_size": segment_size,
            "progress_percent": round((segment_progress / segment_size) * 100) if segment_size else 100,
        })
        previous_target = target

    if mastered_count >= 1200:
        phase = "graduated"
        phase_label = "1200 甜点区间毕业"
    elif mastered_count >= 800:
        phase = "sweet_spot"
        phase_label = "正在攀登 800–1200 甜点区间"
    elif mastered_count >= 500:
        phase = "independent"
        phase_label = "正在从 500 扩展到 800"
    else:
        phase = "foundation"
        phase_label = "正在打牢 500 基础词汇"

    return {
        "language": language_code,
        "collected_count": collected_count,
        "active_count": active_count,
        "mastered_count": mastered_count,
        "graduation_target": 1200,
        "overall_percent": round(min(100, mastered_count / 1200 * 100), 1),
        "next_target": next_target,
        "remaining_to_next": max(0, next_target - mastered_count),
        "graduated": mastered_count >= 1200,
        "phase": phase,
        "phase_label": phase_label,
        "counting_rule": "去重后，状态为 mastered 或熟练度达到 90 才计入阶梯。",
        "milestones": ladder,
    }
