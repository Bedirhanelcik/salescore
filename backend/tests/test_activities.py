from datetime import UTC, datetime

from tests.conftest import auth_headers


def _create_activity(client, headers, **overrides):
    payload = {"type": "call", "title": "Discovery call", "activity_date": datetime.now(UTC).isoformat()}
    payload.update(overrides)
    response = client.post("/api/v1/activities", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_activity(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    activity = _create_activity(client, headers)
    assert activity["type"] == "call"
    assert activity["status"] == "planned"


def test_activity_updates_deal_last_activity_at(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = client.post("/api/v1/deals", headers=headers, json={"title": "Deal With Activity", "value": 1000}).json()
    assert deal["last_activity_at"] is None

    _create_activity(client, headers, deal_id=deal["id"])

    updated = client.get(f"/api/v1/deals/{deal['id']}", headers=headers).json()
    assert updated["last_activity_at"] is not None


def test_activity_pagination_and_type_filter(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    for _ in range(5):
        _create_activity(client, headers, type="call")
    _create_activity(client, headers, type="email")

    response = client.get("/api/v1/activities?type=email", headers=headers)
    body = response.json()
    assert body["total"] == 1

    response = client.get("/api/v1/activities?page=1&page_size=3", headers=headers)
    body = response.json()
    assert body["total"] == 6
    assert len(body["items"]) == 3


def test_delete_activity(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    activity = _create_activity(client, headers)

    response = client.delete(f"/api/v1/activities/{activity['id']}", headers=headers)
    assert response.status_code == 204
    assert client.get(f"/api/v1/activities/{activity['id']}", headers=headers).status_code == 404


def test_viewer_cannot_create_activity(client, viewer_user):
    headers = auth_headers(client, "viewer@test.io")
    response = client.post(
        "/api/v1/activities",
        headers=headers,
        json={"type": "call", "title": "Blocked", "activity_date": datetime.now(UTC).isoformat()},
    )
    assert response.status_code == 403
