"""Shared, ordered deletion of user-owned content (admin, privacy, admin_data)."""
from __future__ import annotations

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

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
    MindGraphEdge,
    MindGraphNode,
    RealtimeSessionLog,
    Report,
    Thought,
    ThoughtArgument,
    ThoughtFact,
    ThoughtValue,
    ThoughtVersion,
    Topic,
    UsageLog,
    UserAIMemory,
    UserBlock,
    UserMastery,
    UserMatchProfile,
    UserMatchSettings,
    UserPrivacySettings,
    UserProfile,
    UserValueProfile,
    VocabularyItem,
    VoiceSession,
)


def delete_expression_assets_by_ids(db: Session, asset_ids: list[str]) -> int:
    if not asset_ids:
        return 0
    db.execute(delete(ExpressionAssetVersion).where(ExpressionAssetVersion.asset_id.in_(asset_ids)))
    return db.execute(delete(ExpressionAsset).where(ExpressionAsset.id.in_(asset_ids))).rowcount


def delete_thoughts_by_ids(db: Session, thought_ids: list[str]) -> int:
    if not thought_ids:
        return 0

    asset_ids = list(db.scalars(
        select(ExpressionAsset.id).where(ExpressionAsset.thought_id.in_(thought_ids))
    ))
    delete_expression_assets_by_ids(db, asset_ids)

    db.execute(delete(ThoughtFact).where(ThoughtFact.thought_id.in_(thought_ids)))
    db.execute(delete(ThoughtValue).where(ThoughtValue.thought_id.in_(thought_ids)))
    db.execute(delete(ThoughtArgument).where(ThoughtArgument.thought_id.in_(thought_ids)))

    node_ids = list(db.scalars(
        select(MindGraphNode.id).where(MindGraphNode.thought_id.in_(thought_ids))
    ))
    if node_ids:
        db.execute(delete(MindGraphEdge).where(
            (MindGraphEdge.source_node_id.in_(node_ids)) | (MindGraphEdge.target_node_id.in_(node_ids))
        ))
        db.execute(delete(MindGraphNode).where(MindGraphNode.id.in_(node_ids)))

    db.execute(update(Topic).where(Topic.thought_id.in_(thought_ids)).values(thought_id=None))
    db.execute(delete(ThoughtVersion).where(ThoughtVersion.thought_id.in_(thought_ids)))
    return db.execute(delete(Thought).where(Thought.id.in_(thought_ids))).rowcount


def delete_conversations_by_ids(db: Session, conversation_ids: list[str]) -> int:
    if not conversation_ids:
        return 0

    linked_thought_ids = list(db.scalars(
        select(Thought.id).where(Thought.conversation_id.in_(conversation_ids))
    ))
    delete_thoughts_by_ids(db, linked_thought_ids)

    db.execute(update(VoiceSession).where(
        VoiceSession.conversation_id.in_(conversation_ids)
    ).values(conversation_id=None))
    db.execute(update(VocabularyItem).where(
        VocabularyItem.source_conversation_id.in_(conversation_ids)
    ).values(source_conversation_id=None))

    db.execute(delete(ConversationMessage).where(
        ConversationMessage.conversation_id.in_(conversation_ids)
    ))
    return db.execute(delete(Conversation).where(Conversation.id.in_(conversation_ids))).rowcount


def delete_game_sessions_by_ids(db: Session, session_ids: list[str]) -> int:
    if not session_ids:
        return 0
    db.execute(delete(GameTurn).where(GameTurn.session_id.in_(session_ids)))
    return db.execute(delete(GameSession).where(GameSession.id.in_(session_ids))).rowcount


def purge_user_owned_content(db: Session, user_id: str) -> dict[str, int]:
    """Erase all content owned by *user_id* but keep the users row."""
    counts: dict[str, int] = {}

    conv_ids = list(db.scalars(select(Conversation.id).where(Conversation.user_id == user_id)))
    counts["conversations"] = delete_conversations_by_ids(db, conv_ids)

    thought_ids = list(db.scalars(select(Thought.id).where(Thought.user_id == user_id)))
    counts["thoughts"] = delete_thoughts_by_ids(db, thought_ids)

    asset_ids = list(db.scalars(select(ExpressionAsset.id).where(ExpressionAsset.user_id == user_id)))
    counts["expression_assets"] = delete_expression_assets_by_ids(db, asset_ids)

    sess_ids = list(db.scalars(select(GameSession.id).where(GameSession.user_id == user_id)))
    counts["game_sessions"] = delete_game_sessions_by_ids(db, sess_ids)

    counts["circle_messages"] = db.execute(
        delete(CircleMessage).where(CircleMessage.user_id == user_id)
    ).rowcount
    counts["circle_members"] = db.execute(
        delete(CircleMember).where(CircleMember.user_id == user_id)
    ).rowcount

    counts["match_requests"] = db.execute(delete(MatchRequest).where(
        (MatchRequest.from_user_id == user_id) | (MatchRequest.to_user_id == user_id)
    )).rowcount
    counts["match_recommendations"] = db.execute(delete(MatchRecommendation).where(
        (MatchRecommendation.user_id == user_id) | (MatchRecommendation.target_user_id == user_id)
    )).rowcount
    counts["match_reports"] = db.execute(
        delete(MatchAnalysisReport).where(MatchAnalysisReport.user_id == user_id)
    ).rowcount

    db.execute(delete(UserMatchProfile).where(UserMatchProfile.user_id == user_id))
    db.execute(delete(UserValueProfile).where(UserValueProfile.user_id == user_id))
    db.execute(delete(UserMastery).where(UserMastery.user_id == user_id))
    db.execute(delete(VocabularyItem).where(VocabularyItem.user_id == user_id))
    db.execute(delete(UserAIMemory).where(UserAIMemory.user_id == user_id))
    db.execute(delete(VoiceSession).where(VoiceSession.user_id == user_id))
    db.execute(delete(RealtimeSessionLog).where(RealtimeSessionLog.user_id == user_id))
    counts["reports"] = db.execute(delete(Report).where(Report.reporter_id == user_id)).rowcount
    counts["usage_logs"] = db.execute(delete(UsageLog).where(UsageLog.user_id == user_id)).rowcount

    node_ids = list(db.scalars(select(MindGraphNode.id).where(MindGraphNode.user_id == user_id)))
    if node_ids:
        db.execute(delete(MindGraphEdge).where(
            (MindGraphEdge.source_node_id.in_(node_ids)) | (MindGraphEdge.target_node_id.in_(node_ids))
        ))
        db.execute(delete(MindGraphNode).where(MindGraphNode.user_id == user_id))

    return counts


def delete_user_account(db: Session, user_id: str) -> dict[str, int]:
    """Purge owned content then remove profile/settings and the user row."""
    counts = purge_user_owned_content(db, user_id)

    db.execute(delete(UserBlock).where(
        (UserBlock.blocker_id == user_id) | (UserBlock.blocked_id == user_id)
    ))
    db.execute(delete(UserMatchSettings).where(UserMatchSettings.user_id == user_id))
    db.execute(delete(UserPrivacySettings).where(UserPrivacySettings.user_id == user_id))
    db.execute(delete(UserProfile).where(UserProfile.user_id == user_id))

    from app.models import User

    user = db.get(User, user_id)
    if user:
        db.delete(user)
        counts["users"] = 1
    return counts
