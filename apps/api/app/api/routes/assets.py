from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.services.runtime_config import resolve_default_llm_provider
from app.models import ExpressionAsset, ExpressionAssetVersion
from app.schemas import AssetCreate, AssetRead, AssetVersionRead
from app.services.llm import get_llm_provider, require_llm_provider, LLMUnavailableError

router = APIRouter(prefix="/assets", tags=["assets"])


class WordExplainRequest(BaseModel):
    word: str
    sentence: str
    language: str = "en"


class SentenceExplainRequest(BaseModel):
    sentence: str
    language: str = "en"


class GenerateSimilarRequest(BaseModel):
    sentence: str
    count: int = 3
    language: str = "en"


class GenerateOppositeRequest(BaseModel):
    sentence: str
    language: str = "en"


@router.get("", response_model=list[AssetRead])
def list_assets(current_user: CurrentUser, db: DBSession) -> list[ExpressionAsset]:
    return list(
        db.scalars(
            select(ExpressionAsset)
            .where(ExpressionAsset.user_id == current_user.id)
            .order_by(ExpressionAsset.created_at.desc())
        )
    )


@router.post("", response_model=AssetRead)
async def create_asset(
    payload: AssetCreate,
    current_user: CurrentUser,
    db: DBSession,
) -> ExpressionAsset:
    provider = get_llm_provider(resolve_default_llm_provider(db), db=db)
    result = await provider.generate_expression_asset(
        source_text=payload.source_text,
        target_language=payload.target_language,
        title=payload.title,
    )
    asset = ExpressionAsset(
        user_id=current_user.id,
        thought_id=payload.thought_id,
        title=payload.title,
        source_text=payload.source_text,
        target_language=payload.target_language,
        variants=result.expression_versions,
        keywords=result.vocabulary,
        patterns=result.patterns,
        current_version=1,
    )
    db.add(asset)
    db.flush()
    db.add(
        ExpressionAssetVersion(
            asset_id=asset.id,
            version=1,
            variants=result.expression_versions,
            keywords=result.vocabulary,
            patterns=result.patterns,
            note="initial",
        )
    )
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetRead)
def get_asset(asset_id: str, current_user: CurrentUser, db: DBSession) -> ExpressionAsset:
    asset = db.scalar(
        select(ExpressionAsset).where(
            ExpressionAsset.id == asset_id,
            ExpressionAsset.user_id == current_user.id,
        )
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/{asset_id}/versions", response_model=list[AssetVersionRead])
def list_asset_versions(
    asset_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> list[ExpressionAssetVersion]:
    asset = get_asset(asset_id, current_user, db)
    return list(
        db.scalars(
            select(ExpressionAssetVersion)
            .where(ExpressionAssetVersion.asset_id == asset.id)
            .order_by(ExpressionAssetVersion.version.desc())
        )
    )


@router.post("/{asset_id}/generate-variants", response_model=AssetRead)
async def regenerate_variants(
    asset_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> ExpressionAsset:
    asset = get_asset(asset_id, current_user, db)
    provider = get_llm_provider(resolve_default_llm_provider(db), db=db)
    result = await provider.generate_expression_asset(
        source_text=asset.source_text,
        target_language=asset.target_language,
        title=asset.title,
    )

    db.add(
        ExpressionAssetVersion(
            asset_id=asset.id,
            version=asset.current_version,
            variants=asset.variants,
            keywords=asset.keywords,
            patterns=asset.patterns,
            note="before regenerate",
        )
    )

    asset.variants = result.expression_versions
    asset.keywords = result.vocabulary
    asset.patterns = result.patterns
    asset.current_version += 1

    db.add(
        ExpressionAssetVersion(
            asset_id=asset.id,
            version=asset.current_version,
            variants=result.expression_versions,
            keywords=result.vocabulary,
            patterns=result.patterns,
            note="regenerated",
        )
    )
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/{asset_id}/explain-word")
async def explain_word(
    asset_id: str,
    payload: WordExplainRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    get_asset(asset_id, current_user, db)
    try:
        provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    from app.services.llm import language_name
    lang_name = language_name(payload.language)

    system_prompt = (
        f"You are a {lang_name} language tutor. Explain the word '{payload.word}' "
        f"in the context of this sentence: \"{payload.sentence}\"\n\n"
        "Provide a concise explanation in JSON format with:\n"
        "- definition: brief definition in the user's native language (Chinese)\n"
        "- pronunciation: phonetic transcription\n"
        "- part_of_speech: grammatical role\n"
        "- usage_note: how it's used in this specific context\n"
        "- example: one additional example sentence\n"
        "- synonyms: 2-3 synonyms\n\n"
        "Reply with strict JSON only, no markdown."
    )

    try:
        result = await provider._call_llm(system_prompt, f"Explain: {payload.word}", task="word_explain")
        return {
            "word": payload.word,
            "definition": result.main_reply_native,
            "target_explanation": result.main_reply_target,
            "raw": result.model_dump(),
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{asset_id}/explain-sentence")
async def explain_sentence(
    asset_id: str,
    payload: SentenceExplainRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    get_asset(asset_id, current_user, db)
    try:
        provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    from app.services.llm import language_name
    lang_name = language_name(payload.language)

    system_prompt = (
        f"You are a {lang_name} grammar analyst. Analyze this sentence structure:\n"
        f"\"{payload.sentence}\"\n\n"
        "Provide analysis in JSON format with:\n"
        "- structure: sentence pattern (e.g., SVO, SVC)\n"
        "- grammar_points: list of key grammar structures used\n"
        "- word_roles: object mapping each word to its grammatical role\n"
        "- tense: verb tense used\n"
        "- register: formality level (formal/casual/academic)\n"
        "- improvement_suggestion: how to make it more natural (if applicable)\n\n"
        "Reply with strict JSON only, no markdown."
    )

    try:
        result = await provider._call_llm(system_prompt, f"Analyze: {payload.sentence}", task="sentence_analysis")
        return {
            "sentence": payload.sentence,
            "analysis_native": result.main_reply_native,
            "analysis_target": result.main_reply_target,
            "grammar_tips": [tip.model_dump() for tip in result.grammar_tips],
            "patterns": result.patterns,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{asset_id}/generate-similar")
async def generate_similar(
    asset_id: str,
    payload: GenerateSimilarRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    get_asset(asset_id, current_user, db)
    try:
        provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    from app.services.llm import language_name
    lang_name = language_name(payload.language)

    system_prompt = (
        f"You are a {lang_name} expression coach. Generate {payload.count} sentences "
        f"that express similar ideas to this sentence but with different wording:\n"
        f"\"{payload.sentence}\"\n\n"
        "Provide results in JSON format with:\n"
        "- similar_sentences: list of {payload.count} alternative expressions\n"
        "- difficulty_levels: list indicating difficulty (basic/intermediate/advanced) for each\n"
        "- usage_notes: brief note on when to use each variant\n\n"
        "Reply with strict JSON only, no markdown."
    )

    try:
        result = await provider._call_llm(system_prompt, f"Generate similar: {payload.sentence}", task="generate_similar")
        return {
            "original": payload.sentence,
            "similar_native": result.main_reply_native,
            "similar_target": result.main_reply_target,
            "expression_versions": result.expression_versions,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{asset_id}/generate-opposite")
async def generate_opposite(
    asset_id: str,
    payload: GenerateOppositeRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    get_asset(asset_id, current_user, db)
    try:
        provider = require_llm_provider(resolve_default_llm_provider(db), db=db)
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message) from exc

    from app.services.llm import language_name
    lang_name = language_name(payload.language)

    system_prompt = (
        f"You are a {lang_name} debate coach. Generate the opposing viewpoint expression "
        f"for this statement:\n\"{payload.sentence}\"\n\n"
        "Provide results in JSON format with:\n"
        "- opposite_statement: a well-argued opposing viewpoint\n"
        "- counter_arguments: 2-3 specific counterarguments\n"
        "- common_ground: areas where both sides might agree\n"
        "- debate_phrases: useful phrases for expressing disagreement\n\n"
        "Reply with strict JSON only, no markdown."
    )

    try:
        result = await provider._call_llm(system_prompt, f"Generate opposite: {payload.sentence}", task="generate_opposite")
        return {
            "original": payload.sentence,
            "opposite_native": result.main_reply_native,
            "opposite_target": result.main_reply_target,
            "arguments": result.arguments,
            "expression_versions": result.expression_versions,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
