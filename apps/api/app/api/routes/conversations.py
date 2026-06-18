from __future__ import annotations

import logging
import re
import time
import unicodedata
import json
import asyncio

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession, QuotaManagerDep
from app.services.runtime_config import resolve_default_llm_provider
from app.models import (
    Conversation,
    ConversationMessage,
    ExpressionAsset,
    ExpressionAssetVersion,
    PromptTemplate,
    Thought,
    ThoughtVersion,
    UsageLog,
    UserProfile,
    utc_now,
)
from app.schemas import (
    AssetRead,
    ChatV2AgentItem,
    ChatV2NextQuestion,
    ChatV2PatternItem,
    ChatV2Response,
    ChatV2WhyItem,
    ConversationCreate,
    ConversationRead,
    ConversationReply,
    FreezeRequest,
    MessageCreate,
    MistakeItem,
    ProfileRead,
    TargetLanguageUpdate,
)
from app.services.ai_memory import load_user_memory_summary, update_memory_from_dialogue
from app.services.llm import (
    LLMUnavailableError,
    assert_real_llm_usage,
    language_name,
    require_llm_provider,
)
from app.services.pattern_mining import mine_from_analysis, mine_learning_items
from app.services.vocabulary_mining import mine_vocabulary_from_analysis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationRead)
def create_conversation(
    payload: ConversationCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> Conversation:
    conversation = Conversation(user_id=current_user.id, **payload.model_dump())
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("", response_model=list[ConversationRead])
def list_conversations(current_user: CurrentUser, db: DBSession) -> list[Conversation]:
    return list(
        db.scalars(
            select(Conversation)
            .where(Conversation.user_id == current_user.id)
            .options(selectinload(Conversation.messages))
            .order_by(Conversation.updated_at.desc())
        )
    )


@router.get("/{conversation_id}", response_model=ConversationRead)
def get_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> Conversation:
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/{conversation_id}/messages", response_model=ConversationReply)
async def send_message(
    conversation_id: str,
    payload: MessageCreate,
    current_user: CurrentUser,
    db: DBSession,
    quota: QuotaManagerDep,
) -> ConversationReply:
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    quota.consume_ai_dialogue(current_user)

    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile_read = ProfileRead.model_validate(profile) if profile else None
    explanation_language = _explanation_language(profile_read, conversation.native_language)

    # --- T-106: detect if user is writing in the target language ---
    resolved_language = payload.content_language
    if resolved_language == "auto":
        resolved_language = _detect_content_language(
            payload.content,
            conversation.native_language,
            conversation.target_language,
        )
    detect_correction = _should_correct(
        resolved_language, conversation.target_language
    )

    mode_task_type = f"thought_dialogue_{conversation.mode}" if conversation.mode and conversation.mode != "socratic" else "thought_dialogue"
    system_prompt = _load_prompt_template(
        db,
        task_type=mode_task_type,
        native_language=conversation.native_language,
        target_language=conversation.target_language,
        explanation_language=explanation_language,
        user_level=profile_read.current_level if profile_read else "B1",
        user_topics=conversation.topic,
        detect_target_language_input=detect_correction,
    )
    if not system_prompt and mode_task_type != "thought_dialogue":
        system_prompt = _load_prompt_template(
            db,
            task_type="thought_dialogue",
            native_language=conversation.native_language,
            target_language=conversation.target_language,
            explanation_language=explanation_language,
            user_level=profile_read.current_level if profile_read else "B1",
            user_topics=conversation.topic,
            detect_target_language_input=detect_correction,
        )

    # --- T-114: inject user long-term memory ---
    memory_summary = load_user_memory_summary(db, current_user.id)

    # --- T-101: dynamic provider with DB (no silent mock) ---
    try:
        provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    conversation_history = _conversation_history(conversation)

    started = time.perf_counter()
    try:
        result = await provider.thought_dialogue(
            user_input=payload.content,
            profile=profile_read,
            native_language=conversation.native_language,
            target_language=conversation.target_language,
            mode=conversation.mode,
            topic=conversation.topic,
            detect_target_language_input=detect_correction,
            system_prompt_override=system_prompt,
            memory_summary=memory_summary,
            conversation_history=conversation_history,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc
    except Exception as exc:
        logger.exception("LLM dialogue failed for conversation %s", conversation_id)
        raise HTTPException(
            status_code=503,
            detail=f"LLM 调用失败：{exc}。请到 Admin 检查 Provider 配置与 API Key。",
        ) from exc
    latency_ms = int((time.perf_counter() - started) * 1000)

    usage = assert_real_llm_usage(provider)

    # --- T-112: write UsageLog ---
    _write_usage_log(
        db,
        user_id=current_user.id,
        provider=provider,
        task_type="thought_dialogue",
        latency_ms=latency_ms,
    )

    # --- T-105: structured output is already in result via ConversationAIResult ---
    analysis_data = result.model_dump()

    user_message = ConversationMessage(
        conversation_id=conversation.id,
        user_id=current_user.id,
        role="user",
        content=payload.content,
        content_language=payload.content_language,
        translated_content=result.user_input_translated,
        analysis={
            "user_input_translated": result.user_input_translated,
            "corrected_sentence": result.corrected_sentence,
            "mistakes": [m.model_dump() for m in result.mistakes] if result.mistakes else [],
        },
        expression_versions=result.user_input_versions,
    )
    assistant_message = ConversationMessage(
        conversation_id=conversation.id,
        user_id=None,
        role="assistant",
        content=result.main_reply_native,
        content_language=conversation.native_language,
        translated_content=result.main_reply_target,
        analysis=analysis_data,
        expression_versions=result.expression_versions,
    )
    conversation.updated_at = utc_now()
    db.add_all([user_message, assistant_message])
    added_patterns = mine_from_analysis(
        db=db,
        user_id=current_user.id,
        target_language=conversation.target_language,
        native_language=conversation.native_language,
        analysis=analysis_data,
    )
    added_vocabulary = mine_vocabulary_from_analysis(
        db=db,
        user_id=current_user.id,
        target_language=conversation.target_language,
        topic=conversation.topic,
        conversation_id=conversation.id,
        analysis=analysis_data,
    )
    update_memory_from_dialogue(
        db=db,
        user_id=current_user.id,
        topic=conversation.topic,
        analysis=analysis_data,
    )
    from app.services.gamification import award_xp
    award_xp(db, current_user.id, "send_message", f"对话: {conversation.title}", conversation.id)
    db.commit()

    conversation = get_conversation(conversation_id, current_user, db)
    db.refresh(user_message)
    db.refresh(assistant_message)
    return ConversationReply(
        conversation=ConversationRead.model_validate(conversation),
        user_message=user_message,
        assistant_message=assistant_message,
        learning_items_added=[*added_patterns, *added_vocabulary],
        llm_meta=_llm_meta_from_usage(usage),
    )


@router.post("/{conversation_id}/messages/stream")
async def stream_message(
    conversation_id: str,
    payload: MessageCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    import json
    
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile_read = ProfileRead.model_validate(profile) if profile else None
    explanation_language = _explanation_language(profile_read, conversation.native_language)
    
    resolved_language = payload.content_language
    if resolved_language == "auto":
        resolved_language = _detect_content_language(
            payload.content,
            conversation.native_language,
            conversation.target_language,
        )
    detect_correction = _should_correct(
        resolved_language, conversation.target_language
    )
    
    mode_task_type = f"thought_dialogue_{conversation.mode}" if conversation.mode and conversation.mode != "socratic" else "thought_dialogue"
    system_prompt = _load_prompt_template(
        db,
        task_type=mode_task_type,
        native_language=conversation.native_language,
        target_language=conversation.target_language,
        explanation_language=explanation_language,
        user_level=profile_read.current_level if profile_read else "B1",
        user_topics=conversation.topic,
        detect_target_language_input=detect_correction,
    )
    if not system_prompt and mode_task_type != "thought_dialogue":
        system_prompt = _load_prompt_template(
            db,
            task_type="thought_dialogue",
            native_language=conversation.native_language,
            target_language=conversation.target_language,
            explanation_language=explanation_language,
            user_level=profile_read.current_level if profile_read else "B1",
            user_topics=conversation.topic,
            detect_target_language_input=detect_correction,
        )
    
    memory_summary = load_user_memory_summary(db, current_user.id)
    
    default_provider_name = resolve_default_llm_provider(db)
    try:
        provider = require_llm_provider(default_provider_name, db=db)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    # Route the lightweight phase-1 reply through a faster flash model (if one is
    # configured) to roughly halve time-to-first-token; analysis stays on the
    # quality default `provider`. Falls back to `provider` when unavailable.
    reply_provider = provider
    fast_name = _resolve_fast_reply_provider_name(db, default_provider_name)
    if fast_name != default_provider_name:
        try:
            reply_provider = require_llm_provider(fast_name, db=db)
        except Exception:  # noqa: BLE001
            reply_provider = provider

    conversation_history = _conversation_history(conversation)

    started = time.perf_counter()

    async def sse_generator():
        try:
            # ----- Phase 1: fast conversational reply (streamed into the feed) -----
            reply_text = ""
            async for chunk in reply_provider.chat_reply_stream(
                user_input=payload.content,
                profile=profile_read,
                native_language=conversation.native_language,
                target_language=conversation.target_language,
                mode=conversation.mode,
                topic=conversation.topic,
                memory_summary=memory_summary,
                conversation_history=conversation_history,
            ):
                if chunk:
                    reply_text += chunk
                    yield f"event: reply_delta\ndata: {json.dumps(chunk)}\n\n"
            reply_text = reply_text.strip()
            yield f"event: reply_done\ndata: {json.dumps({'reply': reply_text})}\n\n"

            # ----- Phase 2: background structured analysis (drives the Learning HUD) -----
            yield f"event: analyzing\ndata: {json.dumps({'status': 'analyzing'})}\n\n"

            data = await provider.chat_v2(
                user_input=payload.content,
                profile=profile_read,
                native_language=conversation.native_language,
                target_language=conversation.target_language,
                mode=conversation.mode,
                topic=conversation.topic,
                detect_target_language_input=detect_correction,
                system_prompt_override=system_prompt,
                memory_summary=memory_summary,
                conversation_history=conversation_history,
            )

            v2 = _build_chat_v2_response(data)
            analysis_data = v2.to_legacy_analysis()
            analysis_data["conversational_reply"] = reply_text

            latency_ms = int((time.perf_counter() - started) * 1000)
            usage = assert_real_llm_usage(provider)
            _write_usage_log(db, user_id=current_user.id, provider=provider, task_type="thought_dialogue", latency_ms=latency_ms)

            yield f"event: hud\ndata: {json.dumps(analysis_data)}\n\n"

            user_message = ConversationMessage(
                conversation_id=conversation.id,
                user_id=current_user.id,
                role="user",
                content=payload.content,
                content_language=payload.content_language,
                translated_content="",
                analysis={
                    "corrected_sentence": v2.corrected_sentence,
                    "mistakes": [m.model_dump() for m in v2.mistakes] if v2.mistakes else [],
                },
                expression_versions={},
            )
            assistant_message = ConversationMessage(
                conversation_id=conversation.id,
                user_id=None,
                role="assistant",
                # Conversation feed shows the streamed conversational reply.
                content=reply_text or v2.meaning_native,
                content_language=conversation.native_language,
                translated_content=v2.main_expression,
                analysis=analysis_data,
                expression_versions=v2.variants,
            )
            conversation.updated_at = utc_now()
            db.add_all([user_message, assistant_message])

            added_patterns = mine_from_analysis(db=db, user_id=current_user.id, target_language=conversation.target_language, native_language=conversation.native_language, analysis=analysis_data)
            added_vocabulary = mine_vocabulary_from_analysis(db=db, user_id=current_user.id, target_language=conversation.target_language, topic=conversation.topic, conversation_id=conversation.id, analysis=analysis_data)
            update_memory_from_dialogue(db=db, user_id=current_user.id, topic=conversation.topic, analysis=analysis_data)

            from app.services.gamification import award_xp
            award_xp(db, current_user.id, "send_message", f"对话: {conversation.title}", conversation.id)
            db.commit()
            db.refresh(user_message)
            db.refresh(assistant_message)

            conv_refresh = get_conversation(conversation_id, current_user, db)
            reply_obj = ConversationReply(
                conversation=ConversationRead.model_validate(conv_refresh),
                user_message=user_message,
                assistant_message=assistant_message,
                learning_items_added=[*added_patterns, *added_vocabulary],
                llm_meta=_llm_meta_from_usage(usage),
            )

            yield f"event: result\ndata: {reply_obj.model_dump_json()}\n\n"

        except Exception as e:
            logger.error(f"Conversation-First streaming error: {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


@router.patch("/{conversation_id}/target-language", response_model=ConversationRead)
def switch_target_language(
    conversation_id: str,
    payload: TargetLanguageUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> Conversation:
    """T-951: Switch target language mid-conversation."""
    allowed = {"en", "ja", "ko", "es", "de", "fr", "sr", "zh"}
    if payload.target_language not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported language. Allowed: {allowed}")

    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.target_language = payload.target_language
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    if profile and payload.target_language not in (profile.target_languages or []):
        langs = list(profile.target_languages or [])
        langs.append(payload.target_language)
        profile.target_languages = langs

    db.commit()
    db.refresh(conversation)
    return conversation


@router.post("/{conversation_id}/freeze", response_model=AssetRead)
async def freeze_conversation(
    conversation_id: str,
    payload: FreezeRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> ExpressionAsset:
    conversation = get_conversation(conversation_id, current_user, db)
    text = "\n".join(
        f"{message.role}: {message.content}" for message in conversation.messages if message.content
    )
    title = payload.title or conversation.title
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile_read = ProfileRead.model_validate(profile) if profile else None

    # --- T-104: load PromptTemplate for thought_freeze ---
    system_prompt = _load_prompt_template(
        db,
        task_type="thought_freeze",
        native_language=conversation.native_language,
        target_language=conversation.target_language,
        explanation_language=_explanation_language(profile_read, conversation.native_language),
        user_level=profile_read.current_level if profile_read else "B1",
        user_topics=conversation.topic,
    )

    try:
        provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    started = time.perf_counter()
    try:
        result = await provider.generate_expression_asset(
            text, conversation.target_language, title,
            system_prompt_override=system_prompt,
        )
        assert_real_llm_usage(provider)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc
    except Exception as exc:
        logger.exception("LLM freeze failed for conversation %s", conversation_id)
        raise HTTPException(
            status_code=503,
            detail=f"LLM 调用失败：{exc}。请到 Admin 检查 Provider 配置与 API Key。",
        ) from exc
    latency_ms = int((time.perf_counter() - started) * 1000)

    _write_usage_log(
        db,
        user_id=current_user.id,
        provider=provider,
        task_type="thought_freeze",
        latency_ms=latency_ms,
    )

    thought = db.scalar(
        select(Thought).where(
            Thought.conversation_id == conversation.id,
            Thought.user_id == current_user.id,
        )
    )
    if thought:
        db.add(
            ThoughtVersion(
                thought_id=thought.id,
                version=thought.version,
                title=thought.title,
                summary=thought.summary,
                final_content_native=thought.final_content_native,
                final_content_target=thought.final_content_target,
                freeze_payload=thought.freeze_payload,
                mind_graph=thought.mind_graph,
            )
        )
        thought.version += 1
    else:
        thought = Thought(
            user_id=current_user.id,
            conversation_id=conversation.id,
            title=title,
            topic=conversation.topic,
            version=1,
        )
        db.add(thought)
        db.flush()

    thought.title = title
    thought.topic = conversation.topic
    thought.summary = result.main_reply_native
    thought.final_content_native = text
    thought.final_content_target = result.expression_versions.get("advanced", "")
    thought.freeze_payload = {
        "keywords": result.keywords or result.vocabulary,
        "core_patterns": result.core_patterns or result.patterns,
        "grammar_structures": result.grammar_structures,
        "facts": result.facts,
        "values": result.values,
        "arguments": result.arguments,
        "expression_versions": result.expression_versions,
        "golden_quote": result.expression_versions.get(
            "golden_quote", result.suggested_expression
        ),
    }
    thought.status = "frozen"
    thought.frozen_at = utc_now()
    thought.mind_graph = {
        "nodes": [
            {"id": "topic", "label": conversation.topic, "type": "topic"},
            *[
                {"id": f"value-{index}", "label": value, "type": "value"}
                for index, value in enumerate(result.values)
            ],
            *[
                {"id": f"fact-{index}", "label": fact, "type": "fact"}
                for index, fact in enumerate(result.facts)
            ],
            *[
                {"id": f"argument-{index}", "label": argument, "type": "argument"}
                for index, argument in enumerate(result.arguments)
            ],
        ],
        "edges": [
            *[
                {"from": "topic", "to": f"value-{index}"}
                for index, _ in enumerate(result.values)
            ],
            *[
                {"from": "topic", "to": f"fact-{index}"}
                for index, _ in enumerate(result.facts)
            ],
            *[
                {"from": "topic", "to": f"argument-{index}"}
                for index, _ in enumerate(result.arguments)
            ],
        ],
        "facts": result.facts,
        "values": result.values,
        "arguments": result.arguments,
    }

    asset = db.scalar(
        select(ExpressionAsset).where(
            ExpressionAsset.thought_id == thought.id,
            ExpressionAsset.user_id == current_user.id,
        )
    )
    if asset:
        db.add(
            ExpressionAssetVersion(
                asset_id=asset.id,
                version=asset.current_version,
                variants=asset.variants,
                keywords=asset.keywords,
                patterns=asset.patterns,
                note="before freeze update",
            )
        )
        asset.title = title
        asset.source_text = text
        asset.target_language = conversation.target_language
        asset.variants = result.expression_versions
        asset.keywords = result.keywords or result.vocabulary
        asset.patterns = result.core_patterns or result.patterns
        asset.current_version += 1
        db.add(
            ExpressionAssetVersion(
                asset_id=asset.id,
                version=asset.current_version,
                variants=result.expression_versions,
                keywords=result.keywords or result.vocabulary,
                patterns=result.core_patterns or result.patterns,
                note="freeze update",
            )
        )
    else:
        asset = ExpressionAsset(
            user_id=current_user.id,
            thought_id=thought.id,
            title=title,
            source_text=text,
            target_language=conversation.target_language,
            variants=result.expression_versions,
            keywords=result.keywords or result.vocabulary,
            patterns=result.core_patterns or result.patterns,
            current_version=1,
        )
        db.add(asset)
        db.flush()
        db.add(
            ExpressionAssetVersion(
                asset_id=asset.id,
                version=1,
                variants=result.expression_versions,
                keywords=result.keywords or result.vocabulary,
                patterns=result.core_patterns or result.patterns,
                note="initial freeze",
            )
        )
    db.commit()
    db.refresh(asset)
    from app.services.gamification import award_xp
    award_xp(db, current_user.id, "freeze_thought", f"冻结思想: {thought.title}", thought.id)
    db.commit()
    return asset


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _build_chat_v2_response(data: dict) -> ChatV2Response:
    """Build a ChatV2Response from raw LLM JSON dict."""
    why_raw = data.get("why_this_expression", [])
    why_items = []
    for item in why_raw:
        if isinstance(item, dict):
            why_items.append(ChatV2WhyItem(
                point=item.get("point", ""),
                explanation=item.get("explanation", ""),
            ))

    patterns_raw = data.get("patterns", [])
    pattern_items = []
    for item in patterns_raw:
        if isinstance(item, dict):
            pattern_items.append(ChatV2PatternItem(
                pattern=item.get("pattern", ""),
                example=item.get("example", ""),
                add_to_crush=bool(item.get("add_to_crush", False)),
            ))
        elif isinstance(item, str):
            pattern_items.append(ChatV2PatternItem(pattern=item, example="", add_to_crush=False))

    mistakes_raw = data.get("mistakes", [])
    mistake_items = None
    if mistakes_raw:
        mistake_items = []
        for m in mistakes_raw:
            if isinstance(m, dict):
                mistake_items.append(MistakeItem(
                    type=m.get("type", ""),
                    original=m.get("original", ""),
                    corrected=m.get("corrected", ""),
                    explanation=m.get("explanation", ""),
                ))

    agents_raw = data.get("agents", [])
    agent_items = []
    for a in agents_raw:
        if isinstance(a, dict):
            agent_items.append(ChatV2AgentItem(
                agent=a.get("agent", ""),
                result=a.get("result", ""),
            ))

    nq_raw = data.get("next_question", {})
    if isinstance(nq_raw, dict):
        next_q = ChatV2NextQuestion(
            target=nq_raw.get("target", ""),
            native=nq_raw.get("native", ""),
        )
    else:
        next_q = ChatV2NextQuestion()

    vocab_raw = data.get("vocabulary", [])
    vocab = []
    for v in vocab_raw:
        if isinstance(v, str):
            vocab.append(v)
        elif isinstance(v, dict):
            word = v.get("word") or v.get("text") or v.get("expression") or next(iter(v.values()), "")
            if word:
                vocab.append(str(word))

    variants_raw = data.get("variants", {})
    if isinstance(variants_raw, dict):
        variants = {str(k): str(v) for k, v in variants_raw.items()}
    else:
        variants = {}

    return ChatV2Response(
        input_language=data.get("input_language", "zh"),
        detected_intent=data.get("detected_intent", "expression_learning"),
        main_expression=data.get("main_expression", ""),
        meaning_native=data.get("meaning_native", ""),
        variants=variants,
        why_this_expression=why_items,
        corrected_sentence=data.get("corrected_sentence"),
        mistakes=mistake_items,
        patterns=pattern_items,
        vocabulary=vocab,
        agents=agent_items,
        next_question=next_q,
    )


def _explanation_language(profile: ProfileRead | None, native_language: str) -> str:
    if profile and profile.explanation_language:
        return profile.explanation_language
    return native_language


# Markers that identify a low-latency "flash" chat model. The phase-1
# conversational reply (1-2 throwaway sentences, no learning content) is routed
# to such a model for a much faster time-to-first-token, while the phase-2
# learning analysis stays on the quality default model.
_FAST_MODEL_MARKERS = ("flash", "mini", "fast", "lite", "turbo", "haiku", "nano")


def _resolve_fast_reply_provider_name(db, default_provider_name: str) -> str:
    """Pick an enabled provider backed by a fast model for the conversational
    reply. Prefers one *other* than the default (quality) provider. Falls back
    to the default when no fast model is configured — zero behaviour change.
    """
    try:
        from app.models import AIProvider

        rows = list(db.scalars(select(AIProvider).where(AIProvider.enabled.is_(True))))
        candidates = [
            r for r in rows
            if any(m in (r.model_name or "").lower() for m in _FAST_MODEL_MARKERS)
        ]
        # Prefer a non-default provider (the default is the quality model we keep
        # for analysis); a stable secondary sort keeps results deterministic.
        candidates.sort(key=lambda r: (r.provider_name == default_provider_name, r.provider_name))
        if candidates:
            return candidates[0].provider_name
    except Exception:  # noqa: BLE001
        pass
    return default_provider_name


def _load_prompt_template(
    db: DBSession,
    task_type: str,
    native_language: str,
    target_language: str,
    explanation_language: str,
    user_level: str,
    user_topics: str,
    *,
    detect_target_language_input: bool = False,
) -> str | None:
    """Load a PromptTemplate from DB and inject variables. Returns None if not found."""
    row = db.scalar(
        select(PromptTemplate).where(
            PromptTemplate.task_type == task_type,
            PromptTemplate.enabled.is_(True),
        )
    )
    if not row:
        return None

    native_name = language_name(native_language)
    target_name = language_name(target_language)
    explanation_name = language_name(explanation_language or native_language)

    # Build correction block for target-language input detection
    from app.services.llm_openai import CORRECTION_BLOCK, CORRECTION_JSON_EXTRA

    if detect_target_language_input:
        correction_block = CORRECTION_BLOCK.format(
            target_language_name=target_name,
            native_language_name=explanation_name,
        )
        correction_json_extra = CORRECTION_JSON_EXTRA
    else:
        correction_block = ""
        correction_json_extra = ""

    try:
        return row.content.format(
            native_language=native_language,
            native_language_name=native_name,
            target_language=target_language,
            target_language_name=target_name,
            explanation_language=explanation_language or native_language,
            explanation_language_name=explanation_name,
            user_level=user_level,
            user_topics=user_topics,
            correction_block=correction_block,
            correction_json_extra=correction_json_extra,
        )
    except (KeyError, IndexError):
        return row.content


def _conversation_history(conversation: Conversation, *, limit: int = 20) -> list[dict[str, str]]:
    """Build OpenAI-style message history from prior turns (excludes the new user message)."""
    sorted_messages = sorted(conversation.messages, key=lambda message: message.created_at)
    history: list[dict[str, str]] = []
    for message in sorted_messages[-limit:]:
        role = "user" if message.role == "user" else "assistant"
        parts = [message.content or ""]
        if message.role == "assistant" and message.translated_content:
            target_line = message.translated_content.strip()
            if target_line and target_line not in parts[0]:
                parts.append(target_line)
        content = "\n".join(part for part in parts if part).strip()
        if content:
            history.append({"role": role, "content": content})
    return history


def _llm_meta_from_usage(usage: dict) -> dict[str, object]:
    return {
        "provider": usage.get("provider_name", ""),
        "model": usage.get("model_name", ""),
        "tokens_input": usage.get("tokens_input", 0),
        "tokens_output": usage.get("tokens_output", 0),
        "latency_ms": usage.get("latency_ms", 0),
    }


def _should_correct(content_language: str, target_language: str) -> bool:
    """Detect if user is writing in the target language, so we should add correction."""
    if content_language == "auto":
        return False
    return content_language == target_language


def _detect_content_language(text: str, native_language: str, target_language: str) -> str:
    """Best-effort detection of input language from text content.

    Returns the detected language code, or 'auto' if uncertain.
    Uses Unicode script analysis as a fast heuristic.
    """
    if not text or not text.strip():
        return "auto"

    # Count characters by script category
    cjk = 0
    latin = 0
    cyrillic = 0
    arabic_chars = 0
    hangul = 0
    hiragana_katakana = 0
    total = 0

    for char in text:
        if char.isspace() or unicodedata.category(char).startswith("P"):
            continue
        total += 1
        name = unicodedata.name(char, "")
        if "CJK" in name or "CHINESE" in name:
            cjk += 1
        elif "HANGUL" in name:
            hangul += 1
        elif "HIRAGANA" in name or "KATAKANA" in name:
            hiragana_katakana += 1
        elif "CYRILLIC" in name:
            cyrillic += 1
        elif "ARABIC" in name:
            arabic_chars += 1
        elif char.isascii() and char.isalpha():
            latin += 1

    if total == 0:
        return "auto"

    ratio = lambda count: count / total

    # Detect dominant script
    if ratio(cjk) > 0.3:
        return "zh"
    if ratio(hiragana_katakana) > 0.15:
        return "ja"
    if ratio(hangul) > 0.3:
        return "ko"
    if ratio(cyrillic) > 0.3:
        return "ru"
    if ratio(arabic_chars) > 0.3:
        return "ar"
    if ratio(latin) > 0.5:
        # Latin script — could be en/es/de/fr/sr(latin)/pt
        # Use simple heuristics for common target languages
        lower = text.lower()
        if target_language == "en" and re.search(r'\b(the|is|are|was|have|this|that|with)\b', lower):
            return "en"
        if target_language == "de" and re.search(r'\b(der|die|das|ist|und|ich|ein|nicht)\b', lower):
            return "de"
        if target_language == "es" and re.search(r'\b(el|la|es|los|las|que|por|una)\b', lower):
            return "es"
        if target_language == "fr" and re.search(r'\b(le|la|les|est|des|que|une|pas)\b', lower):
            return "fr"
        # Default to the target language if mostly Latin and target is Latin-script
        if target_language in {"en", "de", "es", "fr", "sr"}:
            return target_language
        return "en"  # fallback for Latin script

    return "auto"


def _write_usage_log(
    db: DBSession,
    user_id: str,
    provider,
    task_type: str,
    latency_ms: int,
) -> None:
    """Write a UsageLog entry from provider usage data."""
    usage = provider.last_usage
    if not usage:
        usage = {}

    log = UsageLog(
        user_id=user_id,
        provider_id=usage.get("provider_id"),
        task_type=task_type,
        tokens_input=usage.get("tokens_input", 0),
        tokens_output=usage.get("tokens_output", 0),
        latency_ms=usage.get("latency_ms", latency_ms),
        cost_estimate=_estimate_cost(
            usage.get("tokens_input", 0),
            usage.get("tokens_output", 0),
        ),
        status=usage.get("status", "ok"),
    )
    db.add(log)


def _estimate_cost(tokens_in: int, tokens_out: int) -> float:
    """Rough cost estimate in USD (gpt-4o-mini pricing as baseline)."""
    return (tokens_in * 0.15 + tokens_out * 0.60) / 1_000_000

