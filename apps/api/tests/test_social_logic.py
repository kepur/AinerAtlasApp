"""Social Logic Lite API — lobby/deal/start/vote/summary flow."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


def _token(client: TestClient) -> str:
    resp = client.post(
        "/api/auth/login",
        json={"email": "demo@ainerspeak.com", "password": "Demo123!"},
    )
    if resp.status_code != 200:
        resp = client.post(
            "/api/auth/login",
            json={"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
        )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _start_discussion(client: TestClient, headers: dict) -> tuple[str, dict]:
    create = client.post(
        "/api/games/social-logic",
        headers=headers,
        json={"difficulty": "easy", "target_language": "en", "native_language": "zh"},
    )
    assert create.status_code == 200, create.text
    gid = create.json()["game_id"]
    client.post(f"/api/games/social-logic/{gid}/deal", headers=headers)
    start = client.post(f"/api/games/social-logic/{gid}/start", headers=headers)
    assert start.status_code == 200, start.text
    return gid, start.json()


def test_question_answers_first_then_analyses() -> None:
    """The accused answers immediately; the learning HUD lands in the background.

    Two focused calls now: the in-character answer on the request path, and the
    challenge analysis afterwards (see social_logic_engine.run_question_hud).
    """
    answer_payload = {
        "text": "I was near the gate, checking the perimeter.",
        "text_native": "我在大门附近巡逻。",
        "emotion": "calm",
    }
    hud_payload = {
        "main_expression": "Where were you last night?",
        "meaning_native": "你昨晚在哪里？",
        "variants": {
            "natural": "Where were you last night?",
            "assertive": "Tell me exactly where you were.",
            "polite": "Could you share where you were?",
            "deductive": "If you were innocent, where were you?",
        },
        "why_this_expression": [{"point": "定位", "explanation": "先锁定时间地点"}],
        "patterns_v2": [{"pattern": "Where were you...", "example": "Where were you?", "add_to_crush": True}],
        "vocabulary": ["last night"],
        "agents": [{"agent": "Logic Agent", "result": "先问位置再比对发言"}],
    }

    mock_provider = AsyncMock()
    mock_provider.complete_json = AsyncMock(side_effect=[answer_payload, hud_payload])

    with patch("app.services.social_logic_engine._provider_for", return_value=mock_provider), \
         patch("app.services.llm.require_llm_provider", return_value=mock_provider):
        with TestClient(app) as client:
            headers = {"Authorization": f"Bearer {_token(client)}"}
            gid, state = _start_discussion(client, headers)
            if state["phase"] != "day_discussion":
                return
            target = next(p for p in state["players"] if not p["is_user"] and p["alive"])
            q = client.post(
                f"/api/games/social-logic/{gid}/question",
                headers=headers,
                json={"target_player_id": target["id"], "content": "你昨晚在哪里？"},
            )
            assert q.status_code == 200, q.text
            body = q.json()

            # The dialogue is on the response; the analysis is not blocking it.
            assert body["answer"]["text"] == "I was near the gate, checking the perimeter."
            assert body["hud"]["analysis_status"] == "pending"

            # TestClient runs BackgroundTasks before returning, so by now the
            # worker has written the finished HUD back onto the game.
            caught = client.get(
                f"/api/games/social-logic/{gid}/learning-turns/0", headers=headers
            )
            assert caught.status_code == 200, caught.text
            hud = caught.json()["hud"]
            assert hud["main_expression"] == "Where were you last night?"
            assert hud["detected_intent"] == "expression_learning"
            assert hud["analysis_status"] == "ready"


def test_social_logic_persists_across_get() -> None:
    """Game state must survive GET reload (DB-backed, not in-memory)."""
    with TestClient(app) as client:
        headers = {"Authorization": f"Bearer {_token(client)}"}
        create = client.post(
            "/api/games/social-logic",
            headers=headers,
            json={"difficulty": "easy"},
        )
        assert create.status_code == 200
        gid = create.json()["game_id"]
        client.post(f"/api/games/social-logic/{gid}/deal", headers=headers)
        reload = client.get(f"/api/games/social-logic/{gid}", headers=headers)
        assert reload.status_code == 200, reload.text
        body = reload.json()
        assert body["game_id"] == gid
        assert body["phase"] == "role_reveal"
        assert body.get("user_role") == "villager"


def test_social_logic_full_flow_structure() -> None:
    with TestClient(app) as client:
        headers = {"Authorization": f"Bearer {_token(client)}"}

        create = client.post(
            "/api/games/social-logic",
            headers=headers,
            json={"difficulty": "easy", "target_language": "en", "native_language": "zh"},
        )
        assert create.status_code == 200, create.text
        game = create.json()
        assert game["phase"] == "lobby"
        gid = game["game_id"]

        deal = client.post(f"/api/games/social-logic/{gid}/deal", headers=headers)
        assert deal.status_code == 200, deal.text
        assert deal.json()["phase"] == "role_reveal"
        assert deal.json().get("user_role") == "villager"

        start = client.post(f"/api/games/social-logic/{gid}/start", headers=headers)
        assert start.status_code == 200, start.text
        state = start.json()
        assert state["phase"] in ("day_discussion", "ended")
        assert len(state.get("feed") or []) >= 1

        if state["phase"] != "day_discussion":
            return

        target = next(p for p in state["players"] if not p["is_user"] and p["alive"])
        q = client.post(
            f"/api/games/social-logic/{gid}/question",
            headers=headers,
            json={"target_player_id": target["id"], "content": "你昨晚在哪里？"},
        )
        assert q.status_code == 200, q.text
        body = q.json()
        # Conversation first: the answer ships now, the HUD is still analysing.
        hud = body.get("hud") or {}
        assert hud.get("analysis_status") == "pending"
        answer = body.get("answer") or {}
        assert answer.get("text"), "target answer text should not be empty"

        # The background analysis has run by the time the request returns.
        caught = client.get(
            f"/api/games/social-logic/{gid}/learning-turns/0", headers=headers
        )
        assert caught.status_code == 200, caught.text
        hud = caught.json()["hud"]
        assert hud.get("analysis_status") != "pending"
        assert hud.get("detected_intent") == "expression_learning"
        agents = hud.get("agents") or []
        if agents:
            assert "agent" in agents[0]

        help_resp = client.post(
            f"/api/games/social-logic/{gid}/help-express",
            headers=headers,
            json={"content": "你昨晚在哪里？", "target_player_id": target["id"]},
        )
        assert help_resp.status_code == 200, help_resp.text
        help_hud = help_resp.json().get("hud") or {}
        # With a provider available this is a full analysis; without one it must
        # say so rather than returning blank cards.
        if help_hud.get("analysis_status") == "ready":
            assert help_hud.get("main_expression")
            assert help_hud.get("variants") is not None
        else:
            assert help_hud.get("analysis_status") == "failed"

        vote_target = next(
            p for p in body["state"]["players"] if not p["is_user"] and p["alive"]
        )
        vote = client.post(
            f"/api/games/social-logic/{gid}/vote",
            headers=headers,
            json={"target_player_id": vote_target["id"], "reason": "Most suspicious"},
        )
        assert vote.status_code == 200, vote.text
        vote_state = vote.json()
        vote_results = [f for f in vote_state.get("feed", []) if f.get("type") == "vote_result"]
        assert vote_results, "feed should contain vote_result after voting"

        if vote_state.get("phase") == "ended":
            summary = client.get(f"/api/games/social-logic/{gid}/summary", headers=headers)
            assert summary.status_code == 200
            assert "patterns" in summary.json()
        else:
            assert vote_state.get("questions_this_round") == 0
            assert vote_state.get("round", 1) >= 2


def test_question_limit_per_round() -> None:
    with TestClient(app) as client:
        headers = {"Authorization": f"Bearer {_token(client)}"}
        gid, state = _start_discussion(client, headers)
        if state["phase"] != "day_discussion":
            return
        target = next(p for p in state["players"] if not p["is_user"] and p["alive"])
        payload = {"target_player_id": target["id"], "content": "你昨晚在哪里？"}
        first = client.post(f"/api/games/social-logic/{gid}/question", headers=headers, json=payload)
        assert first.status_code == 200, first.text
        assert first.json()["state"]["questions_this_round"] == 1
        second = client.post(f"/api/games/social-logic/{gid}/question", headers=headers, json=payload)
        assert second.status_code == 400, second.text
