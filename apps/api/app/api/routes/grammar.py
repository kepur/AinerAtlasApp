from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models import GrammarPattern, UserMastery, utc_now
from app.schemas import (
    CrushCandidateCreate,
    MasteryRead,
    PracticeExercise,
    PracticeExercisePublic,
    PracticeResponse,
    PracticeResult,
    PracticeSubmit,
)
from app.services.pattern_mining import _upsert_mastery_item
from app.services.crush_exercise_llm import generate_exercise_smart
from app.services.practice import generate_exercise, grade_answer, stash_exercise, take_exercise

router = APIRouter(prefix="/grammar", tags=["grammar"])

MASTERED_THRESHOLD = 85
MASTERED_STREAK = 5


@router.post("/candidate", response_model=MasteryRead)
def add_crush_candidate(
    payload: CrushCandidateCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> UserMastery:
    """Add a pattern/word to the user's review queue (HUD '加入今日练习')."""
    title = payload.pattern.strip()
    if not title:
        raise HTTPException(status_code=400, detail="pattern is required")
    item_type = payload.item_type if payload.item_type in {"pattern", "vocabulary", "grammar"} else "pattern"
    examples = [payload.example.strip()] if payload.example.strip() else []
    _upsert_mastery_item(
        db,
        user_id=current_user.id,
        item_type=item_type,
        title=title,
        target_language=payload.language_code or "en",
        examples=examples,
        priority=5,
    )
    db.commit()
    item_id = f"{payload.language_code or 'en'}:{item_type}:{_slug_title(title)}"
    row = db.scalar(
        select(UserMastery).where(
            UserMastery.user_id == current_user.id,
            UserMastery.item_id == item_id,
            UserMastery.item_type == item_type,
        )
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create candidate")
    return row


def _slug_title(text: str) -> str:
    from app.services.pattern_mining import _slug
    return _slug(text)


@router.get("/queue", response_model=list[MasteryRead])
def review_queue(
    current_user: CurrentUser,
    db: DBSession,
    language_code: str | None = Query(None),
) -> list[UserMastery]:
    stmt = (
        select(UserMastery)
        .where(
            UserMastery.user_id == current_user.id,
            UserMastery.status.not_in(["mastered", "archived", "ignored"]),
        )
        .order_by(UserMastery.priority.desc(), UserMastery.created_at.desc())
        .limit(20)
    )
    if language_code:
        stmt = stmt.where(UserMastery.language_code == language_code)
    return list(db.scalars(stmt))


@router.get("/patterns")
def list_patterns(db: DBSession, language_code: str | None = Query(None)) -> list[dict]:
    stmt = select(GrammarPattern).order_by(GrammarPattern.created_at.desc()).limit(100)
    if language_code:
        stmt = stmt.where(GrammarPattern.language_code == language_code)
    patterns = list(db.scalars(stmt))
    return [
        {
            "id": pattern.id,
            "code": pattern.code,
            "name": pattern.name,
            "language_code": pattern.language_code,
            "description": pattern.description,
        }
        for pattern in patterns
    ]


@router.get("/mastery", response_model=list[MasteryRead])
def mastery_items(current_user: CurrentUser, db: DBSession) -> list[UserMastery]:
    return list(
        db.scalars(
            select(UserMastery)
            .where(UserMastery.user_id == current_user.id)
            .order_by(UserMastery.mastery_score.desc())
        )
    )


@router.get("/{item_id}/practice", response_model=PracticeResponse)
async def get_practice_exercise(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> PracticeResponse:
    item = get_item(item_id, current_user.id, db)
    exercise = await generate_exercise_smart(db, item)
    token = stash_exercise(current_user.id, item_id, exercise)
    return PracticeResponse(
        item=item,
        exercise=_public_exercise(exercise),
        exercise_token=token,
        message="Practice exercise generated",
    )


def _public_exercise(exercise: PracticeExercise) -> PracticeExercisePublic:
    return PracticeExercisePublic(
        exercise_type=exercise.exercise_type,
        prompt=exercise.prompt,
        hint=exercise.hint,
        options=exercise.options,
    )


def _resolve_submitted_exercise(
    *,
    user_id: str,
    item_id: str,
    payload: PracticeSubmit,
    item: UserMastery,
) -> PracticeExercise:
    if payload.exercise_token.strip():
        exercise = take_exercise(user_id, item_id, payload.exercise_token.strip())
        if exercise:
            return exercise
        raise HTTPException(status_code=400, detail="练习已过期，请重新获取题目")

    if payload.correct_answer.strip():
        return PracticeExercise(
            exercise_type=payload.exercise_type or "translate",
            prompt=payload.prompt,
            hint=payload.hint,
            options=payload.options,
            correct_answer=payload.correct_answer,
        )

    return generate_exercise(item)


@router.post("/{item_id}/practice", response_model=PracticeResponse)
async def practice_item(
    item_id: str,
    payload: PracticeSubmit,
    current_user: CurrentUser,
    db: DBSession,
) -> PracticeResponse:
    item = get_item(item_id, current_user.id, db)

    if not payload.answer.strip():
        exercise = await generate_exercise_smart(db, item)
        token = stash_exercise(current_user.id, item_id, exercise)
        return PracticeResponse(
            item=item,
            exercise=_public_exercise(exercise),
            exercise_token=token,
            message="Practice exercise generated",
        )

    exercise = _resolve_submitted_exercise(
        user_id=current_user.id,
        item_id=item_id,
        payload=payload,
        item=item,
    )

    correct = grade_answer(exercise, payload.answer)
    if correct:
        item.correct_count += 1
        item.mastery_score = min(100, item.mastery_score + 12)
    else:
        item.mistake_count += 1
        item.mastery_score = max(0, item.mastery_score - 8)
        item.status = "reviewing"

    item.last_reviewed_at = utc_now()

    if item.mastery_score >= MASTERED_THRESHOLD and item.correct_count >= MASTERED_STREAK:
        item.status = "mastered"
        message = "Pattern mastered and removed from daily queue"
    elif correct:
        item.status = "reviewing" if item.mastery_score < MASTERED_THRESHOLD else item.status
        message = "Correct answer recorded"
    else:
        message = "Incorrect answer, keep practicing"

    db.commit()
    db.refresh(item)
    return PracticeResponse(
        item=item,
        exercise=_public_exercise(exercise),
        correct=correct,
        message=message,
    )


@router.post("/{item_id}/mark-mastered", response_model=PracticeResult)
def mark_mastered(item_id: str, current_user: CurrentUser, db: DBSession) -> PracticeResult:
    item = get_item(item_id, current_user.id, db)
    item.mastery_score = 100
    item.status = "mastered"
    item.last_reviewed_at = utc_now()
    db.commit()
    db.refresh(item)
    return PracticeResult(item=item, message="Item mastered and removed from daily queue")


@router.post("/{item_id}/ignore", response_model=PracticeResult)
def ignore_item(item_id: str, current_user: CurrentUser, db: DBSession) -> PracticeResult:
    item = get_item(item_id, current_user.id, db)
    item.status = "ignored"
    db.commit()
    db.refresh(item)
    return PracticeResult(item=item, message="Item ignored")


def get_item(item_id: str, user_id: str, db: DBSession) -> UserMastery:
    item = db.scalar(
        select(UserMastery).where(UserMastery.id == item_id, UserMastery.user_id == user_id)
    )
    if not item:
        item = db.scalar(
            select(UserMastery).where(UserMastery.item_id == item_id, UserMastery.user_id == user_id)
        )
    if not item:
        raise HTTPException(status_code=404, detail="Learning item not found")
    return item
