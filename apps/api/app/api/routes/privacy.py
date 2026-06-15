from fastapi import APIRouter, HTTPException
from sqlalchemy import delete, select

from app.api.deps import CurrentUser, DBSession
from app.models import (
    Conversation,
    ConversationMessage,
    ExpressionAsset,
    MatchRecommendation,
    Thought,
    UserAIMemory,
    UserBlock,
    UserMatchSettings,
    UserMastery,
    UserPrivacySettings,
    VoiceSession,
)
from app.schemas import PrivacySettingsRead, PrivacySettingsUpdate

router = APIRouter(prefix="/privacy", tags=["privacy"])


def _get_or_create_privacy(user_id: str, db: DBSession) -> UserPrivacySettings:
    settings = db.scalar(
        select(UserPrivacySettings).where(UserPrivacySettings.user_id == user_id)
    )
    if not settings:
        settings = UserPrivacySettings(user_id=user_id)
        db.add(settings)
        db.flush()
    return settings


@router.get("/settings", response_model=PrivacySettingsRead)
def get_privacy_settings(current_user: CurrentUser, db: DBSession) -> PrivacySettingsRead:
    privacy = _get_or_create_privacy(current_user.id, db)
    match_settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    db.commit()
    return PrivacySettingsRead(
        match_profile_visible=privacy.match_profile_visible,
        data_retention_days=privacy.data_retention_days,
        allow_analytics=privacy.allow_analytics,
        public_scope=privacy.public_scope,
        match_enabled=match_settings.enabled if match_settings else False,
    )


@router.put("/settings", response_model=PrivacySettingsRead)
def update_privacy_settings(
    payload: PrivacySettingsUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> PrivacySettingsRead:
    privacy = _get_or_create_privacy(current_user.id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "match_enabled":
            match_settings = db.scalar(
                select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
            )
            if not match_settings:
                match_settings = UserMatchSettings(user_id=current_user.id)
                db.add(match_settings)
            match_settings.enabled = value
        else:
            setattr(privacy, field, value)
    db.commit()
    return get_privacy_settings(current_user, db)


@router.post("/delete-data")
def delete_personal_data(current_user: CurrentUser, db: DBSession) -> dict:
    uid = current_user.id
    db.execute(delete(ConversationMessage).where(
        ConversationMessage.conversation_id.in_(
            select(Conversation.id).where(Conversation.user_id == uid)
        )
    ))
    db.execute(delete(Conversation).where(Conversation.user_id == uid))
    db.execute(delete(Thought).where(Thought.user_id == uid))
    db.execute(delete(ExpressionAsset).where(ExpressionAsset.user_id == uid))
    db.execute(delete(UserMastery).where(UserMastery.user_id == uid))
    db.execute(delete(UserAIMemory).where(UserAIMemory.user_id == uid))
    db.execute(delete(VoiceSession).where(VoiceSession.user_id == uid))
    db.execute(delete(MatchRecommendation).where(MatchRecommendation.user_id == uid))
    db.commit()
    return {"message": "个人数据已清除", "deleted": True}


@router.post("/disable-matching")
def disable_matching_profile(current_user: CurrentUser, db: DBSession) -> dict:
    match_settings = db.scalar(
        select(UserMatchSettings).where(UserMatchSettings.user_id == current_user.id)
    )
    if match_settings:
        match_settings.enabled = False
    privacy = _get_or_create_privacy(current_user.id, db)
    privacy.match_profile_visible = False
    db.commit()
    return {"message": "匹配画像已关闭", "match_enabled": False}
