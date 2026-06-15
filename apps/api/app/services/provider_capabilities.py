"""Summarize required AI provider slots and whether they are production-ready."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decrypt_api_key
from app.models import AIProvider, AppSettings
from app.services.dashscope_client import dashscope_enabled, resolve_dashscope_api_key
from app.services.runtime_config import get_runtime_config, resolve_realtime_asr_provider


@dataclass(frozen=True)
class ProviderCapability:
    key: str
    label: str
    features: tuple[str, ...]
    status: str
    active_provider: str
    message: str
    required: bool = True


def _provider_row(db: Session, provider_name: str, provider_type: str | None = None) -> AIProvider | None:
    query = select(AIProvider).where(AIProvider.provider_name == provider_name)
    if provider_type:
        query = query.where(AIProvider.provider_type == provider_type)
    return db.scalar(query.limit(1))


def _has_valid_key(row: AIProvider | None) -> bool:
    if row is None:
        return False
    if row.provider_name in {"mock", "mock-voice"}:
        return True
    if not row.api_key_encrypted:
        return False
    return bool(decrypt_api_key(row.api_key_encrypted))


def _llm_capability(db: Session) -> ProviderCapability:
    runtime = get_runtime_config(db)
    active = runtime.default_llm_provider
    row = _provider_row(db, active, "llm")

    if active == "mock" or (row and row.provider_name == "mock"):
        return ProviderCapability(
            key="llm",
            label="LLM 大模型",
            features=("文字对话", "语法纠错", "Thought 链路"),
            status="mock",
            active_provider=active or "mock",
            message="当前为 Mock 模式，回复固定模板，仅适合联调。",
        )
    if row and _has_valid_key(row):
        return ProviderCapability(
            key="llm",
            label="LLM 大模型",
            features=("文字对话", "语法纠错", "Thought 链路"),
            status="ready",
            active_provider=active,
            message=f"已接入 {active}，可正常对话。",
        )
    if row:
        return ProviderCapability(
            key="llm",
            label="LLM 大模型",
            features=("文字对话", "语法纠错", "Thought 链路"),
            status="key_invalid",
            active_provider=active,
            message=f"{active} 已配置但 API Key 无效或无法解密，请重新编辑保存 Key。",
        )
    return ProviderCapability(
        key="llm",
        label="LLM 大模型",
        features=("文字对话", "语法纠错", "Thought 链路"),
        status="missing",
        active_provider=active or "",
        message="请至少接入 1 个 LLM Provider（如 deepseek / qwen）。",
    )


def _embedding_capability(db: Session) -> ProviderCapability:
    runtime = get_runtime_config(db)
    active = runtime.default_embedding_provider
    row = _provider_row(db, active, "embedding")

    if row and not _has_valid_key(row):
        return ProviderCapability(
            key="embedding",
            label="Embedding 向量",
            features=("长期记忆", "表达检索", "相似度召回"),
            status="key_invalid",
            active_provider=active,
            message=f"{active} 已配置但 API Key 无效或无法解密，请重新编辑保存 Key。",
        )
    if resolve_dashscope_api_key(db) and active:
        return ProviderCapability(
            key="embedding",
            label="Embedding 向量",
            features=("长期记忆", "表达检索", "相似度召回"),
            status="ready",
            active_provider=active,
            message=f"已接入 {active}，记忆与检索可用。",
        )
    return ProviderCapability(
        key="embedding",
        label="Embedding 向量",
        features=("长期记忆", "表达检索", "相似度召回"),
        status="missing" if not active else "mock",
        active_provider=active or "",
        message="请接入 1 个 Embedding Provider（如 dashscope-embedding）并配置有效 Key。",
    )


def _realtime_voice_capability(db: Session) -> ProviderCapability:
    runtime = get_runtime_config(db)
    asr_mode = resolve_realtime_asr_provider(db)
    voice_name = runtime.default_voice_provider
    voice_row = _provider_row(db, voice_name, "voice")

    if asr_mode == "mock":
        return ProviderCapability(
            key="realtime_voice",
            label="实时语音",
            features=("语音对话", "实时 ASR", "语音 WebSocket"),
            status="mock",
            active_provider=voice_name or "mock-voice",
            message="ASR 为 Mock 模式，语音识别为占位文本。",
        )
    if dashscope_enabled(db):
        return ProviderCapability(
            key="realtime_voice",
            label="实时语音",
            features=("语音对话", "实时 ASR", "语音 WebSocket"),
            status="ready",
            active_provider=voice_name or "dashscope",
            message=f"实时语音已就绪（ASR: {asr_mode}，Voice: {voice_name or 'dashscope'}）。",
        )
    if voice_row and not _has_valid_key(voice_row):
        return ProviderCapability(
            key="realtime_voice",
            label="实时语音",
            features=("语音对话", "实时 ASR", "语音 WebSocket"),
            status="key_invalid",
            active_provider=voice_name,
            message=f"{voice_name} 已配置但 DashScope Key 无效或无法解密，请重新编辑保存 Key。",
        )
    return ProviderCapability(
        key="realtime_voice",
        label="实时语音",
        features=("语音对话", "实时 ASR", "语音 WebSocket"),
        status="missing",
        active_provider=voice_name or "",
        message="请接入 dashscope Voice Provider 并配置有效 API Key（实时 ASR 选 auto 或 dashscope）。",
    )


def _tts_capability(db: Session) -> ProviderCapability:
    app = db.get(AppSettings, "default")
    tts_provider = getattr(app, "tts_provider", "browser") or "browser" if app else "browser"
    tts_voice = getattr(app, "tts_voice", "Xiaoxiao") or "Xiaoxiao" if app else "Xiaoxiao"

    if tts_provider == "browser":
        return ProviderCapability(
            key="tts",
            label="语音合成 (TTS)",
            features=("句子朗读", "逐词发音", "跟读评测"),
            status="ready",
            active_provider="browser",
            message=f"使用浏览器原生语音（Edge 微软神经语音 {tts_voice}），无需额外配置。",
        )
    if tts_provider == "cosyvoice":
        global_keys = getattr(app, "global_api_keys", {}) or {} if app else {}
        has_global = bool(global_keys.get("dashscope_api_key"))
        row = _provider_row(db, "cosyvoice", "voice")
        if (row and _has_valid_key(row)) or has_global:
            return ProviderCapability(
                key="tts",
                label="语音合成 (TTS)",
                features=("句子朗读", "逐词发音", "跟读评测"),
                status="ready",
                active_provider=f"cosyvoice / {tts_voice}",
                message=f"已接入阿里云 CosyVoice（{tts_voice}），高音质语音合成可用。",
            )
        if row:
            return ProviderCapability(
                key="tts",
                label="语音合成 (TTS)",
                features=("句子朗读", "逐词发音", "跟读评测"),
                status="key_invalid",
                active_provider="cosyvoice",
                message="CosyVoice 已配置但 API Key 无效，请检查 DashScope Key。",
            )
        if dashscope_enabled(db):
            return ProviderCapability(
                key="tts",
                label="语音合成 (TTS)",
                features=("句子朗读", "逐词发音", "跟读评测"),
                status="ready",
                active_provider=f"cosyvoice / {tts_voice}",
                message=f"已接入阿里云 CosyVoice（{tts_voice}，通过环境变量 DASHSCOPE_API_KEY）。",
            )
        return ProviderCapability(
            key="tts",
            label="语音合成 (TTS)",
            features=("句子朗读", "逐词发音", "跟读评测"),
            status="missing",
            active_provider="cosyvoice",
            message="请在 AI 供应商中新建 cosyvoice (voice 类型) 并填入 DashScope API Key。",
        )
    if tts_provider == "openai":
        row = _provider_row(db, "openai", "voice")
        if row and _has_valid_key(row):
            return ProviderCapability(
                key="tts",
                label="语音合成 (TTS)",
                features=("句子朗读", "逐词发音", "跟读评测"),
                status="ready",
                active_provider=f"openai / {tts_voice}",
                message=f"已接入 OpenAI TTS（{tts_voice}）。",
            )
        return ProviderCapability(
            key="tts",
            label="语音合成 (TTS)",
            features=("句子朗读", "逐词发音", "跟读评测"),
            status="key_invalid",
            active_provider="openai",
            message="OpenAI TTS 已配置但 API Key 无效，请检查。",
        )
    return ProviderCapability(
        key="tts",
        label="语音合成 (TTS)",
        features=("句子朗读", "逐词发音", "跟读评测"),
        status="missing",
        active_provider=tts_provider,
        message="请在 Settings > TTS Settings 中配置语音合成平台。",
    )


def get_provider_capabilities(db: Session) -> list[ProviderCapability]:
    return [
        _llm_capability(db),
        _embedding_capability(db),
        _tts_capability(db),
        _realtime_voice_capability(db),
    ]
