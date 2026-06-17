import asyncio
import base64
import contextlib
import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, QuotaManagerDep
from app.services.runtime_config import resolve_default_voice_provider
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.services.dashscope_client import resolve_dashscope_api_key
from app.db.session import SessionLocal
from datetime import UTC, datetime

from app.models import AIProvider, AppSettings, PronunciationScore, RealtimeSessionLog, UsageLog, VoiceSession
from app.schemas import (
    TranscribeRequest,
    TranscribeResponse,
    VoiceReportRead,
    VoiceSessionCreate,
    VoiceSessionRead,
)
from app.services.voice import get_voice_provider
from app.services.voice_realtime import get_realtime_adapter
from app.services.voice_report import generate_voice_report

router = APIRouter(prefix="/voice", tags=["voice"])


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
        return f"base64:{audio_base64}"
    return audio_url


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


@router.post("/tts")
async def synthesize(payload: TTSRequest, db: DBSession) -> dict:
    # Map a game voice-preset id (e.g. "female_warm") to a provider voice.
    try:
        from app.services.game_assets import _VOICE_BY_ID, provider_voice_for
        if payload.voice in _VOICE_BY_ID:
            payload.voice = provider_voice_for(payload.voice)
    except Exception:  # noqa: BLE001
        pass

    def get_key(keys, platform):
        if isinstance(keys, list):
            for e in keys:
                if isinstance(e, dict) and e.get("platform") == platform:
                    return e.get("api_key", "")
        elif isinstance(keys, dict):
            return keys.get(f"{platform}_api_key", "")
        return ""
    
    def find_provider_key(provider_name):
        row = db.scalar(select(AIProvider).where(AIProvider.provider_name == provider_name, AIProvider.enabled == True).limit(1))
        if row:
            try:
                k = decrypt_api_key(row.api_key_encrypted)
                if k: return k
            except: pass
        return ""
    
    from app.services.voice_cosyvoice import CosyVoiceProvider
    from app.services.voice_qwentts import QwenTTSProvider
    from app.core.security import decrypt_api_key

    app = db.get(AppSettings, "default")
    tts = getattr(app, 'tts_provider', 'browser') or 'browser' if app else 'browser'
    global_keys = getattr(app, 'global_api_keys', []) or [] if app else []

    # --- TTS language router: pick the best provider for the text's language ---
    # (e.g. read English with OpenAI even if the default provider is a Chinese
    # specialist). Only takes over when it can confidently route; otherwise we
    # fall through to the configured-provider logic below.
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

    if tts == "cosyvoice":
        voice = getattr(app, 'tts_voice', 'longanhuan') or 'longanhuan' if app else 'longanhuan'
        api_key = get_key(global_keys, "dashscope") or find_provider_key("cosyvoice") or find_provider_key("dashscope") or resolve_dashscope_api_key(db) or ""
        if not api_key:
            return {"audio_url": "", "audio_base64": "", "provider": "cosyvoice", "error": "请在 Global API Keys 中添加 dashscope 平台的 API Key 或设置 DASHSCOPE_API_KEY 环境变量"}
        provider = CosyVoiceProvider(api_key=api_key, voice=voice)
        return await provider.synthesize(payload.text, voice, payload.speed)

    if tts == "qwentts":
        voice = getattr(app, 'tts_voice', 'Cherry') or 'Cherry' if app else 'Cherry'
        api_key = get_key(global_keys, "dashscope") or find_provider_key("qwentts") or find_provider_key("dashscope") or resolve_dashscope_api_key(db) or ""
        if not api_key:
            return {"audio_url": "", "audio_base64": "", "provider": "qwentts", "error": "请在 Global API Keys 中添加 dashscope 平台的 API Key 或设置 DASHSCOPE_API_KEY 环境变量"}
        provider = QwenTTSProvider(api_key=api_key, voice=voice)
        return await provider.synthesize(payload.text, voice, payload.speed)
    
    provider = get_voice_provider(resolve_default_voice_provider(db), db)
    return await provider.synthesize(payload.text, payload.voice, payload.speed)


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
    provider_name = resolve_default_voice_provider(db)
    provider = get_voice_provider(provider_name, db)
    audio_ref = _resolve_audio_url(payload.audio_url, payload.audio_base64)
    text = await provider.transcribe(audio_ref, payload.language)
    return TranscribeResponse(text=text, provider=provider_name, language=payload.language)


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
            adapter = get_realtime_adapter(db)
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
    provider = get_voice_provider(resolve_default_voice_provider(db), db)
    audio_ref = _resolve_audio_url(payload.audio_url, payload.audio_base64)
    result = await provider.evaluate_pronunciation(audio_ref, payload.reference_text)

    from app.services.voice_analyzer import analyze_transcript
    transcript = result.get("transcript", "")
    voice_analysis = analyze_transcript(transcript)

    score = PronunciationScore(
        user_id=current_user.id,
        reference_text=payload.reference_text,
        spoken_text=transcript,
        fluency_score=result.get("fluency_score", voice_analysis.get("fluency_score", 50)),
        accuracy_score=result.get("accuracy_score", 50),
        completeness_score=result.get("pronunciation_score", result.get("accuracy_score", 50)),
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
    adapter = get_realtime_adapter(resolve_default_voice_provider(db), db=db)
    return await adapter.create_session(payload.model_dump())


async def _send_adapter_messages(websocket: WebSocket, messages: list[dict] | dict | None) -> None:
    if not messages:
        return
    payload = messages if isinstance(messages, list) else [messages]
    for message in payload:
        if message:
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


@router.websocket("/realtime")
async def realtime_voice_ws(websocket: WebSocket) -> None:
    """WebSocket endpoint for bidirectional realtime voice + DashScope ASR."""
    await websocket.accept()
    token = websocket.query_params.get("token", "")
    user_id: str | None = None

    if token:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")
        except Exception:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return

    with SessionLocal() as db:
        adapter = get_realtime_adapter(resolve_default_voice_provider(db), db=db)
        session_info = await adapter.create_session({"user_id": user_id})
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

        async def pump_asr_events() -> None:
            while not pump_stop.is_set():
                events = await adapter.drain_events(timeout=0.2)
                for event in events:
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

                responses = await adapter.handle_client_message(data)
                await _send_adapter_messages(websocket, responses)
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
                session = VoiceSession(
                    user_id=user_id,
                    provider=session_info.get("provider", resolve_default_voice_provider(db)),
                    duration_seconds=60,
                    analysis={"mode": "realtime-ws", "asr_engine": session_info.get("asr_engine", "mock")},
                )
                db.add(session)
                db.commit()
