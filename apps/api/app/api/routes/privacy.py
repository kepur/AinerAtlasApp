from fastapi import APIRouter, HTTPException
from sqlalchemy import delete, select

from app.api.deps import CurrentUser, DBSession
from app.models import (
    CircleMember,
    CircleMessage,
    Conversation,
    ConversationMessage,
    ExpressionAsset,
    ExpressionAssetVersion,
    GameSession,
    GameTurn,
    MatchAnalysisReport,
    MatchRecommendation,
    MatchRequest,
    RealtimeSessionLog,
    Report,
    Thought,
    ThoughtVersion,
    UserAIMemory,
    UserBlock,
    UserMatchProfile,
    UserMatchSettings,
    UserMastery,
    UserPrivacySettings,
    UserValueProfile,
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
    """Erase all data owned by the requesting user. Children are deleted before
    parents so foreign keys stay satisfied and no orphan rows are left behind."""
    uid = current_user.id

    # Conversations + their messages
    conv_ids = list(db.scalars(select(Conversation.id).where(Conversation.user_id == uid)))
    if conv_ids:
        db.execute(delete(ConversationMessage).where(ConversationMessage.conversation_id.in_(conv_ids)))
    db.execute(delete(Conversation).where(Conversation.user_id == uid))

    # Thoughts + versions
    thought_ids = list(db.scalars(select(Thought.id).where(Thought.user_id == uid)))
    if thought_ids:
        db.execute(delete(ThoughtVersion).where(ThoughtVersion.thought_id.in_(thought_ids)))
    db.execute(delete(Thought).where(Thought.user_id == uid))

    # Expression assets + versions
    asset_ids = list(db.scalars(select(ExpressionAsset.id).where(ExpressionAsset.user_id == uid)))
    if asset_ids:
        db.execute(delete(ExpressionAssetVersion).where(ExpressionAssetVersion.asset_id.in_(asset_ids)))
    db.execute(delete(ExpressionAsset).where(ExpressionAsset.user_id == uid))

    # Game sessions + turns
    sess_ids = list(db.scalars(select(GameSession.id).where(GameSession.user_id == uid)))
    if sess_ids:
        db.execute(delete(GameTurn).where(GameTurn.session_id.in_(sess_ids)))
    db.execute(delete(GameSession).where(GameSession.user_id == uid))

    # Circle membership + the user's own messages (rooms shared with others stay)
    db.execute(delete(CircleMessage).where(CircleMessage.user_id == uid))
    db.execute(delete(CircleMember).where(CircleMember.user_id == uid))

    # Matching graph (requests both directions, recommendations both directions)
    db.execute(delete(MatchRequest).where((MatchRequest.from_user_id == uid) | (MatchRequest.to_user_id == uid)))
    db.execute(delete(MatchRecommendation).where((MatchRecommendation.user_id == uid) | (MatchRecommendation.target_user_id == uid)))
    db.execute(delete(MatchAnalysisReport).where(MatchAnalysisReport.user_id == uid))
    db.execute(delete(UserMatchProfile).where(UserMatchProfile.user_id == uid))
    db.execute(delete(UserValueProfile).where(UserValueProfile.user_id == uid))

    # Learning + voice + misc
    db.execute(delete(UserMastery).where(UserMastery.user_id == uid))
    db.execute(delete(UserAIMemory).where(UserAIMemory.user_id == uid))
    db.execute(delete(VoiceSession).where(VoiceSession.user_id == uid))
    db.execute(delete(RealtimeSessionLog).where(RealtimeSessionLog.user_id == uid))
    db.execute(delete(Report).where(Report.reporter_id == uid))

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
