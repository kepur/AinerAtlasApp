"""Authenticated, language-scoped course runner. No new tables or LLM required."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.models import (
    Conversation,
    ExpressionAsset,
    GameSession,
    LanguagePracticeAttempt,
    UserMastery,
    VocabularyItem,
    utc_now,
)
from app.services.language_course_progress import (
    get_or_create_course_progress,
    progress_payload,
    record_course_attempt,
)
from app.services.learning_curriculum import (
    VERSION,
    bridge_review_item,
    language_pack,
    module_state,
    path_payload,
)
from app.services.learning_language import learning_language

router = APIRouter(prefix="/learning", tags=["learning"])


def _context(db, user_id, language):
    code = learning_language(db, user_id, language)
    pack = language_pack(code)
    progress = get_or_create_course_progress(db, user_id, code)
    return pack, progress


@router.get("/path")
def learning_path(current_user: CurrentUser, db: DBSession, language: str | None = None):
    pack, progress = _context(db, current_user.id, language)
    db.commit()
    return {**path_payload(progress, pack), "practice": progress_payload(db, progress)}


@router.get("/modules/{module_id}")
def course_module(
    module_id: str, current_user: CurrentUser, db: DBSession, language: str | None = None
):
    pack, progress = _context(db, current_user.id, language)
    path = path_payload(progress, pack)
    module = next((m for m in path["modules"] if m["id"] == module_id), None)
    if not module:
        raise HTTPException(404, "课程模块不存在")
    db.commit()
    # Preview allowed, but later modules cannot be assessed before prerequisites.
    return {
        **module,
        "language": pack["language"],
        "name": pack["name"],
        "voice": pack["voice"],
        "lessons": [
            {k: v for k, v in r.items() if k != "answer"} for r in pack["lessons"][module_id]
        ],
        "state": module_state(progress, module_id),
    }


class LessonAnswer(BaseModel):
    language: str
    lesson_id: str = Field(max_length=100)
    answer: str = Field(max_length=1000)
    request_id: str = Field(min_length=8, max_length=80)


@router.post("/modules/{module_id}/answer")
def answer_lesson(module_id: str, payload: LessonAnswer, current_user: CurrentUser, db: DBSession):
    pack, progress = _context(db, current_user.id, payload.language)
    # Serialize JSON progress updates on databases supporting row locks.
    db.refresh(progress, with_for_update=True)
    path = path_payload(progress, pack)
    module = next((m for m in path["modules"] if m["id"] == module_id), None)
    if not module:
        raise HTTPException(404, "课程模块不存在")
    if not module["unlocked"]:
        raise HTTPException(409, "请先完成前面的模块")
    lesson = next((r for r in pack["lessons"][module_id] if r["id"] == payload.lesson_id), None)
    if not lesson:
        raise HTTPException(404, "课程课时不存在")
    if payload.answer not in lesson["options"]:
        raise HTTPException(422, "请选择本题提供的选项")
    state = module_state(progress, module_id)
    completed = set(state.get("completed", []))
    if payload.lesson_id not in completed and payload.lesson_id != module["next_lesson"]:
        raise HTTPException(409, "请按课时顺序练习")
    # Same request retried after a network failure must not increase daily counters.
    recent = state.get("requests", {})
    if payload.request_id in recent:
        return recent[payload.request_id]
    correct = payload.answer == lesson["answer"]
    mistakes = set(state.get("mistakes", []))
    if correct:
        completed.add(payload.lesson_id)
        mistakes.discard(payload.lesson_id)
    else:
        mistakes.add(payload.lesson_id)
    state.update(
        completed=sorted(completed), mistakes=sorted(mistakes), last_lesson=payload.lesson_id
    )
    all_state = dict(progress.state or {})
    curriculum = dict(all_state.get(VERSION, {}))
    curriculum[module_id] = state
    all_state[VERSION] = curriculum
    progress.state = all_state
    result = dict(
        correct=correct,
        expected_answer=lesson["answer"],
        explanation=lesson["rule"],
        path=path_payload(progress, pack),
    )
    state["requests"] = {**dict(list(recent.items())[-19:]), payload.request_id: result}
    progress.state = {**all_state, VERSION: {**curriculum, module_id: state}}
    bridge_review_item(db, current_user.id, pack["language"], module_id, lesson, correct=correct)
    record_course_attempt(
        db,
        progress,
        activity_type=f"module:{module_id}",
        item_id=f"{module_id}:{payload.lesson_id}",
        correct=correct,
        user_answer=payload.answer,
        expected_answer=lesson["answer"],
        native_meaning=lesson["meaning"],
        details={"request_id": payload.request_id},
        add_vocabulary=False,
    )
    return result


@router.get("/summary")
def learning_summary(current_user: CurrentUser, db: DBSession, language: str | None = None):
    pack, progress = _context(db, current_user.id, language)
    code, uid = pack["language"], current_user.id

    def count(model, lang_column, *conditions):
        return (
            db.scalar(
                select(func.count())
                .select_from(model)
                .where(model.user_id == uid, lang_column == code, *conditions)
            )
            or 0
        )

    today = utc_now().date()
    week = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        total = count(
            LanguagePracticeAttempt,
            LanguagePracticeAttempt.language_code,
            LanguagePracticeAttempt.practiced_on == day,
        )
        correct = count(
            LanguagePracticeAttempt,
            LanguagePracticeAttempt.language_code,
            LanguagePracticeAttempt.practiced_on == day,
            LanguagePracticeAttempt.correct.is_(True),
        )
        week.append(dict(date=day.isoformat(), attempts=total, correct=correct))
    db.commit()
    return dict(
        language=code,
        name=pack["name"],
        path=path_payload(progress, pack),
        practice=progress_payload(db, progress),
        week=week,
        vocabulary=count(VocabularyItem, VocabularyItem.language_code),
        mastered_words=count(
            VocabularyItem,
            VocabularyItem.language_code,
            VocabularyItem.mastery_status == "mastered",
        ),
        patterns=count(
            UserMastery, UserMastery.language_code, UserMastery.item_type != "vocabulary"
        ),
        conversations=count(
            Conversation, Conversation.target_language, Conversation.deleted_at.is_(None)
        ),
        assets=count(ExpressionAsset, ExpressionAsset.target_language),
        games=count(GameSession, GameSession.target_language),
    )
