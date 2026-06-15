from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models import VocabularyItem, utc_now
from app.schemas import APIMessage, TokenExplainRequest, TokenExplainResponse, VocabularyRead
from app.services.llm import LLMUnavailableError, require_llm_provider
from app.services.runtime_config import resolve_default_llm_provider

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


@router.post("/explain", response_model=TokenExplainResponse)
async def explain_token(
    payload: TokenExplainRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> TokenExplainResponse:
    """Explain a single word/phrase. Caches result in VocabularyItem so repeat lookups skip LLM."""
    token = payload.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required")

    cached = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.user_id == current_user.id,
            VocabularyItem.word == token,
            VocabularyItem.language_code == payload.target_language,
        )
    )
    if cached and cached.meaning:
        extra = cached.examples[0] if cached.examples and isinstance(cached.examples[0], dict) else {}
        cached.last_seen_at = utc_now()
        db.commit()
        return TokenExplainResponse(
            token=token,
            meaning=cached.meaning,
            usage=str(extra.get("usage", "")),
            example=str(extra.get("example", "")),
            part_of_speech=str(extra.get("part_of_speech", "")),
        )

    try:
        provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
        data = await provider.explain_token(
            token,
            context=payload.context,
            native_language=payload.native_language,
            target_language=payload.target_language,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"LLM 调用失败：{exc}") from exc

    meaning = str(data.get("meaning", ""))
    usage = str(data.get("usage", ""))
    example = str(data.get("example", ""))
    pos = str(data.get("part_of_speech", ""))

    if cached:
        cached.meaning = meaning
        cached.examples = [{"usage": usage, "example": example, "part_of_speech": pos}]
        cached.last_seen_at = utc_now()
    else:
        db.add(VocabularyItem(
            user_id=current_user.id,
            word=token,
            meaning=meaning,
            language_code=payload.target_language,
            examples=[{"usage": usage, "example": example, "part_of_speech": pos}],
            mastery_status="seen",
            priority=3,
        ))
    db.commit()

    return TokenExplainResponse(
        token=data.get("token", token),
        meaning=meaning, usage=usage, example=example, part_of_speech=pos,
    )

_MASTERY_LEVELS = ["seen", "understood", "usable", "mastered"]
_SCORE_THRESHOLDS = {"seen": 30, "understood": 55, "usable": 75, "mastered": 90}


@router.get("/today", response_model=list[VocabularyRead])
def today_vocabulary(current_user: CurrentUser, db: DBSession) -> list[VocabularyItem]:
    today = datetime.now(UTC).date()
    items = list(
        db.scalars(
            select(VocabularyItem)
            .where(
                VocabularyItem.user_id == current_user.id,
                VocabularyItem.mastery_status.not_in(["mastered", "ignored"]),
            )
            .order_by(VocabularyItem.priority.desc(), VocabularyItem.last_seen_at.desc())
            .limit(30)
        )
    )
    return [
        item
        for item in items
        if item.last_seen_at is None or item.last_seen_at.date() == today
    ] or items[:10]


@router.get("", response_model=list[VocabularyRead])
def list_vocabulary(current_user: CurrentUser, db: DBSession) -> list[VocabularyItem]:
    return list(
        db.scalars(
            select(VocabularyItem)
            .where(VocabularyItem.user_id == current_user.id)
            .order_by(VocabularyItem.priority.desc(), VocabularyItem.created_at.desc())
        )
    )


@router.post("/{item_id}/mastered", response_model=VocabularyRead)
def mark_vocabulary_mastered(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> VocabularyItem:
    item = _get_item(item_id, current_user.id, db)
    item.mastery_status = "mastered"
    item.mastery_score = 100.0
    item.updated_at = utc_now()
    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/mark-mastered", response_model=VocabularyRead)
def mark_vocabulary_mastered_alias(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> VocabularyItem:
    return mark_vocabulary_mastered(item_id, current_user, db)


@router.post("/{item_id}/practice", response_model=VocabularyRead)
def practice_vocabulary(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> VocabularyItem:
    item = _get_item(item_id, current_user.id, db)
    item.last_seen_at = utc_now()
    gain = 8.0 if item.mastery_score < 50 else 5.0
    item.mastery_score = min(100.0, item.mastery_score + gain)
    for level in _MASTERY_LEVELS:
        if item.mastery_score >= _SCORE_THRESHOLDS[level]:
            item.mastery_status = level
    item.updated_at = utc_now()
    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/ignore", response_model=APIMessage)
def ignore_vocabulary(
    item_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> APIMessage:
    item = _get_item(item_id, current_user.id, db)
    item.mastery_status = "ignored"
    item.updated_at = utc_now()
    db.commit()
    return APIMessage(message="Vocabulary item ignored")


def _get_item(item_id: str, user_id: str, db: DBSession) -> VocabularyItem:
    item = db.scalar(
        select(VocabularyItem).where(
            VocabularyItem.id == item_id,
            VocabularyItem.user_id == user_id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Vocabulary item not found")
    return item
