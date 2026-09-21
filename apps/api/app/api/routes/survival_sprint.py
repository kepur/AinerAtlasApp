from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DBSession
from app.models import LanguageCourseProgress, UserProfile, VocabularyItem
from app.services.language_course_progress import (
    COURSE_CODE,
    get_or_create_course_progress,
    normalise_course_language,
    progress_payload,
    record_course_attempt,
    save_course_position,
)
from app.services.survival_course_catalog import (
    COURSE_LANGUAGES,
    supported_course_catalog,
)
from app.services.survival_sprint import find_engine_item, get_survival_sprint

router = APIRouter(prefix="/survival-sprint", tags=["survival-sprint"])


class GapRequest(BaseModel):
    concept_id: str
    language: str = "sr"


class LanguageSelection(BaseModel):
    language: str


class PositionUpdate(BaseModel):
    language: str = "sr"
    current_step: int = Field(ge=0, le=4)
    scenario_index: int = Field(default=0, ge=0)
    turn_index: int = Field(default=0, ge=0)


class PracticeAttemptCreate(BaseModel):
    language: str = "sr"
    activity_type: str = "scenario"
    item_id: str = Field(min_length=1, max_length=160)
    correct: bool
    user_answer: str = ""
    expected_answer: str = ""
    native_meaning: str = ""
    details: dict[str, Any] = Field(default_factory=dict)


def _supported_language(language: str) -> str:
    code = normalise_course_language(language)
    if code not in COURSE_LANGUAGES:
        raise HTTPException(status_code=404, detail="Unsupported Survival Sprint language")
    return code


def _profile(db: DBSession, user_id: str) -> UserProfile | None:
    return db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))


@router.get("/catalog")
def read_course_catalog(current_user: CurrentUser, db: DBSession) -> dict:
    profile = _profile(db, current_user.id)
    rows = db.scalars(
        select(LanguageCourseProgress).where(
            LanguageCourseProgress.user_id == current_user.id,
            LanguageCourseProgress.course_code == COURSE_CODE,
        )
    ).all()
    progress_by_language = {row.language_code: row for row in rows}
    languages = []
    for item in supported_course_catalog():
        progress = progress_by_language.get(item["code"])
        from app.services.learning_curriculum import language_pack, path_payload
        curriculum = path_payload(progress, language_pack(item["code"])) if progress else None
        languages.append({
            **item,
            "progress": progress_payload(db, progress) if progress else None,
            "curriculum": curriculum,
        })
    selected = normalise_course_language(
        profile.primary_target_language if profile else "sr"
    )
    if selected not in COURSE_LANGUAGES:
        selected = "sr"
    return {
        "selected_language": selected,
        "target_languages": profile.target_languages if profile else ["sr"],
        "languages": languages,
    }


@router.post("/select-language")
def select_course_language(
    payload: LanguageSelection,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    language = _supported_language(payload.language)
    profile = _profile(db, current_user.id)
    if not profile:
        profile = UserProfile(
            user_id=current_user.id,
            target_languages=[language],
            primary_target_language=language,
        )
        db.add(profile)
    else:
        target_languages = list(profile.target_languages or [])
        if language not in target_languages:
            target_languages.append(language)
        profile.target_languages = target_languages
        profile.primary_target_language = language
    progress = get_or_create_course_progress(db, current_user.id, language)
    db.commit()
    db.refresh(progress)
    return {
        "selected_language": language,
        "target_languages": profile.target_languages,
        "progress": progress_payload(db, progress),
    }


@router.get("")
def read_survival_sprint(
    current_user: CurrentUser,
    db: DBSession,
    language: str = "sr",
) -> dict:
    code = _supported_language(language)
    data = get_survival_sprint(code)
    profile = _profile(db, current_user.id)
    progress = get_or_create_course_progress(db, current_user.id, code)
    db.commit()
    db.refresh(progress)
    review_count = db.scalar(
        select(func.count())
        .select_from(VocabularyItem)
        .where(
            VocabularyItem.user_id == current_user.id,
            VocabularyItem.language_code == code,
            or_(
                VocabularyItem.topic.like("survival:%"),
                VocabularyItem.topic.like(f"course:{COURSE_CODE}:%"),
            ),
            VocabularyItem.mastery_status.not_in(["mastered", "ignored"]),
        )
    ) or 0
    data["learner"] = {
        "native_language": profile.native_language if profile else "zh",
        "current_target_language": code,
        "current_level": profile.current_level if profile else "A0",
        "review_gap_count": int(review_count),
        "target_languages": profile.target_languages if profile else [code],
        "progress": progress_payload(db, progress),
    }
    return data


@router.put("/progress")
def update_course_progress(
    payload: PositionUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    language = _supported_language(payload.language)
    progress = get_or_create_course_progress(db, current_user.id, language)
    return save_course_position(
        db,
        progress,
        current_step=payload.current_step,
        scenario_index=payload.scenario_index,
        turn_index=payload.turn_index,
    )


@router.post("/attempt")
def create_practice_attempt(
    payload: PracticeAttemptCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    language = _supported_language(payload.language)
    progress = get_or_create_course_progress(db, current_user.id, language)
    return record_course_attempt(
        db,
        progress,
        activity_type=payload.activity_type,
        item_id=payload.item_id,
        correct=payload.correct,
        user_answer=payload.user_answer,
        expected_answer=payload.expected_answer,
        native_meaning=payload.native_meaning,
        details=payload.details,
    )


@router.post("/review-gap")
def add_review_gap(payload: GapRequest, current_user: CurrentUser, db: DBSession) -> dict:
    language = _supported_language(payload.language)
    item = find_engine_item(payload.concept_id.strip(), language)
    if not item:
        raise HTTPException(status_code=404, detail="Unknown Survival Sprint concept")

    topic = f"survival:{item['concept_id']}"
    row = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.user_id == current_user.id,
            VocabularyItem.language_code == language,
            VocabularyItem.topic == topic,
        )
    )
    if row:
        row.mastery_status = "reviewing"
        row.priority = max(row.priority, 5)
    else:
        row = VocabularyItem(
            user_id=current_user.id,
            word=item["target"],
            meaning=item["intent"],
            topic=topic,
            language_code=language,
            mastery_status="reviewing",
            mastery_score=10,
            examples=[example["target"] for example in item["examples"]],
            priority=5,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "item_id": row.id,
        "concept_id": item["concept_id"],
        "language": language,
        "status": row.mastery_status,
        "message": "已加入现有词汇复习队列。",
    }
