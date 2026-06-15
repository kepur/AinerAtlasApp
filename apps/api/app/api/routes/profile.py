from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models import UserAIMemory, UserProfile
from app.schemas import AIMemoryRead, AIMemoryUpsert, APIMessage, ProfileRead, ProfileUpsert
from app.services.ai_memory import upsert_memory

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileRead)
def get_profile(current_user: CurrentUser, db: DBSession) -> UserProfile:
    return db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))


@router.put("", response_model=ProfileRead)
def update_profile(
    payload: ProfileUpsert,
    current_user: CurrentUser,
    db: DBSession,
) -> UserProfile:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/onboarding", response_model=APIMessage)
def complete_onboarding(
    payload: ProfileUpsert,
    current_user: CurrentUser,
    db: DBSession,
) -> APIMessage:
    update_profile(payload, current_user, db)
    db.add(
        UserAIMemory(
            user_id=current_user.id,
            memory_type="onboarding_summary",
            content=(
                f"Native language: {payload.native_language}; "
                f"target: {payload.primary_target_language}; "
                f"goals: {', '.join(payload.learning_goals)}; "
                f"topics: {', '.join(payload.favorite_topics)}; "
                f"coach: {payload.coach_style}; correction: {payload.correction_style}."
            ),
            source="onboarding",
            confidence=0.9,
        )
    )
    db.commit()
    return APIMessage(message="Onboarding profile saved")


@router.get("/ai-memory", response_model=list[AIMemoryRead])
def get_ai_memory(current_user: CurrentUser, db: DBSession) -> list[UserAIMemory]:
    return list(
        db.scalars(
            select(UserAIMemory)
            .where(UserAIMemory.user_id == current_user.id)
            .order_by(UserAIMemory.created_at.desc())
        )
    )


@router.put("/ai-memory", response_model=list[AIMemoryRead])
def update_ai_memory(
    payload: AIMemoryUpsert,
    current_user: CurrentUser,
    db: DBSession,
) -> list[UserAIMemory]:
    if payload.summary:
        upsert_memory(
            db,
            current_user.id,
            "user_summary",
            payload.summary,
            source="profile",
            confidence=0.95,
        )

    for entry in payload.memories:
        memory_type = str(entry.get("memory_type", "")).strip()
        content = str(entry.get("content", "")).strip()
        if not memory_type or not content:
            continue
        upsert_memory(
            db,
            current_user.id,
            memory_type,
            content,
            source=str(entry.get("source", "profile")),
            confidence=float(entry.get("confidence", 0.8)),
        )

    db.commit()
    return get_ai_memory(current_user, db)
