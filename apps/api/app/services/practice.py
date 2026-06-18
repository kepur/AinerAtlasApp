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


def generate_exercise(item: UserMastery) -> PracticeExercise:
    """Generate a Pattern Crush exercise for a mastery item."""
    exercise_types = ["translate", "fix_error", "choose_natural"]
    exercise_type = random.choice(exercise_types)
    title = item.title

    if exercise_type == "translate":
        return PracticeExercise(
            exercise_type=exercise_type,
            prompt=f"请将以下中文意思翻译为 {item.language_code}: 「与「{title}」相关的表达」",
            hint=item.examples[0] if item.examples else f"Use the pattern: {title}",
            correct_answer=title,
        )

    if exercise_type == "fix_error":
        wrong = title.replace(" is ", " are ") if " is " in title else f"{title} have"
        return PracticeExercise(
            exercise_type=exercise_type,
            prompt=f"请改正这个句子: {wrong}",
            hint="Check grammar and naturalness.",
            correct_answer=title,
        )

    options = [title]
    distractors = [
        f"Maybe {title.lower()}",
        f"I think about {title.lower()} sometimes",
        f"{title} is very important for me",
    ]
    for candidate in distractors:
        if candidate not in options and len(options) < 4:
            options.append(candidate)
    random.shuffle(options)
    return PracticeExercise(
        exercise_type=exercise_type,
        prompt="请选择更自然的表达:",
        options=options,
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
