from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class APIMessage(BaseModel):
    message: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = ""
    verification_code: str = ""


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = ""
    role: str = "user"
    membership_level: str = "free"


class AdminUserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    role: str | None = None
    membership_level: str | None = None
    status: str | None = None
    password: str | None = None


class SendVerificationCodeRequest(BaseModel):
    email: EmailStr


class SendVerificationCodeResponse(BaseModel):
    message: str
    email: str
    expires_in_seconds: int
    dev_code: str | None = None


class RegistrationPreview(BaseModel):
    email: str
    is_google_email: bool
    google_trial_enabled: bool
    google_trial_days: int
    google_trial_membership_level: str | None = None
    email_verification_enabled: bool
    message: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LoginLogRead(BaseModel):
    id: str
    user_id: str
    ip_address: str
    user_agent: str
    success: bool
    failure_reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRead(BaseModel):
    id: str
    email: str
    username: str
    role: str
    membership_level: str
    status: str
    membership_expires_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthToken(BaseModel):
    access_token: str
    refresh_token: str = ""
    token_type: str = "bearer"
    user: UserRead


class ProfileUpsert(BaseModel):
    native_language: str = "zh"
    target_languages: list[str] = Field(default_factory=lambda: ["en"])
    primary_target_language: str = "en"
    current_level: str = "B1"
    learning_goals: list[str] = Field(default_factory=list)
    favorite_topics: list[str] = Field(default_factory=list)
    correction_style: str = "balanced"
    coach_style: str = "socratic"
    explanation_language: str = "zh"
    ui_language: str = "zh"
    ui_theme: str = "dark"
    voice_preference: str = "warm-neutral"


class ProfileRead(ProfileUpsert):
    id: str
    user_id: str
    speaking_confidence_score: float
    writing_confidence_score: float
    grammar_level_score: float
    vocabulary_level_score: float
    fluency_score: float

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    title: str = "新的思想对话"
    topic: str = "free-talk"
    mode: str = "socratic"
    native_language: str = "zh"
    target_language: str = "en"


class MessageCreate(BaseModel):
    content: str
    content_language: str = "auto"


class GrammarTip(BaseModel):
    pattern: str
    explanation: str
    importance: int = 3


class MistakeItem(BaseModel):
    type: str = ""
    original: str = ""
    corrected: str = ""
    explanation: str = ""


class ConversationAIResult(BaseModel):
    main_reply_native: str
    main_reply_target: str
    user_input_translated: str = ""
    user_input_versions: dict[str, str] = Field(default_factory=dict)
    question: str = ""
    challenge: str = ""
    suggested_expression: str = ""
    grammar_tips: list[GrammarTip] = Field(default_factory=list)
    patterns: list[str] = Field(default_factory=list)
    vocabulary: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    core_patterns: list[str] = Field(default_factory=list)
    grammar_structures: list[str] = Field(default_factory=list)
    facts: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)
    arguments: list[str] = Field(default_factory=list)
    expression_versions: dict[str, str] = Field(default_factory=dict)
    corrected_sentence: str | None = None
    mistakes: list[MistakeItem] | None = None


class ChatV2WhyItem(BaseModel):
    point: str = ""
    explanation: str = ""


class ChatV2PatternItem(BaseModel):
    pattern: str = ""
    example: str = ""
    add_to_crush: bool = False


class ChatV2NextQuestion(BaseModel):
    target: str = ""
    native: str = ""


class ChatV2AgentItem(BaseModel):
    agent: str = ""
    result: str = ""


class ChatV2Response(BaseModel):
    input_language: str = "zh"
    detected_intent: str = "expression_learning"
    main_expression: str = ""
    meaning_native: str = ""
    variants: dict[str, str] = Field(default_factory=dict)
    why_this_expression: list[ChatV2WhyItem] = Field(default_factory=list)
    corrected_sentence: str | None = None
    mistakes: list[MistakeItem] | None = None
    patterns: list[ChatV2PatternItem] = Field(default_factory=list)
    vocabulary: list[str] = Field(default_factory=list)
    agents: list[ChatV2AgentItem] = Field(default_factory=list)
    next_question: ChatV2NextQuestion = Field(default_factory=ChatV2NextQuestion)

    def to_legacy_analysis(self) -> dict[str, Any]:
        """Convert V2 response to legacy analysis dict for DB storage + backward compat."""
        legacy = {
            "v2": True,
            "input_language": self.input_language,
            "detected_intent": self.detected_intent,
            "main_expression": self.main_expression,
            "meaning_native": self.meaning_native,
            "variants": self.variants,
            "why_this_expression": [w.model_dump() for w in self.why_this_expression],
            "corrected_sentence": self.corrected_sentence,
            "mistakes": [m.model_dump() for m in self.mistakes] if self.mistakes else [],
            "patterns_v2": [p.model_dump() for p in self.patterns],
            "vocabulary": self.vocabulary,
            "agents": [a.model_dump() for a in self.agents],
            "next_question": self.next_question.model_dump(),
            # Legacy compat fields — other pages read these
            "main_reply_native": self.meaning_native,
            "main_reply_target": self.main_expression,
            "question": self.next_question.target,
            "challenge": "",
            "suggested_expression": self.main_expression,
            "grammar_tips": [
                {"pattern": w.point, "explanation": w.explanation, "importance": 3}
                for w in self.why_this_expression
            ],
            "patterns": [p.pattern for p in self.patterns],
            "expression_versions": self.variants,
            "user_input_translated": "",
            "user_input_versions": {},
        }
        return legacy


class MessageRead(BaseModel):
    id: str
    role: str
    content: str
    content_language: str
    translated_content: str
    analysis: dict[str, Any]
    expression_versions: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationRead(BaseModel):
    id: str
    title: str
    topic: str
    mode: str
    native_language: str
    target_language: str
    status: str
    created_at: datetime
    messages: list[MessageRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ConversationReply(BaseModel):
    conversation: ConversationRead
    user_message: MessageRead
    assistant_message: MessageRead
    learning_items_added: list[str]
    llm_meta: dict[str, Any] | None = None


class AssetCreate(BaseModel):
    title: str
    source_text: str
    target_language: str = "en"
    thought_id: str | None = None


class AssetRead(BaseModel):
    id: str
    title: str
    source_text: str
    target_language: str
    variants: dict[str, Any]
    keywords: list[str]
    patterns: list[str]
    current_version: int = 1
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssetVersionRead(BaseModel):
    id: str
    asset_id: str
    version: int
    variants: dict[str, Any]
    keywords: list[str]
    patterns: list[str]
    note: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FreezeRequest(BaseModel):
    title: str | None = None


class ThoughtRead(BaseModel):
    id: str
    conversation_id: str | None
    title: str
    topic: str
    summary: str
    final_content_native: str
    final_content_target: str
    freeze_payload: dict[str, Any]
    mind_graph: dict[str, Any]
    status: str
    version: int
    frozen_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ThoughtDetailRead(ThoughtRead):
    expression_asset_id: str | None = None
    variants: dict[str, Any] = Field(default_factory=dict)


class ThoughtVersionRead(BaseModel):
    id: str
    thought_id: str
    version: int
    title: str
    summary: str
    final_content_native: str
    final_content_target: str
    freeze_payload: dict[str, Any]
    mind_graph: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ThoughtVersionDiffRead(BaseModel):
    version_a: int
    version_b: int
    added: list[str]
    removed: list[str]
    changed: list[str]


class VocabularyRead(BaseModel):
    id: str
    word: str
    meaning: str
    translation: str = ""
    topic: str
    language_code: str
    mastery_status: str
    mastery_score: float = 20.0
    examples: list[str] = Field(default_factory=list)
    priority: int
    last_seen_at: datetime | None
    created_at: datetime

    @model_validator(mode="after")
    def _fill_translation(self) -> "VocabularyRead":
        if not self.translation:
            self.translation = self.meaning
        return self

    model_config = ConfigDict(from_attributes=True)


class AIMemoryRead(BaseModel):
    id: str
    memory_type: str
    content: str
    source: str
    confidence: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIMemoryUpsert(BaseModel):
    memories: list[dict[str, Any]] = Field(default_factory=list)
    summary: str | None = None


class MasteryRead(BaseModel):
    id: str
    item_type: str
    item_id: str
    title: str
    language_code: str
    mastery_score: float
    status: str
    priority: int
    examples: list[str]

    model_config = ConfigDict(from_attributes=True)


class PracticeExercise(BaseModel):
    exercise_type: str
    prompt: str
    hint: str = ""
    options: list[str] = Field(default_factory=list)
    correct_answer: str = ""


class PracticeSubmit(BaseModel):
    answer: str = ""
    exercise_type: str = ""


class CrushCandidateCreate(BaseModel):
    pattern: str
    example: str = ""
    language_code: str = "en"
    item_type: str = "pattern"


class TokenExplainRequest(BaseModel):
    token: str
    context: str = ""
    native_language: str = "zh"
    target_language: str = "en"


class TokenExplainResponse(BaseModel):
    token: str
    meaning: str = ""
    usage: str = ""
    example: str = ""
    part_of_speech: str = ""


class PracticeResponse(BaseModel):
    item: MasteryRead
    exercise: PracticeExercise | None = None
    correct: bool | None = None
    message: str


class PracticeResult(BaseModel):
    item: MasteryRead
    message: str


class VoiceSessionCreate(BaseModel):
    conversation_id: str | None = None
    mode: str = "push-to-talk"
    target_language: str = "en"


class VoiceSessionRead(BaseModel):
    id: str
    provider: str
    duration_seconds: int
    transcript: str
    analysis: dict[str, Any]
    cost_estimate: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProviderCreate(BaseModel):
    provider_name: str
    provider_type: str = "llm"
    api_base_url: str = ""
    api_key: str = ""
    model_name: str = ""
    enabled: bool = True
    priority: int = 100
    cost_weight: float = 1
    fallback_provider: str = ""
    config: dict[str, Any] = Field(default_factory=dict)


class ProviderTestRequest(ProviderCreate):
    timeout_seconds: float = 10
    provider_id: str = ""


class ProviderTestResult(BaseModel):
    ok: bool
    provider_name: str
    provider_type: str
    model_name: str
    latency_ms: int
    message: str
    request_url: str = ""
    response_preview: str = ""
    error: str = ""


class ProviderRead(BaseModel):
    id: str
    provider_name: str
    provider_type: str
    api_base_url: str
    model_name: str
    enabled: bool
    priority: int
    cost_weight: float
    fallback_provider: str
    config: dict[str, Any]
    api_key_status: str = "none"

    model_config = ConfigDict(from_attributes=True)


class ProviderCapabilityRead(BaseModel):
    key: str
    label: str
    features: list[str]
    status: str
    active_provider: str = ""
    message: str = ""
    required: bool = True


class PromptTemplateRead(BaseModel):
    id: str
    name: str
    task_type: str
    version: str
    content: str
    enabled: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PromptTemplateUpdate(BaseModel):
    content: str
    enabled: bool = True
    version: str = "v1.0"


class UsageLogRead(BaseModel):
    id: str
    task_type: str
    tokens_input: int
    tokens_output: int
    voice_seconds: int
    cost_estimate: float
    latency_ms: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LLMCallLogRead(BaseModel):
    id: str
    provider_name: str
    model_name: str
    method_name: str
    prompt: str | None = None
    response: str | None = None
    error: str | None = None
    status: str
    latency_ms: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MembershipUpdate(BaseModel):
    membership_level: str
    status: str = "active"
    membership_expires_at: datetime | None = None


class UserProfileSummary(BaseModel):
    native_language: str = "zh"
    primary_target_language: str = "en"
    current_level: str = "B1"
    fluency_score: float = 50

    model_config = ConfigDict(from_attributes=True)


class UserDetailRead(BaseModel):
    id: str
    email: str
    username: str
    role: str
    membership_level: str
    status: str
    membership_expires_at: datetime | None = None
    created_at: datetime
    profile: UserProfileSummary | None = None
    stats: dict[str, int | float] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class CostSummary(BaseModel):
    today_total: float
    by_provider: list[dict[str, float | str]]
    by_task_type: list[dict[str, float | str]]
    high_cost_users: list[dict[str, float | str]]


class AuditLogRead(BaseModel):
    id: str
    admin_user_id: str
    action: str
    resource_type: str
    resource_id: str
    details: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MembershipPlanRead(BaseModel):
    id: str
    level: str
    display_name: str
    daily_ai_dialogue: int
    daily_voice_minutes: int
    daily_freeze_count: int
    asset_limit: int
    enabled: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MembershipPlanUpdate(BaseModel):
    display_name: str
    daily_ai_dialogue: int = 5
    daily_voice_minutes: int = 0
    daily_freeze_count: int = 1
    asset_limit: int = 20
    enabled: bool = True


class TranscribeRequest(BaseModel):
    audio_url: str = ""
    audio_base64: str = ""
    language: str = "en"


class TranscribeResponse(BaseModel):
    text: str
    provider: str
    language: str


class VoiceReportRead(BaseModel):
    session_id: str
    provider: str
    duration_seconds: int
    transcript: str
    scores: dict[str, float]
    top_corrections: list[dict[str, str]]
    highlights: list[str]
    filler_words: list[dict[str, Any]] = Field(default_factory=list)
    pause_feedback: list[str] = Field(default_factory=list)
    recommended_practice: list[str] = Field(default_factory=list)
    summary: str


class TargetLanguageUpdate(BaseModel):
    target_language: str


class TopicCreate(BaseModel):
    title: str
    background: str = ""
    pro_view: str = ""
    con_view: str = ""
    tags: list[str] = Field(default_factory=list)
    thought_id: str | None = None


class TopicRead(BaseModel):
    id: str
    creator_id: str
    thought_id: str | None
    parent_topic_id: str | None = None
    title: str
    background: str
    pro_view: str
    con_view: str
    tags: list[str]
    status: str
    view_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


ROOM_TYPE_OPTIONS = {
    "roundtable", "debate_pk", "co_create", "language_circle",
    "founder_circle", "soul_circle", "study_buddy",
}


class CircleRoomCreate(BaseModel):
    title: str
    topic_id: str | None = None
    max_members: int = 8
    room_type: str = "roundtable"
    allowed_languages: list[str] = Field(default_factory=lambda: ["zh", "en"], max_length=3)


class CircleMessageCreate(BaseModel):
    content: str
    content_language: str = "auto"


class CircleMemberRead(BaseModel):
    id: str
    user_id: str
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CircleMessageRead(BaseModel):
    id: str
    room_id: str
    user_id: str | None
    role: str
    content: str
    content_language: str
    translated_content: str
    analysis: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CircleRoomRead(BaseModel):
    id: str
    topic_id: str | None
    creator_id: str
    title: str
    room_type: str
    allowed_languages: list[str]
    status: str
    summary: dict[str, Any]
    max_members: int
    created_at: datetime
    members: list[CircleMemberRead] = Field(default_factory=list)
    messages: list[CircleMessageRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class MatchEnableRequest(BaseModel):
    enabled: bool = True
    match_mode: str = "language_partner"
    visibility: str = "friends"


class MatchProfileUpdate(BaseModel):
    bio: str = ""
    interests: list[str] = Field(default_factory=list)
    target_languages: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)
    lifestyle: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class ValueProfileUpdate(BaseModel):
    emotional_values: list[str] = Field(default_factory=list)
    lifestyle_prefs: list[str] = Field(default_factory=list)
    relationship_goals: list[str] = Field(default_factory=list)


class MatchRecommendationRead(BaseModel):
    id: str
    target_user_id: str
    target_username: str = ""
    score: float
    reasons: list[str]
    status: str
    icebreaker: str = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MatchRequestCreate(BaseModel):
    to_user_id: str
    message: str = ""


class MatchRequestRead(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    message: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PrivacySettingsRead(BaseModel):
    match_profile_visible: bool
    data_retention_days: int
    allow_analytics: bool
    public_scope: str
    match_enabled: bool = False

    model_config = ConfigDict(from_attributes=True)


class PrivacySettingsUpdate(BaseModel):
    match_profile_visible: bool | None = None
    data_retention_days: int | None = None
    allow_analytics: bool | None = None
    public_scope: str | None = None
    match_enabled: bool | None = None


class ReportCreate(BaseModel):
    target_type: str
    target_id: str
    reason: str
    description: str = ""


class ReportRead(BaseModel):
    id: str
    reporter_id: str
    target_type: str
    target_id: str
    reason: str
    description: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModerationEventRead(BaseModel):
    id: str
    content_type: str
    content_id: str
    user_id: str | None
    action: str
    reason: str
    details: dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthSettingsRead(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_from_email: str
    smtp_use_tls: bool
    smtp_configured: bool
    email_verification_enabled: bool
    verification_code_ttl_seconds: int
    google_trial_enabled: bool
    google_trial_days: int
    google_trial_membership_level: str
    google_email_domains: list[str]
    demo_mode_enabled: bool
    demo_user_email: str
    demo_password_configured: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthSettingsUpdate(BaseModel):
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True
    email_verification_enabled: bool = True
    verification_code_ttl_seconds: int = Field(default=600, ge=60, le=3600)
    google_trial_enabled: bool = True
    google_trial_days: int = Field(default=30, ge=1, le=365)
    google_trial_membership_level: str = "vip"
    google_email_domains: list[str] = Field(default_factory=lambda: ["gmail.com", "googlemail.com"])
    demo_mode_enabled: bool = True
    demo_user_email: str = "demo@ainerspeak.com"
    demo_user_password: str = ""


class DemoConfigRead(BaseModel):
    enabled: bool
    email: str | None = None
    password: str | None = None
    message: str = ""


class LocaleInfo(BaseModel):
    code: str
    name: str
    native_name: str


class AppConfigRead(BaseModel):
    default_theme: str
    default_locale: str
    enabled_locales: list[str]
    locales: list[LocaleInfo]
    allow_user_theme_override: bool
    allow_user_locale_override: bool


class AppSettingsRead(BaseModel):
    default_theme: str
    default_locale: str
    enabled_locales: list[str]
    allow_user_theme_override: bool
    allow_user_locale_override: bool
    default_llm_provider: str = ""
    default_voice_provider: str = ""
    realtime_asr_provider: str = "auto"
    default_embedding_provider: str = ""
    tts_provider: str = "browser"
    tts_voice: str = "longanhuan"
    tts_speed: float = 0.9
    tts_pitch: float = 1.1
    global_api_keys: list[dict] = Field(default_factory=list)
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AppSettingsUpdate(BaseModel):
    default_theme: str = "dark"
    default_locale: str = "zh"
    enabled_locales: list[str] = Field(
        default_factory=lambda: [
            "en", "zh", "hi", "es", "fr", "ar", "bn", "pt", "ru", "ja", "sr"
        ]
    )
    allow_user_theme_override: bool = True
    allow_user_locale_override: bool = True
    default_llm_provider: str = ""
    default_voice_provider: str = ""
    realtime_asr_provider: str = "auto"
    default_embedding_provider: str = ""
    tts_provider: str = "browser"
    tts_voice: str = "longanhuan"
    tts_speed: float = 0.9
    tts_pitch: float = 1.1
    global_api_keys: list[dict] = Field(default_factory=list)


class TopicForkCreate(BaseModel):
    title: str
    background: str = ""
    pro_view: str = ""
    con_view: str = ""


class TopicVersionRead(BaseModel):
    id: str
    topic_id: str
    version: int
    title: str
    background: str
    pro_view: str
    con_view: str
    creator_user_id: str | None
    parent_topic_id: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopicRecommendationRead(BaseModel):
    id: str
    user_id: str
    topic_id: str
    reason: str
    score: float
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MatchFeedbackCreate(BaseModel):
    recommendation_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class MatchFeedbackRead(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    recommendation_id: str | None
    rating: int
    comment: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
