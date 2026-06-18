"""Social Logic Lite API — lobby/deal/start/vote/summary flow."""

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
        hud = body.get("hud") or {}
        assert hud.get("main_expression"), "HUD main_expression should not be empty"
        assert hud.get("detected_intent") == "expression_learning"
        agents = hud.get("agents") or []
        if agents:
            assert "agent" in agents[0]
        answer = body.get("answer") or {}
        assert answer.get("text"), "target answer text should not be empty"

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
