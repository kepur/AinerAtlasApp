"""Conversation Thought Freeze — sync core + async job runner."""

from __future__ import annotations

import logging
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExpressionAsset, ExpressionAssetVersion, Thought, ThoughtVersion, UserProfile, utc_now
from app.schemas import AssetRead, ProfileRead
from app.services.freeze_helpers import ensure_expression_versions
from app.services.freeze_job_store import freeze_job_store
from app.services.gamification import award_xp
from app.services.llm import assert_real_llm_usage, require_llm_provider
from app.services.runtime_config import resolve_default_llm_provider

logger = logging.getLogger(__name__)


def _load_prompt_template(
    db: Session,
    *,
    task_type: str,
    native_language: str,
    target_language: str,
    explanation_language: str,
    user_level: str,
    user_topics: str,
) -> str:
    from app.api.routes.conversations import _load_prompt_template as load_tpl

    return load_tpl(
        db,
        task_type=task_type,
        native_language=native_language,
        target_language=target_language,
        explanation_language=explanation_language,
        user_level=user_level,
        user_topics=user_topics,
    )


def _explanation_language(profile: ProfileRead | None, native_language: str) -> str:
    from app.api.routes.conversations import _explanation_language

    return _explanation_language(profile, native_language)


def _write_usage_log(db: Session, *, user_id: str, provider, task_type: str, latency_ms: int) -> None:
    from app.api.routes.conversations import _write_usage_log

    _write_usage_log(
        db,
        user_id=user_id,
        provider=provider,
        task_type=task_type,
        latency_ms=latency_ms,
    )


async def execute_conversation_freeze(
    db: Session,
    *,
    conversation_id: str,
    user_id: str,
    title: str | None = None,
) -> ExpressionAsset:
    from app.api.routes.conversations import _require_user_conversation

    conversation = _require_user_conversation(db, conversation_id, user_id)
    text = "\n".join(
        f"{message.role}: {message.content}" for message in conversation.messages if message.content
    )
    if not text.strip():
        raise ValueError("对话内容为空，无法 Freeze")

    freeze_title = title or conversation.title
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    profile_read = ProfileRead.model_validate(profile) if profile else None

    system_prompt = _load_prompt_template(
        db,
        task_type="thought_freeze",
        native_language=conversation.native_language,
        target_language=conversation.target_language,
        explanation_language=_explanation_language(profile_read, conversation.native_language),
        user_level=profile_read.current_level if profile_read else "B1",
        user_topics=conversation.topic,
    )

    from app.services.llm import LLMUnavailableError

    provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
    started = time.perf_counter()
    try:
        result = await provider.generate_expression_asset(
            text,
            conversation.target_language,
            freeze_title,
            system_prompt_override=system_prompt,
        )
        assert_real_llm_usage(provider)
    except LLMUnavailableError:
        raise
    except Exception as exc:
        logger.exception("LLM freeze failed for conversation %s", conversation_id)
        raise RuntimeError(f"LLM 调用失败：{exc}。请到 Admin 检查 Provider 配置与 API Key。") from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    _write_usage_log(
        db,
        user_id=user_id,
        provider=provider,
        task_type="thought_freeze",
        latency_ms=latency_ms,
    )

    versions = ensure_expression_versions(result, source_text=text, title=freeze_title)
    result.expression_versions = versions

    thought = db.scalar(
        select(Thought).where(
            Thought.conversation_id == conversation.id,
            Thought.user_id == user_id,
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
            user_id=user_id,
            conversation_id=conversation.id,
            title=freeze_title,
            topic=conversation.topic,
            version=1,
        )
        db.add(thought)
        db.flush()

    thought.title = freeze_title
    thought.topic = conversation.topic
    thought.summary = result.main_reply_native or freeze_title
    thought.final_content_native = text
    thought.final_content_target = versions.get("advanced") or versions.get("natural_spoken") or ""
    thought.freeze_payload = {
        "keywords": result.keywords or result.vocabulary,
        "core_patterns": result.core_patterns or result.patterns,
        "grammar_structures": result.grammar_structures,
        "facts": result.facts,
        "values": result.values,
        "arguments": result.arguments,
        "expression_versions": versions,
        "golden_quote": versions.get("golden_quote", result.suggested_expression),
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
            *[{"from": "topic", "to": f"value-{index}"} for index, _ in enumerate(result.values)],
            *[{"from": "topic", "to": f"fact-{index}"} for index, _ in enumerate(result.facts)],
            *[{"from": "topic", "to": f"argument-{index}"} for index, _ in enumerate(result.arguments)],
        ],
        "facts": result.facts,
        "values": result.values,
        "arguments": result.arguments,
    }

    asset = db.scalar(
        select(ExpressionAsset).where(
            ExpressionAsset.thought_id == thought.id,
            ExpressionAsset.user_id == user_id,
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
        asset.title = freeze_title
        asset.source_text = text
        asset.target_language = conversation.target_language
        asset.variants = versions
        asset.keywords = result.keywords or result.vocabulary
        asset.patterns = result.core_patterns or result.patterns
        asset.current_version += 1
        db.add(
            ExpressionAssetVersion(
                asset_id=asset.id,
                version=asset.current_version,
                variants=versions,
                keywords=result.keywords or result.vocabulary,
                patterns=result.core_patterns or result.patterns,
                note="freeze update",
            )
        )
    else:
        asset = ExpressionAsset(
            user_id=user_id,
            thought_id=thought.id,
            title=freeze_title,
            source_text=text,
            target_language=conversation.target_language,
            variants=versions,
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
                variants=versions,
                keywords=result.keywords or result.vocabulary,
                patterns=result.core_patterns or result.patterns,
                note="initial freeze",
            )
        )

    db.commit()
    db.refresh(asset)
    award_xp(db, user_id, "freeze_thought", f"冻结思想: {thought.title}", thought.id)
    db.commit()
    db.refresh(asset)
    return asset


async def run_conversation_freeze_job(
    conversation_id: str,
    user_id: str,
    title: str | None,
) -> None:
    from app.db.session import SessionLocal
    from app.services.llm import LLMUnavailableError

    try:
        with SessionLocal() as db:
            asset = await execute_conversation_freeze(
                db,
                conversation_id=conversation_id,
                user_id=user_id,
                title=title,
            )
            payload = AssetRead.model_validate(asset).model_dump(mode="json")
            freeze_job_store.set(
                "conversation",
                conversation_id,
                user_id,
                {"status": "done", "asset": payload},
            )
    except LLMUnavailableError as exc:
        freeze_job_store.set(
            "conversation",
            conversation_id,
            user_id,
            {"status": "failed", "error": exc.message},
        )
    except Exception as exc:
        logger.exception("Async freeze job failed for conversation %s", conversation_id)
        freeze_job_store.set(
            "conversation",
            conversation_id,
            user_id,
            {"status": "failed", "error": str(exc)},
        )


def get_conversation_freeze_status(conversation_id: str, user_id: str) -> dict:
    job = freeze_job_store.get("conversation", conversation_id, user_id)
    if not job:
        return {"status": "idle"}
    return job
