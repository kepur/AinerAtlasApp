"""Tests for real multiplayer werewolf rooms."""

from fastapi.testclient import TestClient

from app.main import app


def _register(client: TestClient, tag: str) -> str:
    email = f"ww_{tag}@test.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "Test123!", "username": tag},
    )
    login = client.post("/api/auth/login", json={"email": email, "password": "Test123!"})
    assert login.status_code == 200
    return login.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_werewolf_room_create_join_start() -> None:
    with TestClient(app) as client:
        host_token = _register(client, "ww_host")
        p2 = _register(client, "ww_p2")
        p3 = _register(client, "ww_p3")
        p4 = _register(client, "ww_p4")

        created = client.post(
            "/api/games/werewolf-rooms",
            json={"title": "测试狼人房"},
            headers=_auth(host_token),
        )
        assert created.status_code == 200, created.text
        body = created.json()
        assert body["phase"] == "waiting"
        assert body["min_players"] == 4
        room_id = body["room_id"]
        code = body["invite_code"]

        for tok in (p2, p3, p4):
            joined = client.post(
                "/api/games/werewolf-rooms/join",
                json={"invite_code": code},
                headers=_auth(tok),
            )
            assert joined.status_code == 200, joined.text
            assert joined.json()["player_count"] >= 2

        room = client.get(f"/api/games/werewolf-rooms/{room_id}", headers=_auth(host_token))
        assert room.status_code == 200
        assert room.json()["player_count"] == 4

        started = client.post(f"/api/games/werewolf-rooms/{room_id}/start", headers=_auth(host_token))
        assert started.status_code == 200, started.text
        assert started.json()["phase"] == "role_reveal"

        for tok in (host_token, p2, p3, p4):
            confirmed = client.post(
                f"/api/games/werewolf-rooms/{room_id}/confirm-role",
                headers=_auth(tok),
            )
            assert confirmed.status_code == 200, confirmed.text

        final = client.get(f"/api/games/werewolf-rooms/{room_id}", headers=_auth(host_token))
        assert final.status_code == 200
        assert final.json()["phase"] in {"night", "day_discussion", "vote", "ended"}
