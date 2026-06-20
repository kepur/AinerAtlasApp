"""Tests for real multiplayer werewolf rooms."""

from fastapi.testclient import TestClient

from app.main import app
from app.services import presence_service


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


def _me(client: TestClient, token: str) -> dict:
    return client.get("/api/auth/me", headers=_auth(token)).json()


def _make_friends(client: TestClient, token_a: str, token_b: str) -> tuple[str, str]:
    me_a = _me(client, token_a)
    me_b = _me(client, token_b)
    req = client.post(
        "/api/connect/requests",
        json={"to_user_id": me_b["id"], "message": "hi"},
        headers=_auth(token_a),
    )
    assert req.status_code == 201
    accepted = client.post(f"/api/connect/requests/{req.json()['id']}/accept", headers=_auth(token_b))
    assert accepted.status_code == 200
    dm = client.post("/api/connect/dm", json={"friend_user_id": me_a["id"]}, headers=_auth(token_b))
    assert dm.status_code == 200
    room_id = dm.json()["id"]
    msg = client.post(
        f"/api/circles/{room_id}/messages",
        json={"content": "Hello!", "content_language": "en"},
        headers=_auth(token_b),
    )
    assert msg.status_code == 200
    return me_a["id"], me_b["id"]


def test_werewolf_room_create_join_start() -> None:
    presence_service.clear_memory()
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


def test_werewolf_friend_invite_accept_flow() -> None:
    presence_service.clear_memory()
    with TestClient(app) as client:
        host_token = _register(client, "ww_inv_host")
        friend_token = _register(client, "ww_inv_friend")
        _make_friends(client, host_token, friend_token)
        me_friend = _me(client, friend_token)

        client.post("/api/connect/presence/heartbeat", headers=_auth(friend_token))
        presence_service.touch(me_friend["id"])

        created = client.post(
            "/api/games/werewolf-rooms",
            json={"title": "邀请测试房"},
            headers=_auth(host_token),
        )
        assert created.status_code == 200
        room_id = created.json()["room_id"]

        candidates = client.get(
            f"/api/games/werewolf-rooms/{room_id}/invite-candidates",
            headers=_auth(host_token),
        )
        assert candidates.status_code == 200
        items = candidates.json()["items"]
        assert any(i["user_id"] == me_friend["id"] and i["is_online"] for i in items)

        invited = client.post(
            f"/api/games/werewolf-rooms/{room_id}/invite-friend",
            json={"friend_user_id": me_friend["id"]},
            headers=_auth(host_token),
        )
        assert invited.status_code == 200, invited.text

        pending = client.get("/api/games/werewolf-rooms/invites/pending", headers=_auth(friend_token))
        assert pending.status_code == 200
        assert any(p["room_id"] == room_id for p in pending.json()["items"])

        duplicate = client.post(
            f"/api/games/werewolf-rooms/{room_id}/invite-friend",
            json={"friend_user_id": me_friend["id"]},
            headers=_auth(host_token),
        )
        assert duplicate.status_code == 400

        joined = client.post(
            "/api/games/werewolf-rooms/invites/accept",
            json={"room_id": room_id},
            headers=_auth(friend_token),
        )
        assert joined.status_code == 200, joined.text
        assert joined.json()["player_count"] == 2

        room = client.get(f"/api/games/werewolf-rooms/{room_id}", headers=_auth(host_token))
        assert room.status_code == 200
        assert room.json()["player_count"] == 2


def test_werewolf_cannot_invite_offline_friend() -> None:
    presence_service.clear_memory()
    with TestClient(app) as client:
        host_token = _register(client, "ww_off_host")
        friend_token = _register(client, "ww_off_friend")
        _make_friends(client, host_token, friend_token)
        me_friend = _me(client, friend_token)

        created = client.post(
            "/api/games/werewolf-rooms",
            json={"title": "离线测试"},
            headers=_auth(host_token),
        )
        room_id = created.json()["room_id"]

        resp = client.post(
            f"/api/games/werewolf-rooms/{room_id}/invite-friend",
            json={"friend_user_id": me_friend["id"]},
            headers=_auth(host_token),
        )
        assert resp.status_code == 400
        assert "离线" in resp.json()["detail"]
