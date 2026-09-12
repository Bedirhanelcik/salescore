import pytest

from app.core.cache import get_cache
from app.core.config import settings
from tests.conftest import auth_headers


@pytest.fixture(autouse=True)
def _reset_support_rate_limit():
    # get_cache() is a process-wide @lru_cache singleton (see app.core.cache), so its
    # in-memory store outlives any single test's fresh database. Without this, a user id
    # reused across tests (each test gets its own DB, so ids restart from 1) would carry
    # over a stale ticket count and make later tests flake against the rate limit.
    get_cache().delete_prefix("support_rate:")
    yield


def _ticket_payload(**overrides):
    payload = {
        "name": "Fresh Scope Test",
        "email": "freshscope@example.com",
        "subject": "How do I read the Win Rate KPI?",
        "category": "analytics",
        "message": "I created a few deals but I'm not sure how Win Rate is calculated. Can you explain?",
    }
    payload.update(overrides)
    return payload


def test_create_ticket_requires_auth(client):
    response = client.post("/api/v1/support/tickets", json=_ticket_payload())
    assert response.status_code == 401


def test_create_ticket_and_read_it_back(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.post("/api/v1/support/tickets", headers=headers, json=_ticket_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["subject"] == "How do I read the Win Rate KPI?"
    assert body["status"] == "open"
    assert body["user"]["email"] == "rep@test.io"
    # No SMTP configured in tests -> must fail soft, not raise.
    assert body["email_sent"] is False

    my_tickets = client.get("/api/v1/support/tickets", headers=headers).json()
    assert my_tickets["total"] == 1
    assert my_tickets["items"][0]["id"] == body["id"]


def test_rejects_empty_and_short_message(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.post("/api/v1/support/tickets", headers=headers, json=_ticket_payload(message="short"))
    assert response.status_code == 422


def test_rejects_invalid_email(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.post("/api/v1/support/tickets", headers=headers, json=_ticket_payload(email="not-an-email"))
    assert response.status_code == 422


def test_header_injection_attempt_is_neutralized(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    payload = _ticket_payload(subject="Hello\r\nBcc: attacker@evil.test")
    response = client.post("/api/v1/support/tickets", headers=headers, json=payload)
    assert response.status_code == 201
    assert "\r" not in response.json()["subject"]
    assert "\n" not in response.json()["subject"]


def test_user_cannot_see_another_users_ticket(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")
    ticket_id = client.post("/api/v1/support/tickets", headers=rep1_headers, json=_ticket_payload()).json()["id"]

    response = client.get(f"/api/v1/support/tickets/{ticket_id}", headers=rep2_headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"

    rep2_list = client.get("/api/v1/support/tickets", headers=rep2_headers).json()
    assert rep2_list["total"] == 0


def test_non_admin_cannot_list_all_tickets(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.get("/api/v1/support/admin/tickets", headers=headers)
    assert response.status_code == 403


def test_admin_can_list_and_update_any_ticket(client, admin_user, sales_rep_user):
    rep_headers = auth_headers(client, "rep@test.io")
    admin_headers = auth_headers(client, "admin@test.io")
    ticket_id = client.post("/api/v1/support/tickets", headers=rep_headers, json=_ticket_payload()).json()["id"]

    all_tickets = client.get("/api/v1/support/admin/tickets", headers=admin_headers).json()
    assert all_tickets["total"] == 1

    response = client.patch(
        f"/api/v1/support/admin/tickets/{ticket_id}/status", headers=admin_headers, json={"status": "resolved"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "resolved"

    admin_can_view_directly = client.get(f"/api/v1/support/tickets/{ticket_id}", headers=admin_headers)
    assert admin_can_view_directly.status_code == 200


def test_rate_limit_blocks_excessive_tickets(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    original_limit = settings.SUPPORT_TICKETS_PER_HOUR
    settings.SUPPORT_TICKETS_PER_HOUR = 2
    try:
        for _ in range(2):
            response = client.post("/api/v1/support/tickets", headers=headers, json=_ticket_payload())
            assert response.status_code == 201

        blocked = client.post("/api/v1/support/tickets", headers=headers, json=_ticket_payload())
        assert blocked.status_code == 429
        assert blocked.json()["error"]["code"] == "RATE_LIMITED"
    finally:
        settings.SUPPORT_TICKETS_PER_HOUR = original_limit
