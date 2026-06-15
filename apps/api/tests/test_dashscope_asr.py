from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.services.voice_realtime import MockRealtimeAdapter, get_realtime_adapter


def test_realtime_session() -> None:
    with TestClient(app) as client:
        resp = client.post(
            "/api/voice/realtime/session",
            json={"mode": "realtime", "target_language": "en"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "provider" in body
        assert "asr_engine" in body


def test_get_realtime_adapter_defaults_to_mock_without_key(monkeypatch) -> None:
    monkeypatch.setenv("DASHSCOPE_API_KEY", "")
    monkeypatch.setenv("REALTIME_ASR_PROVIDER", "mock")
    get_settings.cache_clear()
    adapter = get_realtime_adapter("mock")
    assert isinstance(adapter, MockRealtimeAdapter)


def test_mock_realtime_audio_flow() -> None:
    import asyncio

    async def run() -> None:
        adapter = MockRealtimeAdapter()
        await adapter.create_session({"user_id": "u1"})
        started = await adapter.handle_client_message({"type": "audio", "action": "start"})
        assert started[0]["type"] == "asr_started"
        partial = await adapter.handle_client_message(
            {"type": "audio", "format": "pcm16", "data": "AA=="}
        )
        assert partial[0]["type"] == "transcript"
        final = await adapter.handle_client_message({"type": "audio", "action": "end"})
        assert any(item.get("is_final") for item in final if item.get("type") == "transcript")
        assert any(item.get("type") == "response" for item in final)

    asyncio.run(run())
