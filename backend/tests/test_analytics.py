from tests.conftest import auth_headers


def test_kpis_are_zero_on_empty_database(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/analytics/kpis", headers=headers)
    assert response.status_code == 200
    metrics = {m["key"]: m for m in response.json()["metrics"]}
    assert metrics["revenue"]["value"] == 0
    assert metrics["won_deals"]["value"] == 0


def test_kpis_reflect_won_deal(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = client.post(
        "/api/v1/deals", headers=headers, json={"title": "Big Deal", "value": 50000, "stage": "lead"}
    ).json()
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "qualified"})
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "opportunity"})
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "proposal"})
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "negotiation"})
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "won"})

    response = client.get("/api/v1/analytics/kpis", headers=headers)
    metrics = {m["key"]: m for m in response.json()["metrics"]}
    assert metrics["revenue"]["value"] == 50000
    assert metrics["won_deals"]["value"] == 1


def test_funnel_requires_auth(client):
    assert client.get("/api/v1/analytics/funnel").status_code == 401


def test_insights_return_something_on_empty_db(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/analytics/insights", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["insights"]) >= 1
