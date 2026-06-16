import pytest
import os
from dotenv import load_dotenv
load_dotenv()

os.environ["DEFAULT_LLM_PROVIDER"] = "mock"

from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user, get_db
from app.db.session import SessionLocal, engine
from app.models import User, Base

import unittest.mock as mock
from app.services.llm import MockLLMProvider

def override_get_llm_provider(*args, **kwargs):
    return MockLLMProvider()

mock.patch("app.services.llm.get_llm_provider", side_effect=override_get_llm_provider).start()
mock.patch("app.services.roleplay_engine._provider_for", side_effect=override_get_llm_provider).start()
mock.patch("app.services.romance_engine._provider_for", side_effect=override_get_llm_provider).start()
mock.patch("app.services.detective_engine._provider_for", side_effect=override_get_llm_provider).start()
mock.patch("app.services.turtle_soup_engine._provider_for", side_effect=override_get_llm_provider).start()

# Create a mock user
class MockUser:
    id = "test_user_id"
    email = "test@example.com"
    is_active = True

def override_get_current_user():
    return MockUser()

def override_get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def setup_db():
    Base.metadata.create_all(bind=engine)

def test_roleplay_loop():
    # 1. Start Session
    resp = client.post("/api/games/sessions", json={"game_type": "roleplay"})
    assert resp.status_code == 200, resp.text
    session_id = resp.json()["id"]

    # 2. Send Turn
    resp = client.post(f"/api/games/sessions/{session_id}/turns", json={
        "action_type": "message",
        "user_input": "Hello! It's nice to meet you."
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "turn" in data
    assert "feed_items" in data["turn"]
    assert "ai_response" in data["turn"]

    print("Roleplay loop passed!")

def test_romance_loop():
    resp = client.post("/api/games/sessions", json={"game_type": "romance"})
    assert resp.status_code == 200, resp.text
    session_id = resp.json()["id"]

    resp = client.post(f"/api/games/sessions/{session_id}/turns", json={
        "action_type": "user_action",
        "user_input": "You look very nice today."
    })
    assert resp.status_code == 200, resp.text
    print("Romance loop passed!")

def test_detective_loop():
    resp = client.post("/api/games/sessions", json={"game_type": "detective"})
    assert resp.status_code == 200, resp.text
    session_id = resp.json()["id"]

    resp = client.post(f"/api/games/sessions/{session_id}/turns", json={
        "action_type": "message",
        "user_input": "What were you doing at 9 PM?",
        "extra": {"suspect_id": "anna"}
    })
    assert resp.status_code == 200, resp.text
    print("Detective loop passed!")

def test_turtlesoup_loop():
    resp = client.post("/api/games/sessions", json={"game_type": "turtle_soup"})
    assert resp.status_code == 200, resp.text
    session_id = resp.json()["id"]

    resp = client.post(f"/api/games/sessions/{session_id}/turns", json={
        "action_type": "message",
        "user_input": "Did the man know he was drinking seagull soup?"
    })
    assert resp.status_code == 200, resp.text
    print("Turtle soup loop passed!")

if __name__ == "__main__":
    setup_db()
    test_roleplay_loop()
    test_romance_loop()
    test_detective_loop()
    test_turtlesoup_loop()
    print("All backend engine tests passed successfully.")
