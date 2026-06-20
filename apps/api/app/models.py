from datetime import UTC, datetime, date
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(120), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(40), default="user")
    membership_level: Mapped[str] = mapped_column(String(40), default="free")
    membership_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(40), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    profile: Mapped["UserProfile"] = relationship(back_populates="user", uselist=False)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    native_language: Mapped[str] = mapped_column(String(20), default="zh")
    target_languages: Mapped[list[str]] = mapped_column(JSON, default=lambda: ["en"])
    primary_target_language: Mapped[str] = mapped_column(String(20), default="en")
    current_level: Mapped[str] = mapped_column(String(20), default="B1")
    learning_goals: Mapped[list[str]] = mapped_column(JSON, default=list)
    favorite_topics: Mapped[list[str]] = mapped_column(JSON, default=list)
    correction_style: Mapped[str] = mapped_column(String(40), default="balanced")
    coach_style: Mapped[str] = mapped_column(String(40), default="socratic")
    explanation_language: Mapped[str] = mapped_column(String(20), default="zh")
    ui_language: Mapped[str] = mapped_column(String(20), default="zh")
    ui_theme: Mapped[str] = mapped_column(String(20), default="dark")
    voice_preference: Mapped[str] = mapped_column(String(60), default="warm-neutral")
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(512), default="")
    gender_identity: Mapped[str] = mapped_column(String(40), default="")
    gender_custom: Mapped[str] = mapped_column(String(120), default="")
    sexual_orientation: Mapped[str] = mapped_column(String(40), default="")
    orientation_custom: Mapped[str] = mapped_column(String(120), default="")
    lgbtq_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    speaking_confidence_score: Mapped[float] = mapped_column(Float, default=50)
    writing_confidence_score: Mapped[float] = mapped_column(Float, default=50)
    grammar_level_score: Mapped[float] = mapped_column(Float, default=50)
    vocabulary_level_score: Mapped[float] = mapped_column(Float, default=50)
    fluency_score: Mapped[float] = mapped_column(Float, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    user: Mapped[User] = relationship(back_populates="profile")


class UserAIMemory(Base):
    __tablename__ = "user_ai_memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    memory_type: Mapped[str] = mapped_column(String(60), index=True)
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(80), default="system")
    confidence: Mapped[float] = mapped_column(Float, default=0.7)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    topic: Mapped[str] = mapped_column(String(120), default="free-talk")
    mode: Mapped[str] = mapped_column(String(80), default="socratic")
    native_language: Mapped[str] = mapped_column(String(20), default="zh")
    target_language: Mapped[str] = mapped_column(String(20), default="en")
    status: Mapped[str] = mapped_column(String(40), default="active")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    deleted_by: Mapped[str] = mapped_column(String(40), default="")
    moderation_status: Mapped[str] = mapped_column(String(40), default="clean", index=True)
    moderation_reason: Mapped[str] = mapped_column(String(512), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    messages: Mapped[list["ConversationMessage"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(30))
    content: Mapped[str] = mapped_column(Text)
    content_language: Mapped[str] = mapped_column(String(20), default="auto")
    translated_content: Mapped[str] = mapped_column(Text, default="")
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    expression_versions: Mapped[dict] = mapped_column(JSON, default=dict)
    audio_url: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class ConversationActivityLog(Base):
    __tablename__ = "conversation_activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    conversation_id: Mapped[str] = mapped_column(String(36), index=True)
    message_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Thought(Base):
    __tablename__ = "thoughts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    conversation_id: Mapped[str | None] = mapped_column(ForeignKey("conversations.id"))
    title: Mapped[str] = mapped_column(String(255))
    topic: Mapped[str] = mapped_column(String(120), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    final_content_native: Mapped[str] = mapped_column(Text, default="")
    final_content_target: Mapped[str] = mapped_column(Text, default="")
    freeze_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    mind_graph: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(40), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    frozen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class ThoughtVersion(Base):
    __tablename__ = "thought_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    thought_id: Mapped[str] = mapped_column(ForeignKey("thoughts.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    final_content_native: Mapped[str] = mapped_column(Text, default="")
    final_content_target: Mapped[str] = mapped_column(Text, default="")
    freeze_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    mind_graph: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ExpressionAsset(Base):
    __tablename__ = "expression_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    thought_id: Mapped[str | None] = mapped_column(ForeignKey("thoughts.id"))
    title: Mapped[str] = mapped_column(String(255))
    source_text: Mapped[str] = mapped_column(Text)
    target_language: Mapped[str] = mapped_column(String(20), default="en")
    variants: Mapped[dict] = mapped_column(JSON, default=dict)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    patterns: Mapped[list[str]] = mapped_column(JSON, default=list)
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class ExpressionAssetVersion(Base):
    __tablename__ = "expression_asset_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    asset_id: Mapped[str] = mapped_column(ForeignKey("expression_assets.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    variants: Mapped[dict] = mapped_column(JSON, default=dict)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    patterns: Mapped[list[str]] = mapped_column(JSON, default=list)
    note: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class VocabularyItem(Base):
    __tablename__ = "vocabulary_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    word: Mapped[str] = mapped_column(String(120), index=True)
    meaning: Mapped[str] = mapped_column(Text, default="")
    topic: Mapped[str] = mapped_column(String(120), default="")
    language_code: Mapped[str] = mapped_column(String(20), default="en")
    mastery_status: Mapped[str] = mapped_column(String(40), default="seen")
    mastery_score: Mapped[float] = mapped_column(Float, default=20.0)
    examples: Mapped[list] = mapped_column(JSON, default=list)
    priority: Mapped[int] = mapped_column(Integer, default=3)
    source_conversation_id: Mapped[str | None] = mapped_column(ForeignKey("conversations.id"))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class GrammarPattern(Base):
    __tablename__ = "grammar_patterns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255))
    language_code: Mapped[str] = mapped_column(String(20), default="en")
    language_pair: Mapped[str] = mapped_column(String(40), default="zh-en")
    pattern_type: Mapped[str] = mapped_column(String(60), default="grammar")
    description: Mapped[str] = mapped_column(Text, default="")
    examples: Mapped[list[str]] = mapped_column(JSON, default=list)
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserMastery(Base):
    __tablename__ = "user_mastery"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    item_type: Mapped[str] = mapped_column(String(40), default="grammar")
    item_id: Mapped[str] = mapped_column(String(120), index=True)
    title: Mapped[str] = mapped_column(String(255))
    language_code: Mapped[str] = mapped_column(String(20), default="en")
    mastery_score: Mapped[float] = mapped_column(Float, default=20)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    mistake_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="new")
    priority: Mapped[int] = mapped_column(Integer, default=3)
    examples: Mapped[list[str]] = mapped_column(JSON, default=list)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AIProvider(Base):
    __tablename__ = "ai_providers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    provider_name: Mapped[str] = mapped_column(String(120))
    provider_type: Mapped[str] = mapped_column(String(40), default="llm")
    api_base_url: Mapped[str] = mapped_column(String(500), default="")
    api_key_encrypted: Mapped[str] = mapped_column(Text, default="")
    model_name: Mapped[str] = mapped_column(String(120), default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)
    cost_weight: Mapped[float] = mapped_column(Float, default=1)
    fallback_provider: Mapped[str] = mapped_column(String(120), default="")
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    task_type: Mapped[str] = mapped_column(String(80), default="dialogue")
    version: Mapped[str] = mapped_column(String(40), default="v1.0")
    content: Mapped[str] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    provider_id: Mapped[str | None] = mapped_column(ForeignKey("ai_providers.id"), nullable=True)
    task_type: Mapped[str] = mapped_column(String(80))
    tokens_input: Mapped[int] = mapped_column(Integer, default=0)
    tokens_output: Mapped[int] = mapped_column(Integer, default=0)
    voice_seconds: Mapped[int] = mapped_column(Integer, default=0)
    cost_estimate: Mapped[float] = mapped_column(Float, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="ok")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class LLMCallLog(Base):
    __tablename__ = "llm_call_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    provider_name: Mapped[str] = mapped_column(String(80))
    model_name: Mapped[str] = mapped_column(String(80))
    method_name: Mapped[str] = mapped_column(String(80))
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    response: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(40))  # "success" or "failed"
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class VoiceSession(Base):
    __tablename__ = "voice_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    conversation_id: Mapped[str | None] = mapped_column(ForeignKey("conversations.id"))
    provider: Mapped[str] = mapped_column(String(80), default="mock")
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    transcript: Mapped[str] = mapped_column(Text, default="")
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    cost_estimate: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    admin_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    resource_type: Mapped[str] = mapped_column(String(60), default="")
    resource_id: Mapped[str] = mapped_column(String(120), default="")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class LoginLog(Base):
    __tablename__ = "login_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    ip_address: Mapped[str] = mapped_column(String(80), default="")
    user_agent: Mapped[str] = mapped_column(String(500), default="")
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    failure_reason: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserPersonalityTest(Base):
    __tablename__ = "user_personality_tests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    mbti: Mapped[str] = mapped_column(String(8), default="")
    big_five: Mapped[dict] = mapped_column(JSON, default=dict)
    constellation: Mapped[str] = mapped_column(String(40), default="")
    bazi: Mapped[str] = mapped_column(String(60), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserCommunicationProfile(Base):
    __tablename__ = "user_communication_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    reasoning_depth: Mapped[float] = mapped_column(Float, default=50)
    knowledge_breadth: Mapped[float] = mapped_column(Float, default=50)
    reflection_ability: Mapped[float] = mapped_column(Float, default=50)
    emotional_maturity: Mapped[float] = mapped_column(Float, default=50)
    communication_quality: Mapped[float] = mapped_column(Float, default=50)
    response_style: Mapped[str] = mapped_column(String(40), default="balanced")
    conversation_language: Mapped[str] = mapped_column(String(20), default="zh")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ThoughtFact(Base):
    __tablename__ = "thought_facts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    thought_id: Mapped[str] = mapped_column(ForeignKey("thoughts.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(60), default="fact")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ThoughtValue(Base):
    __tablename__ = "thought_values"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    thought_id: Mapped[str] = mapped_column(ForeignKey("thoughts.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ThoughtArgument(Base):
    __tablename__ = "thought_arguments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    thought_id: Mapped[str] = mapped_column(ForeignKey("thoughts.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    side: Mapped[str] = mapped_column(String(20), default="pro")
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MindGraphNode(Base):
    __tablename__ = "mind_graph_nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    thought_id: Mapped[str | None] = mapped_column(ForeignKey("thoughts.id"), nullable=True)
    label: Mapped[str] = mapped_column(String(255))
    node_type: Mapped[str] = mapped_column(String(40), default="topic")
    x: Mapped[float] = mapped_column(Float, default=0)
    y: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MindGraphEdge(Base):
    __tablename__ = "mind_graph_edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    source_node_id: Mapped[str] = mapped_column(ForeignKey("mind_graph_nodes.id"), index=True)
    target_node_id: Mapped[str] = mapped_column(ForeignKey("mind_graph_nodes.id"), index=True)
    label: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MatchFeedback(Base):
    __tablename__ = "match_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    from_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    to_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    recommendation_id: Mapped[str | None] = mapped_column(ForeignKey("match_recommendations.id"), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, default=3)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CircleAISummary(Base):
    __tablename__ = "circle_ai_summaries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    room_id: Mapped[str] = mapped_column(ForeignKey("circle_rooms.id"), index=True)
    summary_type: Mapped[str] = mapped_column(String(40), default="group")
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CircleCollectedViewpoint(Base):
    __tablename__ = "circle_collected_viewpoints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    room_id: Mapped[str] = mapped_column(ForeignKey("circle_rooms.id"), index=True)
    message_id: Mapped[str] = mapped_column(ForeignKey("circle_messages.id"), index=True)
    collector_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    original_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    original_content: Mapped[str] = mapped_column(Text, default="")
    my_understanding: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TopicVersion(Base):
    __tablename__ = "topic_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(255))
    background: Mapped[str] = mapped_column(Text, default="")
    pro_view: Mapped[str] = mapped_column(Text, default="")
    con_view: Mapped[str] = mapped_column(Text, default="")
    creator_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    parent_topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TopicRecommendation(Base):
    __tablename__ = "topic_recommendations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True)
    reason: Mapped[str] = mapped_column(String(255), default="")
    score: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(40), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AIProviderModel(Base):
    __tablename__ = "ai_provider_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    provider_id: Mapped[str] = mapped_column(ForeignKey("ai_providers.id"), index=True)
    model_name: Mapped[str] = mapped_column(String(120))
    task_types: Mapped[list[str]] = mapped_column(JSON, default=list)
    cost_per_1k_input: Mapped[float] = mapped_column(Float, default=0)
    cost_per_1k_output: Mapped[float] = mapped_column(Float, default=0)
    max_tokens: Mapped[int] = mapped_column(Integer, default=4096)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    template_id: Mapped[str] = mapped_column(ForeignKey("prompt_templates.id"), index=True)
    version: Mapped[str] = mapped_column(String(40), default="v1.0")
    content: Mapped[str] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PronunciationScore(Base):
    __tablename__ = "pronunciation_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    voice_session_id: Mapped[str | None] = mapped_column(ForeignKey("voice_sessions.id"), nullable=True)
    reference_text: Mapped[str] = mapped_column(Text, default="")
    spoken_text: Mapped[str] = mapped_column(Text, default="")
    fluency_score: Mapped[float] = mapped_column(Float, default=50)
    accuracy_score: Mapped[float] = mapped_column(Float, default=50)
    completeness_score: Mapped[float] = mapped_column(Float, default=50)
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class RealtimeSessionLog(Base):
    __tablename__ = "realtime_session_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String(80), default="mock")
    status: Mapped[str] = mapped_column(String(40), default="started")
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str] = mapped_column(Text, default="")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PrivacyConsent(Base):
    __tablename__ = "privacy_consents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    consent_type: Mapped[str] = mapped_column(String(80))
    version: Mapped[str] = mapped_column(String(40), default="v1.0")
    granted: Mapped[bool] = mapped_column(Boolean, default=False)
    ip_address: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DataDeletionRequest(Base):
    __tablename__ = "data_deletion_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="pending")
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserRole(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    resource_type: Mapped[str] = mapped_column(String(60), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserPermission(Base):
    __tablename__ = "user_permissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role_id: Mapped[str | None] = mapped_column(ForeignKey("roles.id"), nullable=True)
    permission_id: Mapped[str | None] = mapped_column(ForeignKey("permissions.id"), nullable=True)
    granted: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)



class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    thought_id: Mapped[str | None] = mapped_column(ForeignKey("thoughts.id"))
    parent_topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    background: Mapped[str] = mapped_column(Text, default="")
    pro_view: Mapped[str] = mapped_column(Text, default="")
    con_view: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(40), default="active")
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[str] = mapped_column(String(40), default="general")
    language: Mapped[str] = mapped_column(String(10), default="zh")
    heat: Mapped[str] = mapped_column(String(20), default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ModerationEvent(Base):
    __tablename__ = "moderation_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    content_type: Mapped[str] = mapped_column(String(60), default="")
    content_id: Mapped[str] = mapped_column(String(120), default="")
    action: Mapped[str] = mapped_column(String(40), default="flag")
    reason: Mapped[str] = mapped_column(String(255), default="")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CircleRoom(Base):
    __tablename__ = "circle_rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"))
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    room_type: Mapped[str] = mapped_column(String(40), default="roundtable")
    allowed_languages: Mapped[list[str]] = mapped_column(JSON, default=lambda: ["zh", "en"])
    status: Mapped[str] = mapped_column(String(40), default="active")
    summary: Mapped[dict] = mapped_column(JSON, default=dict)
    max_members: Mapped[int] = mapped_column(Integer, default=8)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CircleMember(Base):
    __tablename__ = "circle_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    room_id: Mapped[str] = mapped_column(ForeignKey("circle_rooms.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(40), default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CircleMessage(Base):
    __tablename__ = "circle_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    room_id: Mapped[str] = mapped_column(ForeignKey("circle_rooms.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(30), default="user")
    content: Mapped[str] = mapped_column(Text)
    content_language: Mapped[str] = mapped_column(String(20), default="auto")
    translated_content: Mapped[str] = mapped_column(Text, default="")
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserMatchSettings(Base):
    __tablename__ = "user_match_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    match_mode: Mapped[str] = mapped_column(String(40), default="language_partner")
    visibility: Mapped[str] = mapped_column(String(40), default="friends")
    profile_completeness: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class UserMatchProfile(Base):
    __tablename__ = "user_match_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    bio: Mapped[str] = mapped_column(Text, default="")
    interests: Mapped[list[str]] = mapped_column(JSON, default=list)
    target_languages: Mapped[list[str]] = mapped_column(JSON, default=list)
    values: Mapped[list[str]] = mapped_column(JSON, default=list)
    lifestyle: Mapped[list[str]] = mapped_column(JSON, default=list)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserValueProfile(Base):
    __tablename__ = "user_value_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    emotional_values: Mapped[list[str]] = mapped_column(JSON, default=list)
    lifestyle_prefs: Mapped[list[str]] = mapped_column(JSON, default=list)
    relationship_goals: Mapped[list[str]] = mapped_column(JSON, default=list)
    completeness_score: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MatchRecommendation(Base):
    __tablename__ = "match_recommendations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[float] = mapped_column(Float, default=0)
    reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(40), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MatchAnalysisReport(Base):
    __tablename__ = "match_analysis_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    report_type: Mapped[str] = mapped_column(String(40), default="weekly")
    summary: Mapped[str] = mapped_column(Text, default="")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    match_score: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserVoiceCoachProfile(Base):
    """Daily-cached personalized context for Voice Coach (Omni instructions + opener)."""

    __tablename__ = "user_voice_coach_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    user_summary: Mapped[str] = mapped_column(Text, default="")
    coach_identity: Mapped[str] = mapped_column(Text, default="")
    user_context_prompt: Mapped[str] = mapped_column(Text, default="")
    ability_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    strengths: Mapped[list] = mapped_column(JSON, default=list)
    weaknesses_to_improve: Mapped[list] = mapped_column(JSON, default=list)
    interests: Mapped[list] = mapped_column(JSON, default=list)
    focus_topics: Mapped[list] = mapped_column(JSON, default=list)
    opening_greeting: Mapped[str] = mapped_column(Text, default="")
    opening_questions: Mapped[list] = mapped_column(JSON, default=list)
    session_directives: Mapped[str] = mapped_column(Text, default="")
    session_instructions: Mapped[str] = mapped_column(Text, default="")
    analysis_source: Mapped[str] = mapped_column(String(40), default="daily")
    analyzed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class MatchRequest(Base):
    __tablename__ = "match_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    from_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    to_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserFriendship(Base):
    """Persistent friend relationship — created when matched users greet in chat."""

    __tablename__ = "user_friendships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_a_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    user_b_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    initiated_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    source: Mapped[str] = mapped_column(String(40), default="match_chat")
    match_type: Mapped[str] = mapped_column(String(40), default="language_partner")
    status: Mapped[str] = mapped_column(String(20), default="active")
    dissolved_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    greeted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_interaction_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class UserPrivacySettings(Base):
    __tablename__ = "user_privacy_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    match_profile_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    data_retention_days: Mapped[int] = mapped_column(Integer, default=365)
    allow_analytics: Mapped[bool] = mapped_column(Boolean, default=True)
    public_scope: Mapped[str] = mapped_column(String(40), default="friends")
    match_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String(60))
    target_id: Mapped[str] = mapped_column(String(120))
    reason: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UserBlock(Base):
    __tablename__ = "user_blocks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    blocker_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    blocked_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    level: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    daily_ai_dialogue: Mapped[int] = mapped_column(Integer, default=5)
    daily_voice_minutes: Mapped[int] = mapped_column(Integer, default=0)
    daily_freeze_count: Mapped[int] = mapped_column(Integer, default=1)
    asset_limit: Mapped[int] = mapped_column(Integer, default=20)
    daily_match_cards: Mapped[int] = mapped_column(Integer, default=1)
    match_batch_size: Mapped[int] = mapped_column(Integer, default=1)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class AuthSettings(Base):
    __tablename__ = "auth_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    smtp_host: Mapped[str] = mapped_column(String(255), default="")
    smtp_port: Mapped[int] = mapped_column(Integer, default=587)
    smtp_username: Mapped[str] = mapped_column(String(255), default="")
    smtp_password_encrypted: Mapped[str] = mapped_column(String(500), default="")
    smtp_from_email: Mapped[str] = mapped_column(String(255), default="")
    smtp_use_tls: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verification_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    verification_code_ttl_seconds: Mapped[int] = mapped_column(Integer, default=600)
    google_trial_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    google_trial_days: Mapped[int] = mapped_column(Integer, default=30)
    google_trial_membership_level: Mapped[str] = mapped_column(String(40), default="vip")
    registration_trial_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    registration_trial_days: Mapped[int] = mapped_column(Integer, default=30)
    registration_trial_membership_level: Mapped[str] = mapped_column(String(40), default="vip")
    google_email_domains: Mapped[list[str]] = mapped_column(
        JSON, default=lambda: ["gmail.com", "googlemail.com"]
    )
    demo_mode_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    demo_user_email: Mapped[str] = mapped_column(String(255), default="demo@ainerspeak.com")
    demo_user_password_encrypted: Mapped[str] = mapped_column(String(500), default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    default_theme: Mapped[str] = mapped_column(String(20), default="dark")
    enabled_locales: Mapped[list[str]] = mapped_column(
        JSON,
        default=lambda: ["en", "zh", "hi", "es", "fr", "ar", "bn", "pt", "ru", "sr"],
    )
    default_locale: Mapped[str] = mapped_column(String(20), default="zh")
    allow_user_theme_override: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_user_locale_override: Mapped[bool] = mapped_column(Boolean, default=True)
    default_llm_provider: Mapped[str] = mapped_column(String(64), default="")
    default_voice_provider: Mapped[str] = mapped_column(String(64), default="")
    realtime_asr_provider: Mapped[str] = mapped_column(String(32), default="auto")
    default_embedding_provider: Mapped[str] = mapped_column(String(64), default="")
    tts_provider: Mapped[str] = mapped_column(String(32), default="browser")
    tts_voice: Mapped[str] = mapped_column(String(40), default="longanhuan")
    tts_speed: Mapped[float] = mapped_column(Float, default=0.9)
    tts_pitch: Mapped[float] = mapped_column(Float, default=1.1)
    global_api_keys: Mapped[dict] = mapped_column(JSON, default=dict)
    llm_routing: Mapped[dict] = mapped_column(JSON, default=dict)
    voice_platform_config: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class UserXP(Base):
    __tablename__ = "user_xp"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    expression_points: Mapped[int] = mapped_column(Integer, default=0)
    current_level: Mapped[int] = mapped_column(Integer, default=1)
    current_streak_days: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[date | None] = mapped_column(Date)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class XPTransaction(Base):
    __tablename__ = "xp_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    xp_amount: Mapped[int] = mapped_column(Integer)
    expression_points_amount: Mapped[int] = mapped_column(Integer, default=0)
    activity_type: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(255), default="")
    reference_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class GrowthRecord(Base):
    __tablename__ = "growth_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    record_date: Mapped[date] = mapped_column(Date, index=True)
    level: Mapped[int] = mapped_column(Integer)
    total_xp: Mapped[int] = mapped_column(Integer)
    expression_points: Mapped[int] = mapped_column(Integer)
    conversations_count: Mapped[int] = mapped_column(Integer, default=0)
    assets_count: Mapped[int] = mapped_column(Integer, default=0)
    patterns_mastered: Mapped[int] = mapped_column(Integer, default=0)
    vocabulary_mastered: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


XP_LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200,
    6600, 8200, 10000, 12000, 14500, 17500, 21000, 25000, 30000, 40000,
]


def xp_to_level(total_xp: int) -> int:
    for level, threshold in enumerate(XP_LEVEL_THRESHOLDS):
        if total_xp < threshold:
            return max(level, 1)
    return len(XP_LEVEL_THRESHOLDS)


XP_REWARDS = {
    "send_message": 5,
    "freeze_thought": 20,
    "create_asset": 15,
    "master_pattern": 30,
    "master_vocabulary": 10,
    "complete_voice_session": 25,
    "join_circle": 10,
    "publish_topic": 25,
    "daily_login": 10,
    "streak_bonus": 5,
    "game_turn": 8,
    "game_complete": 40,
}


# ---------------------------------------------------------------------------
# Story Game Forge — Unified Game Models
# ---------------------------------------------------------------------------

class GameTemplate(Base):
    __tablename__ = "game_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    game_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(255))
    subtitle: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    cover_url: Mapped[str] = mapped_column(String(500), default="")
    difficulty: Mapped[str] = mapped_column(String(20), default="B1")
    target_language: Mapped[str] = mapped_column(String(20), default="en")
    native_language: Mapped[str] = mapped_column(String(20), default="zh")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=10)
    learning_focus: Mapped[list[str]] = mapped_column(JSON, default=list)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=100)
    play_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    template_id: Mapped[str | None] = mapped_column(ForeignKey("game_templates.id"), nullable=True)
    game_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    target_language: Mapped[str] = mapped_column(String(20), default="en")
    native_language: Mapped[str] = mapped_column(String(20), default="zh")
    difficulty: Mapped[str] = mapped_column(String(20), default="B1")
    phase: Mapped[str] = mapped_column(String(40), default="lobby")
    state: Mapped[dict] = mapped_column(JSON, default=dict)
    turn_count: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="active")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    turns: Mapped[list["GameTurn"]] = relationship(
        back_populates="session", cascade="all, delete-orphan",
        order_by="GameTurn.created_at",
    )


class GameTurn(Base):
    __tablename__ = "game_turns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("game_sessions.id"), index=True)
    turn_number: Mapped[int] = mapped_column(Integer, default=0)
    actor: Mapped[str] = mapped_column(String(40), default="user")
    action_type: Mapped[str] = mapped_column(String(60), default="message")
    user_input: Mapped[str] = mapped_column(Text, default="")
    ai_response: Mapped[dict] = mapped_column(JSON, default=dict)
    hud: Mapped[dict] = mapped_column(JSON, default=dict)
    feed_items: Mapped[list] = mapped_column(JSON, default=list)
    phase_after: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped[GameSession] = relationship(back_populates="turns")


class GameAsset(Base):
    """Reusable visual assets (covers/backgrounds/character avatars) for games.

    Taxonomy lets the admin and AI story generator pick fitting art by
    era / gender / age / scene without hardcoding URLs in the frontend.
    """
    __tablename__ = "game_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(20), index=True, default="cover")  # cover | background | avatar
    title: Mapped[str] = mapped_column(String(120), default="")
    url: Mapped[str] = mapped_column(String(600), default="")
    era: Mapped[str] = mapped_column(String(30), index=True, default="modern")  # modern|ancient|cyberpunk|fantasy|other
    gender: Mapped[str] = mapped_column(String(20), default="neutral")  # male|female|neutral
    age: Mapped[str] = mapped_column(String(20), default="adult")  # child|teen|adult
    scene: Mapped[str] = mapped_column(String(60), default="")  # free-form scene tag
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class PartyRoom(Base):
    """Multiplayer party room for detective / story party modes (REST polling MVP)."""

    __tablename__ = "party_rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    host_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    template_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    title: Mapped[str] = mapped_column(String(255), default="侦探之夜")
    invite_code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    max_players: Mapped[int] = mapped_column(Integer, default=8)
    phase: Mapped[str] = mapped_column(String(40), default="waiting")
    state: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class GameLearningPack(Base):
    """Curated vocabulary / pattern packs maintained by ops for game learning HUD."""

    __tablename__ = "game_learning_packs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    game_type: Mapped[str] = mapped_column(String(40), index=True)
    pack_type: Mapped[str] = mapped_column(String(20), default="pattern")
    label: Mapped[str] = mapped_column(String(120), default="")
    content: Mapped[str] = mapped_column(String(500), default="")
    example: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[str] = mapped_column(String(20), default="B1")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
