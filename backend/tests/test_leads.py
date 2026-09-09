from tests.conftest import auth_headers


def test_create_lead(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.post(
        "/api/v1/leads",
        headers=headers,
        json={"name": "Jane Prospect", "company_name": "Prospect Co", "source": "website"},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "new"


def test_convert_lead_creates_deal(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    lead = client.post(
        "/api/v1/leads",
        headers=headers,
        json={"name": "Jane Prospect", "company_name": "Prospect Co", "source": "referral"},
    ).json()

    response = client.post(
        f"/api/v1/leads/{lead['id']}/convert",
        headers=headers,
        json={"deal_title": "Prospect Co - New Business", "deal_value": 25000},
    )
    assert response.status_code == 201
    deal = response.json()
    assert deal["title"] == "Prospect Co - New Business"
    assert deal["stage"] == "qualified"
    assert deal["value"] == 25000.0

    lead_after = client.get(f"/api/v1/leads/{lead['id']}", headers=headers).json()
    assert lead_after["status"] == "converted"
    assert lead_after["converted_deal_id"] == deal["id"]


def test_cannot_convert_lead_twice(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    lead = client.post("/api/v1/leads", headers=headers, json={"name": "Double Convert", "source": "email"}).json()
    client.post(f"/api/v1/leads/{lead['id']}/convert", headers=headers, json={})

    response = client.post(f"/api/v1/leads/{lead['id']}/convert", headers=headers, json={})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LEAD_ALREADY_CONVERTED"


def test_lead_not_found(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/leads/99999", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "LEAD_NOT_FOUND"


def test_update_lead(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    lead = client.post("/api/v1/leads", headers=headers, json={"name": "Updatable", "source": "email"}).json()

    response = client.patch(f"/api/v1/leads/{lead['id']}", headers=headers, json={"status": "contacted", "score": 80})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "contacted"
    assert body["score"] == 80


def test_delete_lead(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    lead = client.post("/api/v1/leads", headers=headers, json={"name": "Deletable", "source": "email"}).json()

    response = client.delete(f"/api/v1/leads/{lead['id']}", headers=headers)
    assert response.status_code == 204
    assert client.get(f"/api/v1/leads/{lead['id']}", headers=headers).status_code == 404


def test_lead_pagination(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    for i in range(15):
        client.post("/api/v1/leads", headers=headers, json={"name": f"Lead {i}", "source": "website"})

    page1 = client.get("/api/v1/leads?page=1&page_size=10", headers=headers).json()
    assert page1["total"] == 15
    assert len(page1["items"]) == 10
    assert page1["total_pages"] == 2

    page2 = client.get("/api/v1/leads?page=2&page_size=10", headers=headers).json()
    assert len(page2["items"]) == 5


def test_lead_status_and_source_filters(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    client.post(
        "/api/v1/leads",
        headers=headers,
        json={"name": "Website Lead", "source": "website", "status": "new"},
    )
    client.post(
        "/api/v1/leads",
        headers=headers,
        json={"name": "Referral Lead", "source": "referral", "status": "qualified"},
    )

    by_source = client.get("/api/v1/leads?source=referral", headers=headers).json()
    assert by_source["total"] == 1
    assert by_source["items"][0]["name"] == "Referral Lead"

    by_status = client.get("/api/v1/leads?status=qualified", headers=headers).json()
    assert by_status["total"] == 1
    assert by_status["items"][0]["name"] == "Referral Lead"


def test_sales_rep_cannot_access_another_reps_lead(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")

    lead = client.post("/api/v1/leads", headers=rep1_headers, json={"name": "Rep1 Lead", "source": "website"}).json()

    assert client.get(f"/api/v1/leads/{lead['id']}", headers=rep2_headers).status_code == 403
    assert client.patch(f"/api/v1/leads/{lead['id']}", headers=rep2_headers, json={"score": 99}).status_code == 403
    assert client.post(f"/api/v1/leads/{lead['id']}/convert", headers=rep2_headers, json={}).status_code == 403


def test_analyst_cannot_create_lead(client, analyst_user):
    headers = auth_headers(client, "analyst@test.io")
    response = client.post("/api/v1/leads", headers=headers, json={"name": "Blocked", "source": "website"})
    assert response.status_code == 403
