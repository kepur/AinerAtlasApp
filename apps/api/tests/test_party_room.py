"""Party room API tests."""

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


def test_party_room_create_message_and_turn() -> None:
    with TestClient(app) as client:
        headers = {"Authorization": f"Bearer {_token(client)}"}
        create = client.post(
            "/api/games/party-rooms",
            headers=headers,
            json={"title": "测试侦探局"},
        )
        assert create.status_code == 200, create.text
        room = create.json()
        rid = room["room_id"]
        assert room["invite_code"]
        assert room["is_host"] is True
        assert len(room["players"]) == 1

        msg = client.post(
            f"/api/games/party-rooms/{rid}/message",
            headers=headers,
            json={"text": "我想问 Anna 昨晚在哪里？"},
        )
        assert msg.status_code == 200, msg.text
        assert any(f.get("type") == "message" for f in msg.json().get("feed", []))

        end = client.post(f"/api/games/party-rooms/{rid}/end-turn", headers=headers)
        assert end.status_code == 200, end.text

        reload = client.get(f"/api/games/party-rooms/{rid}", headers=headers)
        assert reload.status_code == 200
        assert reload.json()["room_id"] == rid
