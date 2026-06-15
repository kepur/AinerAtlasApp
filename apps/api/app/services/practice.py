from __future__ import annotations

import random

from app.models import UserMastery
from app.schemas import PracticeExercise


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
    if not normalized_answer:
        return False
    if normalized_answer == normalized_correct:
        return True
    return normalized_correct in normalized_answer or normalized_answer in normalized_correct
