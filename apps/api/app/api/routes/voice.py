import asyncio
import base64
import contextlib
import json
import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, QuotaManagerDep
from app.services.runtime_config import resolve_default_voice_provider, resolve_realtime_asr_provider
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.services.dashscope_client import resolve_dashscope_api_key
from app.db.session import SessionLocal
from datetime import UTC, datetime

from app.models import AIProvider, AppSettings, PronunciationScore, RealtimeSessionLog, UsageLog, User, VoiceSession
from app.services.membership_access import has_voice_coach_access
from app.schemas import (
    RealtimeCallSummaryRead,
    RealtimeCallSummaryRequest,
    TranscribeRequest,
    TranscribeResponse,
    VoiceReportRead,
    VoiceSessionCreate,
    VoiceSessionRead,
)
from app.services.voice import get_voice_provider
from app.services.voice_call_summary import generate_realtime_call_summary
from app.services.voice_group_match import join_queue, leave_queue, poll_match
from app.services.voice_learning_backfill import backfill_turn_huds
from app.services.voice_coach_profile import (
    build_session_coach_context,
    get_voice_coach_profile,
    profile_to_briefing,
)
from app.services.voice_realtime import get_realtime_adapter
from app.services.voice_report import generate_voice_report

router = APIRouter(prefix="/voice", tags=["voice"])
logger = logging.getLogger(__name__)


class TTSRequest(BaseModel):
    text: str
    voice: str = "warm-neutral"
    speed: float = 1.0
    language: str = ""  # optional hint ("zh", "en", "zh-CN"…) for the TTS router


class PronunciationRequest(BaseModel):
    audio_url: str = ""
    audio_base64: str = ""
    reference_text: str


class VoiceSessionComplete(BaseModel):
    duration_seconds: int = 0
    transcript: str = ""
    evaluations: list[dict] = []


def _resolve_audio_url(audio_url: str, audio_base64: str) -> str:
    if audio_base64:
        payload = audio_base64.strip()
        if "base64," in payload:
            payload = payload.split("base64,", 1)[1]
        return f"base64:{payload}"
    return audio_url


async def _transcribe_audio(
    db: DBSession,
    audio_ref: str,
    language: str,
    mime_type: str = "audio/webm",
) -> tuple[str, str]:
    """Transcribe with DashScope ASR first, then provider fallbacks."""
    from app.services.aliyun_speech_assessment import _decode_audio_ref, transcribe_general_audio
    from app.services.dashscope_client import dashscope_enabled, resolve_dashscope_config
    from app.services.voice import MockVoiceProvider

    try:
        audio_bytes = _decode_audio_ref(audio_ref)
    except Exception:
        audio_bytes = b""

    if not audio_bytes:
        return "", "none"

    if dashscope_enabled(db):
        cfg = resolve_dashscope_config(db)
        if cfg and cfg.api_key:
            try:
                text = await transcribe_general_audio(
                    cfg.api_key,
                    audio_bytes,
                    mime=mime_type,
                    language=language,
                )
                if text.strip():
                    return text.strip(), "fun-asr-flash"
            except Exception as exc:
                logger.warning("DashScope chat ASR failed: %s", exc)

    provider_name = resolve_default_voice_provider(db)
    provider = get_voice_provider(provider_name, db)
    try:
        try:
            text = (await provider.transcribe(audio_ref, language, mime_type=mime_type)).strip()
        except TypeError:
            text = (await provider.transcribe(audio_ref, language)).strip()
        if text:
            return text, provider_name
    except Exception as exc:
        logger.warning("Primary voice provider ASR failed (%s): %s", provider_name, exc)

    if provider_name != "openai":
        openai_provider = get_voice_provider("openai", db)
        try:
            text = (await openai_provider.transcribe(audio_ref, language, mime_type=mime_type)).strip()
            if text:
                return text, "openai"
        except Exception as exc:
            logger.warning("OpenAI ASR fallback failed: %s", exc)

    if len(audio_bytes) < 512:
        mock = MockVoiceProvider()
        return (await mock.transcribe(audio_ref, language)).strip(), "mock"

    logger.warning("ASR failed for %d byte recording (mime=%s)", len(audio_bytes), mime_type)
    return "", "none"


# ── In-memory TTS cache ────────────────────────────────────────────────────
# Pre-scripted game content (story openings, character greetings, fixed lines)
# is identical across users and replays. Re-synthesising it every time wastes
# DashScope quota and adds latency. A small LRU keyed by the resolved provider
# + voice + speed + text lets identical phrases be served instantly after the
# first synthesis. Cleared on process restart (e.g. --reload) — that's fine.
import hashlib
from collections import OrderedDict

_TTS_CACHE: "OrderedDict[str, dict]" = OrderedDict()
_TTS_CACHE_MAX = 512


def _tts_cache_key(provider: str, voice: str, language: str, speed: float, text: str) -> str:
    raw = f"{provider}|{voice}|{language}|{speed}|{text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _tts_cache_get(key: str) -> dict | None:
    val = _TTS_CACHE.get(key)
    if val is not None:
        _TTS_CACHE.move_to_end(key)
    return val


def _tts_cache_put(key: str, val: dict | None) -> None:
    # Only cache successful results that actually carry audio.
    if not val or val.get("error"):
        return
    if not (val.get("audio_base64") or val.get("audio_url")):
        return
    _TTS_CACHE[key] = val
    _TTS_CACHE.move_to_end(key)
    while len(_TTS_CACHE) > _TTS_CACHE_MAX:
        _TTS_CACHE.popitem(last=False)


@router.post("/session", response_model=VoiceSessionRead)
def create_voice_session(
    payload: VoiceSessionCreate,
    current_user: CurrentUser,
    db: DBSession,
    quota: QuotaManagerDep,
) -> VoiceSession:
    quota.consume_voice_minutes(current_user)

    session = VoiceSession(
        user_id=current_user.id,
        conversation_id=payload.conversation_id,
        provider=resolve_default_voice_provider(db),
        analysis={"mode": payload.mode, "target_language": payload.target_language},
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=list[VoiceSessionRead])
def list_voice_sessions(current_user: CurrentUser, db: DBSession) -> list[VoiceSession]:
    return list(
        db.scalars(
            select(VoiceSession)
            .where(VoiceSession.user_id == current_user.id)
            .order_by(VoiceSession.created_at.desc())
        )
    )


@router.post("/group/match/join")
def voice_group_match_join(current_user: CurrentUser) -> dict:
    return join_queue(current_user.id)


@router.get("/group/match/status")
def voice_group_match_status(current_user: CurrentUser) -> dict:
    return poll_match(current_user.id)


@router.post("/group/match/leave")
def voice_group_match_leave(current_user: CurrentUser) -> dict:
    return leave_queue(current_user.id)


@router.post("/tts")
async def synthesize(payload: TTSRequest, db: DBSession) -> dict:
    # Serve identical phrases from the LRU cache (see _TTS_CACHE) so pre-scripted
    # game content isn't re-synthesised on every replay. Keyed by the configured
    # provider so an admin provider switch naturally invalidates stale entries.
    _app = db.get(AppSettings, "default")
    _provider = getattr(_app, "tts_provider", "browser") or "browser" if _app else "browser"
    _key = _tts_cache_key(_provider, payload.voice or "", payload.language or "", payload.speed, payload.text)
    _hit = _tts_cache_get(_key)
    if _hit is not None:
        return {**_hit, "cached": True}

    result = await _synthesize_impl(payload, db)
    _tts_cache_put(_key, result)
    return result


async def _synthesize_impl(payload: TTSRequest, db: DBSession) -> dict:
    # ── Game voice-preset path ───────────────────────────────────────────
    # When the frontend sends a game preset id (e.g. "female_warm") we resolve
    # it to a provider-specific voice and synthesise with the *configured*
    # default provider — NOT with the language router, which would override the
    # chosen provider and produce the wrong voice (e.g. cosyvoice ignoring
    # an OpenAI voice name like "nova").
    try:
        from app.services.game_assets import _VOICE_BY_ID, provider_voice_for
        if payload.voice in _VOICE_BY_ID:
            preset = _VOICE_BY_ID[payload.voice]
            app = db.get(AppSettings, "default")
            tts = getattr(app, "tts_provider", "browser") or "browser" if app else "browser"
            voice_name = provider_voice_for(preset["id"], tts)
            return await _synthesize_with_provider(
                db, tts, payload.text, voice_name, payload.speed, app,
            )
    except Exception:  # noqa: BLE001
        pass

    # ── General path (language-aware routing) ──────────────────────────────
    app = db.get(AppSettings, "default")
    tts = getattr(app, "tts_provider", "browser") or "browser" if app else "browser"
    global_keys = getattr(app, "global_api_keys", []) or [] if app else []

    # TTS language router: pick the best provider for the text's language.
    from app.services.tts_router import synthesize_routed
    routed = await synthesize_routed(
        db,
        payload.text,
        language=payload.language or None,
        speed=payload.speed,
        configured_default=tts,
    )
    if routed and (routed.get("audio_url") or routed.get("audio_base64")):
        return routed

    # Fallback to configured provider without language routing
    return await _synthesize_with_provider(
        db, tts, payload.text, payload.voice, payload.speed, app,
    )


async def _synthesize_with_provider(
    db, provider_name: str, text: str, voice: str, speed: float, app,
) -> dict:
    """Build the correct provider instance and call synthesize."""
    from app.core.security import decrypt_api_key
    from app.services.dashscope_client import resolve_dashscope_api_key
    from app.services.voice_cosyvoice import CosyVoiceProvider
    from app.services.voice_qwentts import QwenTTSProvider

    app = app or db.get(AppSettings, "default")
    global_keys = getattr(app, "global_api_keys", []) or [] if app else []

    def get_key(keys, platform):
        if isinstance(keys, list):
            for e in keys:
                if isinstance(e, dict) and e.get("platform") == platform:
                    return e.get("api_key", "")
        elif isinstance(keys, dict):
            return keys.get(f"{platform}_api_key", "")
        return ""

    def find_provider_key(pname):
        row = db.scalar(select(AIProvider).where(AIProvider.provider_name == pname, AIProvider.enabled == True).limit(1))
        if row:
            try:
                k = decrypt_api_key(row.api_key_encrypted)
                if k: return k
            except: pass
        return ""

    if provider_name == "cosyvoice":
        default_voice = getattr(app, "tts_voice", "longanhuan") or "longanhuan" if app else "longanhuan"
        api_key = get_key(global_keys, "dashscope") or find_provider_key("cosyvoice") or find_provider_key("dashscope") or resolve_dashscope_api_key(db) or ""
        if not api_key:
            return {"audio_url": "", "audio_base64": "", "provider": "cosyvoice", "error": "请在 Global API Keys 中添加 dashscope 平台的 API Key"}
        provider = CosyVoiceProvider(api_key=api_key, voice=voice or default_voice)
        return await provider.synthesize(text, voice or default_voice, speed)

    if provider_name == "qwentts":
        default_voice = getattr(app, "tts_voice", "Cherry") or "Cherry" if app else "Cherry"
        api_key = get_key(global_keys, "dashscope") or find_provider_key("qwentts") or find_provider_key("dashscope") or resolve_dashscope_api_key(db) or ""
        if not api_key:
            return {"audio_url": "", "audio_base64": "", "provider": "qwentts", "error": "请在 Global API Keys 中添加 dashscope 平台的 API Key"}
        provider = QwenTTSProvider(api_key=api_key, voice=voice or default_voice)
        return await provider.synthesize(text, voice or default_voice, speed)

    # openai / mock / other
    from app.services.voice import get_voice_provider
    from app.services.runtime_config import resolve_default_voice_provider
    provider = get_voice_provider(resolve_default_voice_provider(db), db)
    return await provider.synthesize(text, voice, speed)


@router.post("/tts-mixed")
async def synthesize_mixed(payload: TTSRequest, db: DBSession) -> dict:
    """Synthesize mixed-language text as ordered per-language segments.

    The frontend plays the returned clips back-to-back, so English runs use an
    English-strong voice and Chinese runs use a Chinese-strong voice.
    """
    app = db.get(AppSettings, "default")
    tts = getattr(app, 'tts_provider', 'browser') or 'browser' if app else 'browser'
    from app.services.tts_router import synthesize_mixed_single
    # Returns one concatenated MP3 (audio_base64) when possible, plus the segments
    # so the frontend can fall back to sequential playback.
    return await synthesize_mixed_single(db, payload.text, speed=payload.speed, configured_default=tts)


@router.get("/tts-capabilities")
def tts_capabilities(db: DBSession) -> dict:
    """Expose the TTS provider capability table + which providers are enabled."""
    from app.services.tts_router import PROVIDER_VOICE_CAPABILITIES, _enabled_voice_providers
    return {
        "capabilities": PROVIDER_VOICE_CAPABILITIES,
        "enabled_providers": sorted(_enabled_voice_providers(db)),
    }


@router.get("/voices")
def list_voices() -> list[dict]:
    from app.services.voice_openai import VOICE_OPTIONS
    from app.services.voice_cosyvoice import COSYVOICE_VOICE_LABELS, COSYVOICE_MODELS
    from app.services.voice_qwentts import QWEN_TTS_VOICES
    cosy = [
        {"id": vid, "label": COSYVOICE_VOICE_LABELS.get(vid, vid), "provider": "cosyvoice", "model": model_id, "legend": model_info["label"]}
        for model_id, model_info in COSYVOICE_MODELS.items()
        for vid in model_info["voices"]
    ]
    qwen = [
        {"id": vid, "label": QWEN_TTS_VOICES.get(vid, vid), "provider": "qwentts", "model": "qwen3-tts-flash", "legend": "Qwen-TTS"}
        for vid in QWEN_TTS_VOICES
    ]
    return VOICE_OPTIONS + cosy + qwen


class WordTTSRequest(BaseModel):
    word: str
    language: str = "en"
    voice: str = "alloy"


@router.post("/word-tts")
async def word_tts(payload: WordTTSRequest, db: DBSession) -> dict:
    provider = get_voice_provider(resolve_default_voice_provider(db), db)
    text = f"The word is: {payload.word}. {payload.word}."
    return await provider.synthesize(text, payload.voice, 0.85)


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(payload: TranscribeRequest, db: DBSession) -> TranscribeResponse:
    audio_ref = _resolve_audio_url(payload.audio_url, payload.audio_base64)
    lang = (payload.language or "").strip()
    if lang in {"", "auto"}:
        lang = ""
    mime = (payload.mime_type or "audio/webm").strip() or "audio/webm"
    text, provider_name = await _transcribe_audio(db, audio_ref, lang, mime_type=mime)
    return TranscribeResponse(text=text, provider=provider_name, language=lang or "auto")


class AnalyzeRequest(BaseModel):
    transcript: str
    language: str = "en"


@router.post("/analyze")
def analyze_transcript_endpoint(
    payload: AnalyzeRequest,
    current_user: CurrentUser,
) -> dict:
    from app.services.voice_analyzer import analyze_transcript
    return analyze_transcript(payload.transcript, payload.language)


@router.websocket("/stream-asr")
async def stream_asr(websocket: WebSocket):
    await websocket.accept()
    token = None
    for key, value in websocket.headers.items():
        if key.lower() == "authorization":
            token = value.replace("Bearer ", "")
            break
    if not token:
        params = dict(websocket.query_params)
        token = params.get("token", "")
    if token:
        try:
            from app.core.security import decode_access_token
            decode_access_token(token)
        except Exception:
            await websocket.close(code=4001, reason="Invalid token")
            return

    try:
        with SessionLocal() as db:
            from app.services.runtime_config import resolve_realtime_asr_provider

            adapter = get_realtime_adapter(resolve_realtime_asr_provider(db), db=db)
            async for message in websocket.iter_text():
                data = json.loads(message) if isinstance(message, str) else message
                action = data.get("action", "audio")
                if action == "start":
                    await adapter.start_session(
                        language=data.get("language", "en"),
                        mode="streaming-asr",
                    )
                    await websocket.send_json({"type": "session_started"})
                elif action == "audio":
                    audio_chunk = data.get("data", "")
                    result = await adapter.process_audio(audio_chunk)
                    if result:
                        await websocket.send_json({"type": "partial", "text": result})
                elif action == "end":
                    final = await adapter.end_session()
                    await websocket.send_json({"type": "final", "text": final.get("transcript", "")})
                    break
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "detail": str(exc)})
        except Exception:
            pass


@router.post("/evaluate")
async def evaluate_pronunciation(
    payload: PronunciationRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    audio_ref = _resolve_audio_url(payload.audio_url, payload.audio_base64)

    from app.services.aliyun_speech_assessment import (
        evaluate_with_aliyun_assessment,
        evaluate_with_dashscope_fallback,
    )

    result = await evaluate_with_aliyun_assessment(db, audio_ref, payload.reference_text)
    if not result:
        result = await evaluate_with_dashscope_fallback(db, audio_ref, payload.reference_text)

    from app.services.voice_analyzer import analyze_transcript
    transcript = result.get("transcript", "")
    voice_analysis = analyze_transcript(transcript)

    score = PronunciationScore(
        user_id=current_user.id,
        reference_text=payload.reference_text,
        spoken_text=transcript,
        fluency_score=result.get("fluency_score", voice_analysis.get("fluency_score", 50)),
        accuracy_score=result.get("accuracy_score", 50),
        completeness_score=result.get("completeness_score", result.get("pronunciation_score", result.get("accuracy_score", 50))),
        analysis={**result, "voice_analysis": voice_analysis},
    )
    db.add(score)
    db.commit()
    db.refresh(score)

    return {**result, "score_id": score.id, "voice_analysis": voice_analysis}


@router.post("/session/{session_id}/complete", response_model=VoiceReportRead)
def complete_voice_session(
    session_id: str,
    payload: VoiceSessionComplete,
    current_user: CurrentUser,
    db: DBSession,
) -> VoiceReportRead:
    session = db.get(VoiceSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Voice session not found")

    session.duration_seconds = payload.duration_seconds
    session.transcript = payload.transcript
    session.analysis = {
        **(session.analysis or {}),
        "transcript": payload.transcript,
        "evaluations": payload.evaluations,
    }
    report = generate_voice_report(session)
    session.analysis = {**(session.analysis or {}), "report": report}
    db.add(
        UsageLog(
            user_id=current_user.id,
            task_type="voice_report",
            voice_seconds=payload.duration_seconds,
            cost_estimate=round(payload.duration_seconds * 0.0002, 4),
            status="ok",
        )
    )
    db.commit()
    db.refresh(session)
    return VoiceReportRead(**report)


@router.post("/realtime/summary", response_model=RealtimeCallSummaryRead)
async def create_realtime_call_summary(
    payload: RealtimeCallSummaryRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> RealtimeCallSummaryRead:
    """Persist a post-call summary for realtime Voice Coach (not a Freeze asset)."""
    if not payload.turns and payload.duration_seconds <= 0:
        raise HTTPException(status_code=400, detail="No call data to summarize")

    provider = payload.provider or resolve_default_voice_provider(db)
    turns_data = [t.model_dump() for t in payload.turns]
    turns_data = await backfill_turn_huds(
        db,
        current_user.id,
        turns_data,
        mode=payload.mode,
        topic=payload.topic,
    )

    session = VoiceSession(
        user_id=current_user.id,
        provider=provider,
        duration_seconds=max(1, payload.duration_seconds),
        transcript="\n".join(
            f"User: {t.user_text}\nCoach: {t.ai_reply}".strip()
            for t in payload.turns
            if t.user_text or t.ai_reply
        ),
        analysis={"mode": payload.mode, "realtime_summary": True, "turns": turns_data},
    )
    db.add(session)
    db.flush()

    report = generate_realtime_call_summary(
        session_id=session.id,
        provider=provider,
        duration_seconds=payload.duration_seconds,
        turns=turns_data,
        mode=payload.mode,
    )
    session.analysis = {**(session.analysis or {}), "report": report}
    db.add(
        UsageLog(
            user_id=current_user.id,
            task_type="voice_report",
            voice_seconds=payload.duration_seconds,
            cost_estimate=round(max(1, payload.duration_seconds) * 0.0002, 4),
            status="ok",
        )
    )
    db.commit()
    db.refresh(session)
    return RealtimeCallSummaryRead(**report)


@router.get("/session/{session_id}/report", response_model=VoiceReportRead)
def get_voice_report(
    session_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> VoiceReportRead:
    session = db.get(VoiceSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Voice session not found")
    report = (session.analysis or {}).get("report") or generate_voice_report(session)
    return VoiceReportRead(**report)


@router.post("/realtime/session")
async def realtime_session(payload: VoiceSessionCreate, db: DBSession) -> dict:
    adapter = get_realtime_adapter(resolve_realtime_asr_provider(db), db=db)
    return await adapter.create_session(payload.model_dump())


async def _send_adapter_messages(
    websocket: WebSocket,
    messages: list[dict] | dict | None,
    lock: asyncio.Lock | None = None,
) -> None:
    if not messages:
        return
    payload = messages if isinstance(messages, list) else [messages]
    for message in payload:
        if message:
            if lock is not None:
                async with lock:
                    await websocket.send_json(message)
            else:
                await websocket.send_json(message)


@router.websocket("/realtime-tts")
async def realtime_tts_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    token = websocket.query_params.get("token", "")
    if token:
        try:
            from app.core.security import decode_access_token
            decode_access_token(token)
        except Exception:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return

    try:
        from app.services.voice_realtime_tts import synthesize_qwen_realtime, synthesize_cosyvoice_realtime, get_global_api_key
        with SessionLocal() as db:
            app = db.get(AppSettings, "default")
            tts_provider = getattr(app, "tts_provider", "browser") or "browser" if app else "browser"
            voice = getattr(app, "tts_voice", "Cherry") or "Cherry" if app else "Cherry"
            api_key = get_global_api_key(db, "dashscope") or resolve_dashscope_api_key(db) or ""

            async for message in websocket.iter_text():
                data = json.loads(message)
                text = data.get("text", "")
                action = data.get("action", "tts")
                if action == "tts" and text:
                    try:
                        if tts_provider == "cosyvoice":
                            audio = await synthesize_cosyvoice_realtime(api_key, text, voice)
                        else:
                            audio = await synthesize_qwen_realtime(api_key, text, voice)
                        b64 = base64.b64encode(audio).decode("ascii")
                        await websocket.send_json({"type": "audio", "data": b64, "mime": "audio/mpeg"})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "message": str(e)})
    except WebSocketDisconnect:
        pass


@router.get("/coach-profile")
def get_my_voice_coach_profile(current_user: CurrentUser, db: DBSession) -> dict:
    """Return cached Voice Coach daily profile (no LLM on read)."""
    row = get_voice_coach_profile(db, current_user.id)
    if not row:
        ctx = build_session_coach_context(db, current_user.id, mode="free", topic="voice chat")
        db.commit()
        return {"profile": ctx.get("coach_briefing"), "cached": False}
    return {"profile": profile_to_briefing(row), "cached": True}


@router.websocket("/realtime")
async def realtime_voice_ws(websocket: WebSocket) -> None:
    """WebSocket endpoint for bidirectional realtime voice + DashScope ASR."""
    await websocket.accept()
    token = websocket.query_params.get("token", "")
    # Optional practice mode steers the AI partner's persona/topic.
    mode = websocket.query_params.get("mode", "free")
    user_id: str | None = None

    if token:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")
        except Exception:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return

    # Map the practice mode to a dialogue topic the realtime adapter threads
    # into the AI partner's reply generation.
    industry = (websocket.query_params.get("industry") or "").strip()
    ielts_band = (websocket.query_params.get("ielts_band") or "").strip()
    room_id = (websocket.query_params.get("room_id") or "").strip()

    if mode == "interview":
        parts = ["English job interview practice"]
        if industry:
            parts.append(f"industry: {industry}")
        if ielts_band:
            parts.append(f"IELTS speaking band target: {ielts_band}")
        session_topic = (
            " — ".join(parts)
            + " — the AI acts as a professional interviewer, asks one question at a time, "
            "and briefly evaluates each answer."
        )
    elif mode == "group":
        room_hint = f" room {room_id}" if room_id else ""
        session_topic = (
            f"group voice English practice{room_hint} — multiple learners practice together; "
            "the AI facilitates turn-taking, keeps everyone engaged, and gives brief feedback."
        )
    else:
        _MODE_TOPICS = {
            "free": "free natural conversation",
        }
        session_topic = _MODE_TOPICS.get(mode, _MODE_TOPICS["free"])

    with SessionLocal() as db:
        if user_id:
            user = db.get(User, user_id)
            if not user or not has_voice_coach_access(user):
                await websocket.send_json(
                    {
                        "type": "error",
                        "code": "vip_required",
                        "message": "Voice Coach requires VIP membership. Please upgrade to continue.",
                    }
                )
                await websocket.close()
                return

        adapter = get_realtime_adapter(resolve_realtime_asr_provider(db), db=db)
        coach_ctx = build_session_coach_context(
            db,
            user_id,
            mode=mode,
            topic=session_topic,
            industry=industry,
            ielts_band=ielts_band,
        ) if user_id else {}
        if user_id:
            db.commit()
        session_info = await adapter.create_session({
            "user_id": user_id,
            "mode": mode,
            "topic": session_topic,
            **coach_ctx,
        })
        await websocket.send_json({"type": "session", **session_info})

        session_started = datetime.now(UTC)
        realtime_log = None
        if user_id:
            realtime_log = RealtimeSessionLog(
                user_id=user_id,
                provider=session_info.get("provider", resolve_default_voice_provider(db)),
                status="started",
            )
            db.add(realtime_log)
            db.commit()
            db.refresh(realtime_log)

        pump_stop = asyncio.Event()
        pump_resume = asyncio.Event()
        pump_resume.set()
        # Starlette WebSockets do not allow concurrent sends. The pump task and
        # the inbound message loop both emit events, so every outbound write must
        # go through this lock to avoid interleaved frames that crash the socket.
        send_lock = asyncio.Lock()

        async def pump_asr_events() -> None:
            while not pump_stop.is_set():
                await pump_resume.wait()
                events = await adapter.drain_events(timeout=0.2)
                for event in events:
                    if event.get("type") in {"asr_ready", "asr_closed", "asr_complete"}:
                        continue
                    async with send_lock:
                        await websocket.send_json(event)
                if adapter.is_active():
                    continue
                await asyncio.sleep(0.05)

        pump_task = asyncio.create_task(pump_asr_events())

        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    data = {"type": "audio", "data": raw}

                if data.get("type") == "close":
                    break

                if data.get("type") == "ping":
                    async with send_lock:
                        await websocket.send_json({"type": "pong"})
                    continue

                # High-frequency PCM chunks should not pause the outbound event pump.
                is_streaming_pcm = (
                    data.get("type") == "audio"
                    and data.get("action") not in {"start", "end"}
                    and (data.get("data") or data.get("format") == "pcm16")
                )
                if is_streaming_pcm:
                    responses = await adapter.handle_client_message(data)
                    await _send_adapter_messages(websocket, responses, send_lock)
                    continue

                pump_resume.clear()
                try:
                    responses = await adapter.handle_client_message(data)
                    await _send_adapter_messages(websocket, responses, send_lock)
                finally:
                    pump_resume.set()
        except WebSocketDisconnect:
            pass
        except Exception as e:
            if realtime_log:
                realtime_log.status = "error"
                realtime_log.error_message = str(e)
                db.commit()
        finally:
            pump_stop.set()
            pump_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await pump_task
            await adapter.close()
            if realtime_log and realtime_log.status == "started":
                elapsed = int((datetime.now(UTC) - session_started).total_seconds())
                realtime_log.status = "completed"
                realtime_log.duration_seconds = elapsed
                db.commit()
            if user_id:
                elapsed = int((datetime.now(UTC) - session_started).total_seconds())
                session = VoiceSession(
                    user_id=user_id,
                    provider=session_info.get("provider", resolve_default_voice_provider(db)),
                    duration_seconds=max(1, elapsed),
                    analysis={"mode": "realtime-ws", "asr_engine": session_info.get("asr_engine", "mock")},
                )
                db.add(session)
                db.commit()
