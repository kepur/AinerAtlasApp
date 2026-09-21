from __future__ import annotations

import random
import secrets
from datetime import UTC, datetime, timedelta

from app.models import UserMastery
from app.schemas import PracticeExercise

_PENDING_TTL = timedelta(minutes=15)
_pending_exercises: dict[str, tuple[str, str, PracticeExercise, datetime]] = {}


def _cleanup_pending_exercises() -> None:
    now = datetime.now(UTC)
    expired = [
        token
        for token, (_, _, _, created_at) in _pending_exercises.items()
        if now - created_at > _PENDING_TTL
    ]
    for token in expired:
        _pending_exercises.pop(token, None)


def stash_exercise(user_id: str, item_id: str, exercise: PracticeExercise) -> str:
    _cleanup_pending_exercises()
    token = secrets.token_urlsafe(16)
    _pending_exercises[token] = (user_id, item_id, exercise, datetime.now(UTC))
    return token


def take_exercise(user_id: str, item_id: str, token: str) -> PracticeExercise | None:
    _cleanup_pending_exercises()
    row = _pending_exercises.pop(token, None)
    if not row:
        return None
    owner_id, stored_item_id, exercise, _ = row
    if owner_id != user_id or stored_item_id != item_id:
        return None
    return exercise


def generate_exercise(item: UserMastery, *, exercise_type: str | None = None) -> PracticeExercise:
    """Use a pack's authored question; never fabricate English grammar for other languages."""
    from app.services.learning_curriculum import authored_exercise
    lesson = authored_exercise(item)
    if lesson:
        return PracticeExercise(exercise_type="choose_natural", prompt=lesson["prompt"],
            hint=lesson["rule"], options=lesson["options"], correct_answer=lesson["answer"])
    # Ad-hoc mined expressions lack reviewed distractors/meanings. A transparent
    # recall drill is safer than pretending a fake sentence is a grammar rule.
    title = item.title
    if len(title) < 2:
        masked = "____"
    else:
        start = len(title) // 3
        masked = title[:start] + "____" + title[min(len(title), start + max(1, len(title) // 3)):]
    return PracticeExercise(
        exercise_type="translate",
        prompt=f"回忆你收集的表达，输入完整原句：{masked}",
        hint="这是原句回忆练习；课程模块内提供按语言编写的辨析题。",
        correct_answer=title,
    )


def grade_answer(exercise: PracticeExercise, answer: str) -> bool:
    normalized_answer = " ".join(answer.strip().lower().split())
    normalized_correct = " ".join(exercise.correct_answer.strip().lower().split())
    if not normalized_answer or not normalized_correct:
        return False
    if normalized_answer == normalized_correct:
        return True
    if exercise.exercise_type == "choose_natural":
        return False
    # translate / fix_error: allow minor punctuation differences only
    def _strip_punct(text: str) -> str:
        return "".join(ch for ch in text if ch.isalnum() or ch.isspace()).strip()

    return _strip_punct(normalized_answer) == _strip_punct(normalized_correct)
