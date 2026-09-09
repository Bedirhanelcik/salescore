from tests.conftest import auth_headers

# --- Departments ---------------------------------------------------------


def test_create_department(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.post("/api/v1/departments", headers=headers, json={"name": "Legal", "description": "Contracts"})
    assert response.status_code == 201
    assert response.json()["employee_count"] == 0


def test_duplicate_department_name_rejected(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    client.post("/api/v1/departments", headers=headers, json={"name": "Legal"})
    response = client.post("/api/v1/departments", headers=headers, json={"name": "Legal"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DEPARTMENT_EXISTS"


def test_manager_cannot_create_department(client, manager_user):
    headers = auth_headers(client, "manager@test.io")
    response = client.post("/api/v1/departments", headers=headers, json={"name": "Legal"})
    assert response.status_code == 403


def test_list_departments_is_readable_by_any_authenticated_user(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.get("/api/v1/departments", headers=headers)
    assert response.status_code == 200


# --- Sales targets ---------------------------------------------------------


def test_manager_can_create_sales_target(client, manager_user):
    headers = auth_headers(client, "manager@test.io")
    response = client.post(
        "/api/v1/sales-targets",
        headers=headers,
        json={
            "name": "Q1 Team Target",
            "period": "monthly",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "target_amount": 50000,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["target_amount"] == 50000.0
    assert body["achievement_pct"] == 0


def test_sales_target_achievement_reflects_won_deals(client, admin_user, sales_rep_user):
    admin_headers = auth_headers(client, "admin@test.io")
    rep_headers = auth_headers(client, "rep@test.io")

    rep_id = client.get("/api/v1/auth/me", headers=rep_headers).json()["id"]

    target = client.post(
        "/api/v1/sales-targets",
        headers=admin_headers,
        json={
            "name": "Rep Target",
            "period": "monthly",
            "period_start": "2020-01-01",
            "period_end": "2030-12-31",
            "target_amount": 10000,
            "employee_id": rep_id,
        },
    ).json()

    deal = client.post("/api/v1/deals", headers=rep_headers, json={"title": "Target Deal", "value": 10000}).json()
    for stage in ["qualified", "opportunity", "proposal", "negotiation", "won"]:
        client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=rep_headers, json={"stage": stage})

    targets = client.get(f"/api/v1/sales-targets?employee_id={rep_id}", headers=admin_headers).json()
    row = next(t for t in targets if t["id"] == target["id"])
    assert row["actual_amount"] == 10000.0
    assert row["achievement_pct"] == 100.0


def test_sales_rep_cannot_create_sales_target(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.post(
        "/api/v1/sales-targets",
        headers=headers,
        json={
            "name": "Blocked",
            "period": "monthly",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "target_amount": 1000,
        },
    )
    assert response.status_code == 403


def test_delete_sales_target(client, manager_user):
    headers = auth_headers(client, "manager@test.io")
    target = client.post(
        "/api/v1/sales-targets",
        headers=headers,
        json={
            "name": "Deletable",
            "period": "monthly",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "target_amount": 1000,
        },
    ).json()

    response = client.delete(f"/api/v1/sales-targets/{target['id']}", headers=headers)
    assert response.status_code == 204


# --- Audit log ---------------------------------------------------------


def test_critical_actions_are_audit_logged(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    company = client.post("/api/v1/companies", headers=headers, json={"name": "Audited Co"}).json()

    logs = client.get("/api/v1/audit-logs?entity_type=company", headers=headers).json()
    entry = next(item for item in logs["items"] if item["entity_id"] == company["id"])
    assert entry["action"] == "create"
    assert entry["entity_label"] == "Audited Co"
    assert entry["user"]["email"] == "admin@test.io"


def test_deal_stage_change_is_audit_logged_with_metadata(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = client.post("/api/v1/deals", headers=headers, json={"title": "Audited Deal", "value": 1000}).json()
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "qualified"})

    logs = client.get("/api/v1/audit-logs?entity_type=deal", headers=headers).json()
    entry = next(item for item in logs["items"] if item["entity_id"] == deal["id"] and item["action"] == "stage_change")
    assert entry["log_metadata"] == {"from": "lead", "to": "qualified"}


def test_sales_rep_cannot_view_audit_log(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.get("/api/v1/audit-logs", headers=headers)
    assert response.status_code == 403


def test_analyst_can_view_audit_log(client, analyst_user):
    headers = auth_headers(client, "analyst@test.io")
    response = client.get("/api/v1/audit-logs", headers=headers)
    assert response.status_code == 200
