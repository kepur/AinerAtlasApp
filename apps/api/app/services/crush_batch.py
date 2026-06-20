"""Crush batch sessions — pre-generate 10 exercises locally; LLM only after batch completes."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserMastery, VocabularyItem
from app.schemas import PracticeExercise
from app.services.practice import generate_exercise, stash_exercise
from app.services.vocab_practice import generate_vocab_exercise


def select_grammar_batch(db: Session, user_id: str, *, size: int = 10) -> list[UserMastery]:
    limit = max(1, min(size, 10))
    return list(
        db.scalars(
            select(UserMastery)
            .where(
                UserMastery.user_id == user_id,
                UserMastery.item_type != "vocabulary",
                UserMastery.status.not_in(["mastered", "archived", "ignored"]),
            )
            .order_by(UserMastery.priority.desc(), UserMastery.mastery_score.asc())
            .limit(limit)
        )
    )


def prepare_vocab_batch_exercises(
    db: Session,
    user_id: str,
    items: list[VocabularyItem],
) -> list[dict]:
    ready: list[dict] = []
    for item in items:
        exercise = generate_vocab_exercise(item, db=db, user_id=user_id)
        token = stash_exercise(user_id, item.id, exercise)
        ready.append(
            {
                "item_id": item.id,
                "exercise": exercise,
                "exercise_token": token,
            }
        )
    return ready


def prepare_grammar_batch_exercises(
    user_id: str,
    items: list[UserMastery],
) -> list[dict]:
    ready: list[dict] = []
    for item in items:
        exercise = generate_exercise(item, exercise_type="choose_natural")
        token = stash_exercise(user_id, item.id, exercise)
        ready.append(
            {
                "item_id": item.id,
                "exercise": exercise,
                "exercise_token": token,
            }
        )
    return ready
