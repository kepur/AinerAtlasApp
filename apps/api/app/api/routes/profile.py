from fastapi import APIRouter, File, UploadFile
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models import User, UserAIMemory, UserMatchProfile, UserProfile
from app.schemas import AIMemoryRead, AIMemoryUpsert, APIMessage, ProfileRead, ProfileUpsert
from app.services.ai_memory import upsert_memory
from app.services.avatar_storage import save_user_avatar

router = APIRouter(prefix="/profile", tags=["profile"])


def _sync_match_birthday(db: DBSession, user_id: str, birthday) -> None:
    if birthday is None:
        return
    match_profile = db.scalar(select(UserMatchProfile).where(UserMatchProfile.user_id == user_id))
    if not match_profile:
        match_profile = UserMatchProfile(user_id=user_id)
        db.add(match_profile)
    match_profile.birthday = birthday


@router.get("", response_model=ProfileRead)
def get_profile(current_user: CurrentUser, db: DBSession) -> UserProfile:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


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

    data = payload.model_dump(exclude={"username"})
    username = payload.username
    for field, value in data.items():
        setattr(profile, field, value)

    if username is not None:
        user = db.get(User, current_user.id)
        if user:
            cleaned = username.strip()
            if cleaned:
                user.username = cleaned[:120]

    _sync_match_birthday(db, current_user.id, profile.birthday)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/avatar", response_model=ProfileRead)
async def upload_avatar(
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
) -> UserProfile:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.flush()

    profile.avatar_url = await save_user_avatar(current_user.id, file)
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
