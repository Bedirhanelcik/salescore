from datetime import UTC, datetime, timedelta

from tests.conftest import auth_headers


def _create_task(client, headers, **overrides):
    payload = {"title": "Test Task"}
    payload.update(overrides)
    response = client.post("/api/v1/tasks", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_task_defaults_assignee_to_self(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    task = _create_task(client, headers)
    assert task["status"] == "todo"
    assert task["assignee"]["email"] == "admin@test.io"


def test_list_tasks_with_due_date_does_not_crash(client, admin_user):
    # Regression test: listing tasks calls an overdue-refresh pass that compares
    # `due_date` against `now()` - this must not raise even though SQLite doesn't
    # round-trip timezone info on DateTime columns.
    headers = auth_headers(client, "admin@test.io")
    future_due = (datetime.now(UTC) + timedelta(days=5)).isoformat()
    past_due = (datetime.now(UTC) - timedelta(days=5)).isoformat()
    _create_task(client, headers, title="Future task", due_date=future_due)
    _create_task(client, headers, title="Past due task", due_date=past_due)

    response = client.get("/api/v1/tasks", headers=headers)
    assert response.status_code == 200
    items = response.json()["items"]
    past = next(t for t in items if t["title"] == "Past due task")
    assert past["status"] == "overdue"
    future = next(t for t in items if t["title"] == "Future task")
    assert future["status"] == "todo"


def test_update_task_status(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    task = _create_task(client, headers)

    response = client.patch(f"/api/v1/tasks/{task['id']}", headers=headers, json={"status": "completed"})
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["completed_at"] is not None


def test_task_not_found(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/tasks/99999", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "TASK_NOT_FOUND"


def test_delete_task(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    task = _create_task(client, headers)

    response = client.delete(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert response.status_code == 204
    assert client.get(f"/api/v1/tasks/{task['id']}", headers=headers).status_code == 404


def test_task_pagination(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    for i in range(13):
        _create_task(client, headers, title=f"Task {i}")

    page1 = client.get("/api/v1/tasks?page=1&page_size=10", headers=headers).json()
    assert page1["total"] == 13
    assert len(page1["items"]) == 10


def test_task_status_filter(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    _create_task(client, headers, title="Todo Task")
    done = _create_task(client, headers, title="Done Task")
    client.patch(f"/api/v1/tasks/{done['id']}", headers=headers, json={"status": "completed"})

    response = client.get("/api/v1/tasks?status=completed", headers=headers)
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Done Task"

    response = client.get("/api/v1/tasks?status=todo", headers=headers)
    body = response.json()
    assert any(t["title"] == "Todo Task" for t in body["items"])


def test_sales_rep_only_sees_own_tasks(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")

    _create_task(client, rep1_headers, title="Rep1 Task")
    _create_task(client, rep2_headers, title="Rep2 Task")

    rep1_list = client.get("/api/v1/tasks", headers=rep1_headers).json()
    titles = [t["title"] for t in rep1_list["items"]]
    assert "Rep1 Task" in titles
    assert "Rep2 Task" not in titles


def test_analyst_cannot_create_task(client, analyst_user):
    headers = auth_headers(client, "analyst@test.io")
    response = client.post("/api/v1/tasks", headers=headers, json={"title": "Blocked"})
    assert response.status_code == 403


def test_list_tasks_filters_by_related_company(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    company = client.post("/api/v1/companies", headers=headers, json={"name": "Task Co"}).json()
    other_company = client.post("/api/v1/companies", headers=headers, json={"name": "Other Co"}).json()
    _create_task(client, headers, title="Company Task", related_company_id=company["id"])
    _create_task(client, headers, title="Other Task", related_company_id=other_company["id"])
    _create_task(client, headers, title="Unrelated Task")

    response = client.get(f"/api/v1/tasks?related_company_id={company['id']}", headers=headers)
    assert response.status_code == 200
    titles = [t["title"] for t in response.json()["items"]]
    assert titles == ["Company Task"]
