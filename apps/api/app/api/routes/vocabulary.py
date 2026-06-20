from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.models import UserMastery, VocabularyItem, utc_now
from app.schemas import (
    APIMessage,
    TokenExplainRequest,
    TokenExplainResponse,
    VocabBatchResultItem,
    VocabBatchExerciseReady,
    VocabBatchStartResponse,
    VocabBatchSummaryRequest,
    VocabBatchSummaryResponse,
    VocabPracticeExercisePublic,
    VocabPracticeResponse,
    VocabPracticeSubmit,
    VocabWordInsight,
    VocabularyRead,
)
from app.services.llm import LLMUnavailableError, require_llm_provider
from app.services.practice import stash_exercise, take_exercise
from app.services.runtime_config import resolve_default_llm_provider
from app.services.crush_batch import prepare_vocab_batch_exercises
from app.services.vocab_practice import (
    apply_vocab_practice_result,
    generate_batch_analysis,
    generate_vocab_exercise,
    grade_vocab_answer,
    select_vocab_batch,
)

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


@router.post("/explain", response_model=TokenExplainResponse)
async def explain_token(
    payload: TokenExplainRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> TokenExplainResponse:
    """Explain a single word/phrase. Caches result in VocabularyItem so repeat lookups skip LLM."""
    token = payload.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required")

    cached = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.user_id == current_user.id,
            VocabularyItem.word == token,
            VocabularyItem.language_code == payload.target_language,
        )
    )
    if cached and cached.meaning:
        extra = cached.examples[0] if cached.examples and isinstance(cached.examples[0], dict) else {}
        cached.last_seen_at = utc_now()
        db.commit()
        return TokenExplainResponse(
            token=token,
            meaning=cached.meaning,
            usage=str(extra.get("usage", "")),
            example=str(extra.get("example", "")),
            part_of_speech=str(extra.get("part_of_speech", "")),
        )

    try:
        provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
        data = await provider.explain_token(
            token,
            context=payload.context,
            native_language=payload.native_language,
            target_language=payload.target_language,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"LLM 调用失败：{exc}") from exc

    meaning = str(data.get("meaning", ""))
    usage = str(data.get("usage", ""))
    example = str(data.get("example", ""))
    pos = str(data.get("part_of_speech", ""))

    if cached:
        cached.meaning = meaning
        cached.examples = [{"usage": usage, "example": example, "part_of_speech": pos}]
        cached.last_seen_at = utc_now()
    else:
        db.add(VocabularyItem(
            user_id=current_user.id,
            word=token,
            meaning=meaning,
            language_code=payload.target_language,
            examples=[{"usage": usage, "example": example, "part_of_speech": pos}],
            mastery_status="seen",
            priority=3,
        ))
    db.commit()

    return TokenExplainResponse(
        token=data.get("token", token),
        meaning=meaning, usage=usage, example=example, part_of_speech=pos,
    )


def _count_remaining(user_id: str, db: DBSession) -> int:
    vocab_count = db.scalar(
        select(func.count())
        .select_from(VocabularyItem)
        .where(
            VocabularyItem.user_id == user_id,
            VocabularyItem.mastery_status.not_in(["mastered", "ignored"]),
        )
    ) or 0
    mastery_count = db.scalar(
        select(func.count())
        .select_from(UserMastery)
        .where(
            UserMastery.user_id == user_id,
            UserMastery.item_type == "vocabulary",
            UserMastery.status.not_in(["mastered", "ignored"]),
        )
    ) or 0
    return int(vocab_count + mastery_count)


def _mastery_as_vocab_read(row: UserMastery) -> VocabularyRead:
    now = utc_now()
    return VocabularyRead(
        id=row.id,
        word=row.title,
        meaning=row.examples[1] if len(row.examples or []) > 1 else "",
        translation=row.examples[1] if len(row.examples or []) > 1 else "",
        topic="",
        language_code=row.language_code,
        mastery_status=row.status,
        mastery_score=row.mastery_score,
        examples=[str(e) for e in (row.examples or [])[:3]],
        priority=row.priority,
        last_seen_at=row.last_reviewed_at,
        created_at=row.created_at or now,
    )


def _item_to_read(item: VocabularyItem) -> VocabularyRead:
    now = utc_now()
    return VocabularyRead(
        id=item.id,
        word=item.word,
        meaning=item.meaning or "",
        translation=item.meaning or "",
        topic=item.topic or "",
        language_code=item.language_code or "en",
        mastery_status=item.mastery_status,
        mastery_score=item.mastery_score,
        examples=[str(e) for e in (item.examples or [])[:3] if e],
        priority=item.priority if item.priority is not None else 3,
        last_seen_at=getattr(item, "last_seen_at", None),
        created_at=getattr(item, "created_at", None) or now,
    )


def _public_vocab_exercise(exercise) -> VocabPracticeExercisePublic:
    return VocabPracticeExercisePublic(
        exercise_type=exercise.exercise_type,
        prompt=exercise.prompt,
        sentence=exercise.hint,
        hint=exercise.hint,
        options=exercise.options or [],
    )


def _resolve_vocab_item(item_id: str, user_id: str, db: DBSession) -> VocabularyItem:
    item = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.id == item_id,
            VocabularyItem.user_id == user_id,
        )
    )
    if item:
        return item

    mastery = db.scalar(
        select(UserMastery).where(
            UserMastery.id == item_id,
            UserMastery.user_id == user_id,
            UserMastery.item_type == "vocabulary",
        )
    )
    if not mastery:
        raise HTTPException(status_code=404, detail="Vocabulary item not found")

    return VocabularyItem(
        id=mastery.id,
        user_id=user_id,
        word=mastery.title,
        meaning=mastery.examples[1] if len(mastery.examples or []) > 1 else "",
        language_code=mastery.language_code,
        mastery_status=mastery.status,
        mastery_score=mastery.mastery_score,
        examples=list(mastery.examples or [])[:3],
        priority=mastery.priority,
    )


def _persist_vocab_result(item: VocabularyItem, db: DBSession) -> VocabularyItem:
    stored = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.id == item.id,
            VocabularyItem.user_id == item.user_id,
        )
    )
    if stored:
        stored.mastery_score = item.mastery_score
        stored.mastery_status = item.mastery_status
        stored.last_seen_at = item.last_seen_at
        stored.updated_at = item.updated_at
        db.commit()
        db.refresh(stored)
        return stored

    mastery = db.get(UserMastery, item.id)
    if mastery:
        mastery.mastery_score = item.mastery_score
        mastery.status = item.mastery_status
        mastery.last_reviewed_at = utc_now()
        if item.mastery_score >= 90:
            mastery.status = "mastered"
        db.commit()
        db.refresh(mastery)
        return item

    db.commit()
    return item


@router.get("/queue", response_model=list[VocabularyRead])
def vocabulary_queue(current_user: CurrentUser, db: DBSession, limit: int = 50) -> list:
    cap = max(1, min(limit, 100))
    items = list(
        db.scalars(
            select(VocabularyItem)
            .where(
                VocabularyItem.user_id == current_user.id,
                VocabularyItem.mastery_status.not_in(["mastered", "ignored"]),
            )
            .order_by(VocabularyItem.mastery_score.asc(), VocabularyItem.priority.desc())
            .limit(cap)
        )
    )
    if items:
        return [_item_to_read(i) for i in items]

    mastery_rows = list(
        db.scalars(
            select(UserMastery)
            .where(
                UserMastery.user_id == current_user.id,
                UserMastery.item_type == "vocabulary",
                UserMastery.status.not_in(["mastered", "ignored"]),
            )
            .order_by(UserMastery.mastery_score.asc())
            .limit(cap)
        )
    )
    return [_mastery_as_vocab_read(row) for row in mastery_rows]


@router.get("/practice/batch", response_model=VocabBatchStartResponse)
def start_vocab_batch(current_user: CurrentUser, db: DBSession, size: int = 10) -> VocabBatchStartResponse:
    batch = select_vocab_batch(db, current_user.id, size=size)
    remaining = _count_remaining(current_user.id, db)
    prepared = prepare_vocab_batch_exercises(db, current_user.id, batch)
    exercises = [
        VocabBatchExerciseReady(
            item_id=row["item_id"],
            exercise=_public_vocab_exercise(row["exercise"]),
            exercise_token=row["exercise_token"],
        )
        for row in prepared
    ]
    return VocabBatchStartResponse(
        batch_size=len(batch),
        total_remaining=remaining,
        items=[_item_to_read(i) for i in batch],
        exercises=exercises,
    )


@router.post("/practice/batch-summary", response_model=VocabBatchSummaryResponse)
async def vocab_batch_summary(
    payload: VocabBatchSummaryRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> VocabBatchSummaryResponse:
    if not payload.results:
        raise HTTPException(status_code=400, detail="results is required")

    raw = [row.model_dump() for row in payload.results]
    data = await generate_batch_analysis(db, raw)
    insights = [
        VocabWordInsight(
            word=str(row.get("word", "")),
            correct=bool(row.get("correct")),
            explanation=str(row.get("explanation", "")),
            tip=str(row.get("tip", "")),
        )
        for row in data.get("word_insights", [])
    ]
    return VocabBatchSummaryResponse(
        summary=str(data.get("summary", "")),
        word_insights=insights,
        encouragement=str(data.get("encouragement", "")),
    )


@router.get("/today", response_model=list[VocabularyRead])
def today_vocabulary(current_user: CurrentUser, db: DBSession) -> list[VocabularyItem]:
    today = datetime.now(UTC).date()
    items = list(
        db.scalars(
            select(VocabularyItem)
            .where(
                VocabularyItem.user_id == current_user.id,
                VocabularyItem.mastery_status.not_in(["mastered", "ignored"]),
            )
            .order_by(VocabularyItem.priority.desc(), VocabularyItem.last_seen_at.desc())
            .limit(30)
        )
    )
    return [
        item
        for item in items
        if item.last_seen_at is None or item.last_seen_at.date() == today
    ] or items[:10]


@router.get("", response_model=list[VocabularyRead])
def list_vocabulary(current_user: CurrentUser, db: DBSession) -> list[VocabularyItem]:
    return list(
        db.scalars(
            select(VocabularyItem)
            .where(VocabularyItem.user_id == current_user.id)
            .order_by(VocabularyItem.priority.desc(), VocabularyItem.created_at.desc())
        )
    )


@router.get("/{item_id}/practice", response_model=VocabPracticeResponse)
def get_vocab_practice(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> VocabPracticeResponse:
    item = _resolve_vocab_item(item_id, current_user.id, db)
    exercise = generate_vocab_exercise(item, db=db, user_id=current_user.id)
    token = stash_exercise(current_user.id, item_id, exercise)
    return VocabPracticeResponse(
        item=_item_to_read(item),
        exercise=_public_vocab_exercise(exercise),
        exercise_token=token,
        message="Vocabulary exercise ready",
    )


@router.post("/{item_id}/practice", response_model=VocabPracticeResponse)
def practice_vocabulary(
    item_id: str,
    payload: VocabPracticeSubmit,
    current_user: CurrentUser,
    db: DBSession,
) -> VocabPracticeResponse:
    item = _resolve_vocab_item(item_id, current_user.id, db)

    if not payload.answer.strip():
        exercise = generate_vocab_exercise(item, db=db, user_id=current_user.id)
        token = stash_exercise(current_user.id, item_id, exercise)
        return VocabPracticeResponse(
            item=_item_to_read(item),
            exercise=_public_vocab_exercise(exercise),
            exercise_token=token,
            message="Vocabulary exercise generated",
        )

    exercise = take_exercise(current_user.id, item_id, payload.exercise_token.strip())
    if not exercise:
        raise HTTPException(status_code=400, detail="练习已过期，请重新获取题目")

    correct = grade_vocab_answer(exercise, payload.answer.strip())
    message = apply_vocab_practice_result(item, correct=correct)
    item = _persist_vocab_result(item, db)

    return VocabPracticeResponse(
        item=_item_to_read(item),
        exercise=_public_vocab_exercise(exercise),
        exercise_token=payload.exercise_token,
        correct=correct,
        message=message,
    )


@router.post("/{item_id}/mastered", response_model=VocabularyRead)
def mark_vocabulary_mastered(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> VocabularyItem:
    item = _get_item(item_id, current_user.id, db)
    item.mastery_status = "mastered"
    item.mastery_score = 100.0
    item.updated_at = utc_now()
    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/mark-mastered", response_model=VocabularyRead)
def mark_vocabulary_mastered_alias(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> VocabularyItem:
    return mark_vocabulary_mastered(item_id, current_user.id, db)


@router.post("/{item_id}/ignore", response_model=APIMessage)
def ignore_vocabulary(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> APIMessage:
    item = _get_item(item_id, current_user.id, db)
    item.mastery_status = "ignored"
    item.updated_at = utc_now()
    db.commit()
    return APIMessage(message="Vocabulary item ignored")


def _get_item(item_id: str, user_id: str, db: DBSession) -> VocabularyItem:
    item = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.id == item_id,
            VocabularyItem.user_id == user_id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Vocabulary item not found")
    return item
