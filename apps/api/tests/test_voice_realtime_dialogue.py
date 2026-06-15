import asyncio

from app.services.voice_realtime import MockRealtimeAdapter
from app.services.voice_realtime_dialogue import generate_voice_dialogue_response


def test_generate_voice_dialogue_response_mock() -> None:
    async def run() -> None:
        response = await generate_voice_dialogue_response(None, None, "我想去欧洲生活")
        assert response["type"] == "response"
        assert response["text"]
        assert isinstance(response["grammar_tips"], list)
        assert len(response["grammar_tips"]) >= 1

    asyncio.run(run())


def test_mock_realtime_end_to_end_with_llm() -> None:
    async def run() -> None:
        adapter = MockRealtimeAdapter(db=None)
        await adapter.create_session({"user_id": None, "topic": "voice chat"})
        await adapter.handle_client_message({"type": "audio", "action": "start"})
        events = await adapter.handle_client_message({"type": "audio", "action": "end"})
        types = [event["type"] for event in events]
        assert "transcript" in types
        assert "thinking" in types
        assert "response" in types
        response = next(item for item in events if item["type"] == "response")
        assert response["grammar_tips"]

    asyncio.run(run())
