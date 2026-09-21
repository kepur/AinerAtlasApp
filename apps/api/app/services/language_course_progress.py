"""Persistence bridge between fixed language courses and the learning loop."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    LanguageCourseProgress,
    LanguagePracticeAttempt,
    VocabularyItem,
    utc_now,
)
from app.services.vocab_practice import apply_vocab_practice_result

COURSE_CODE = "survival-sprint"
DAILY_GOAL = 10


def normalise_course_language(language: str) -> str:
    return (language or "sr").strip().lower().split("-", 1)[0] or "sr"


def get_or_create_course_progress(
    db: Session,
    user_id: str,
    language: str,
) -> LanguageCourseProgress:
    code = normalise_course_language(language)
    row = db.scalar(
        select(LanguageCourseProgress).where(
            LanguageCourseProgress.user_id == user_id,
            LanguageCourseProgress.course_code == COURSE_CODE,
            LanguageCourseProgress.language_code == code,
        )
    )
    if row:
        return row
    row = LanguageCourseProgress(
        user_id=user_id,
        course_code=COURSE_CODE,
        language_code=code,
    )
    db.add(row)
    db.flush()
    return row


def _touch_practice_day(progress: LanguageCourseProgress) -> None:
    today = utc_now().date()
    previous = progress.last_practice_on
    if previous == today:
        return
    progress.total_sessions += 1
    progress.streak_days = progress.streak_days + 1 if previous == today - timedelta(days=1) else 1
    progress.last_practice_on = today


def progress_payload(db: Session, progress: LanguageCourseProgress) -> dict:
    today = utc_now().date()
    today_count = db.scalar(
        select(func.count())
        .select_from(LanguagePracticeAttempt)
        .where(
            LanguagePracticeAttempt.progress_id == progress.id,
            LanguagePracticeAttempt.practiced_on == today,
        )
    ) or 0
    mistakes = progress.mistake_items or {}
    due_items = [
        {"item_id": item_id, **details}
        for item_id, details in mistakes.items()
        if not details.get("last_correct", False)
    ]
    due_items.sort(key=lambda row: (-int(row.get("mistakes", 0)), str(row.get("item_id", ""))))
    return {
        "id": progress.id,
        "language": progress.language_code,
        "current_step": progress.current_step,
        "scenario_index": progress.scenario_index,
        "turn_index": progress.turn_index,
        "completed_steps": progress.completed_steps or [],
        "correct_count": progress.correct_count,
        "mistake_count": progress.mistake_count,
        "total_sessions": progress.total_sessions,
        "streak_days": progress.streak_days,
        "last_practice_on": (
            progress.last_practice_on.isoformat() if progress.last_practice_on else None
        ),
        "today_count": int(today_count),
        "daily_goal": DAILY_GOAL,
        "daily_complete": int(today_count) >= DAILY_GOAL,
        "due_review_count": len(due_items),
        "due_review_items": due_items[:10],
        "state": progress.state or {},
    }


def save_course_position(
    db: Session,
    progress: LanguageCourseProgress,
    *,
    current_step: int,
    scenario_index: int,
    turn_index: int,
) -> dict:
    progress.current_step = max(0, min(4, int(current_step)))
    progress.scenario_index = max(0, int(scenario_index))
    progress.turn_index = max(0, int(turn_index))
    completed = set(int(item) for item in (progress.completed_steps or []))
    completed.update(range(progress.current_step))
    progress.completed_steps = sorted(completed)
    db.commit()
    db.refresh(progress)
    return progress_payload(db, progress)


def record_course_attempt(
    db: Session,
    progress: LanguageCourseProgress,
    *,
    activity_type: str,
    item_id: str,
    correct: bool,
    user_answer: str,
    expected_answer: str,
    native_meaning: str,
    details: dict | None = None,
    add_vocabulary: bool = True,
) -> dict:
    _touch_practice_day(progress)
    if correct:
        progress.correct_count += 1
    else:
        progress.mistake_count += 1

    mistake_items = dict(progress.mistake_items or {})
    item_state = dict(mistake_items.get(item_id) or {})
    item_state.update({
        "target": expected_answer,
        "native": native_meaning,
        "last_correct": bool(correct),
        "updated_at": utc_now().isoformat(),
    })
    item_state["correct"] = int(item_state.get("correct", 0)) + (1 if correct else 0)
    item_state["mistakes"] = int(item_state.get("mistakes", 0)) + (0 if correct else 1)
    mistake_items[item_id] = item_state
    progress.mistake_items = mistake_items

    attempt = LanguagePracticeAttempt(
        user_id=progress.user_id,
        progress_id=progress.id,
        course_code=progress.course_code,
        language_code=progress.language_code,
        activity_type=(activity_type or "scenario")[:40],
        item_id=item_id[:160],
        correct=bool(correct),
        user_answer=user_answer,
        expected_answer=expected_answer,
        details=details or {},
        practiced_on=utc_now().date(),
    )
    db.add(attempt)

    topic = f"course:{progress.course_code}:{item_id}"[:120]
    vocabulary = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.user_id == progress.user_id,
            VocabularyItem.language_code == progress.language_code,
            VocabularyItem.topic == topic,
        )
    )
    if not add_vocabulary:
        pass  # The modular curriculum bridges word vs. pattern into the correct queue.
    elif not vocabulary:
        vocabulary = VocabularyItem(
            user_id=progress.user_id,
            word=expected_answer[:120],
            meaning=native_meaning,
            topic=topic,
            language_code=progress.language_code,
            mastery_status="seen" if correct else "reviewing",
            mastery_score=30 if correct else 10,
            examples=[expected_answer],
            priority=3 if correct else 5,
        )
        db.add(vocabulary)
    else:
        apply_vocab_practice_result(vocabulary, correct=correct)
        if not correct:
            vocabulary.mastery_status = "reviewing"
            vocabulary.priority = max(vocabulary.priority, 5)

    db.commit()
    db.refresh(progress)
    payload = progress_payload(db, progress)
    payload["attempt_id"] = attempt.id
    return payload
