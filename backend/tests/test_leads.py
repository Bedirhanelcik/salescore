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
