from tests.conftest import auth_headers


def test_sales_rep_cannot_access_another_reps_company(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")

    create = client.post("/api/v1/companies", headers=rep1_headers, json={"name": "Rep1 Only Co"})
    company_id = create.json()["id"]

    # IDOR check: rep2 guesses rep1's company id and must be forbidden, not shown the data.
    response = client.get(f"/api/v1/companies/{company_id}", headers=rep2_headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_sales_rep_cannot_modify_another_reps_company(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")

    create = client.post("/api/v1/companies", headers=rep1_headers, json={"name": "Rep1 Owned"})
    company_id = create.json()["id"]

    response = client.patch(f"/api/v1/companies/{company_id}", headers=rep2_headers, json={"industry": "Hacked"})
    assert response.status_code == 403


def test_sales_rep_list_only_sees_own_companies(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")

    client.post("/api/v1/companies", headers=rep1_headers, json={"name": "Rep1 Co A"})
    client.post("/api/v1/companies", headers=rep1_headers, json={"name": "Rep1 Co B"})
    client.post("/api/v1/companies", headers=rep2_headers, json={"name": "Rep2 Co A"})

    rep1_list = client.get("/api/v1/companies", headers=rep1_headers).json()
    assert rep1_list["total"] == 2

    rep2_list = client.get("/api/v1/companies", headers=rep2_headers).json()
    assert rep2_list["total"] == 1


def test_manager_sees_all_companies(client, sales_rep_user, sales_rep2_user, manager_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")
    manager_headers = auth_headers(client, "manager@test.io")

    client.post("/api/v1/companies", headers=rep1_headers, json={"name": "Rep1 Co"})
    client.post("/api/v1/companies", headers=rep2_headers, json={"name": "Rep2 Co"})

    manager_list = client.get("/api/v1/companies", headers=manager_headers).json()
    assert manager_list["total"] == 2


def test_viewer_is_read_only(client, viewer_user):
    headers = auth_headers(client, "viewer@test.io")
    response = client.post("/api/v1/companies", headers=headers, json={"name": "Viewer Attempt"})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_analyst_is_read_only(client, analyst_user):
    headers = auth_headers(client, "analyst@test.io")
    response = client.post("/api/v1/deals", headers=headers, json={"title": "Analyst Attempt"})
    assert response.status_code == 403


def test_only_admin_can_create_employee(client, admin_user, manager_user, sales_rep_user):
    manager_headers = auth_headers(client, "manager@test.io")
    response = client.post(
        "/api/v1/employees", headers=manager_headers,
        json={"email": "newhire@test.io", "password": "Password123!", "full_name": "New Hire", "role": "sales_rep"},
    )
    assert response.status_code == 403

    admin_headers = auth_headers(client, "admin@test.io")
    response = client.post(
        "/api/v1/employees", headers=admin_headers,
        json={"email": "newhire@test.io", "password": "Password123!", "full_name": "New Hire", "role": "sales_rep"},
    )
    assert response.status_code == 201


def test_only_admin_or_manager_can_create_sales_target(client, admin_user, analyst_user, sales_rep_user):
    analyst_headers = auth_headers(client, "analyst@test.io")
    response = client.post(
        "/api/v1/sales-targets", headers=analyst_headers,
        json={"name": "Q1 Target", "period": "monthly", "period_start": "2026-01-01", "period_end": "2026-01-31", "target_amount": 50000},
    )
    assert response.status_code == 403
