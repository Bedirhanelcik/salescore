"""Dashboard/analytics data-ownership tests.

A Sales Rep's dashboard must be computed only from deals they own - never the whole
company's pipeline (see app.core.rbac.scope_to_owner_only and analytics_service._owner_scope).
This is what makes a freshly self-registered account start with a genuinely empty
dashboard instead of instantly showing every other user's revenue and deals.
"""

from tests.conftest import auth_headers


def _kpi(body: dict, key: str) -> float:
    return next(m["value"] for m in body["metrics"] if m["key"] == key)


def _create_deal(client, headers, **overrides):
    payload = {"title": "Test Deal", "value": 10000, "stage": "lead"}
    payload.update(overrides)
    response = client.post("/api/v1/deals", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_new_sales_rep_dashboard_starts_empty(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.get("/api/v1/analytics/kpis", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert _kpi(body, "revenue") == 0
    assert _kpi(body, "pipeline_value") == 0
    assert _kpi(body, "won_deals") == 0
    assert _kpi(body, "win_rate") == 0
    assert _kpi(body, "avg_deal_size") == 0
    assert _kpi(body, "active_customers") == 0


def test_new_sales_rep_has_no_data_yet_insight(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    response = client.get("/api/v1/analytics/insights", headers=headers)
    assert response.status_code == 200
    insights = response.json()["insights"]
    assert len(insights) == 1
    assert insights[0]["id"] == "no_data_yet"


def test_open_deal_counts_as_pipeline_not_revenue(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    _create_deal(client, headers, value=25000, stage="negotiation")

    body = client.get("/api/v1/analytics/kpis", headers=headers).json()
    assert _kpi(body, "pipeline_value") == 25000
    assert _kpi(body, "revenue") == 0
    assert _kpi(body, "won_deals") == 0


def test_winning_a_deal_moves_value_from_pipeline_to_revenue(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    deal = _create_deal(client, headers, value=25000, stage="negotiation")

    response = client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "won"})
    assert response.status_code == 200

    body = client.get("/api/v1/analytics/kpis", headers=headers).json()
    assert _kpi(body, "pipeline_value") == 0
    assert _kpi(body, "revenue") == 25000
    assert _kpi(body, "won_deals") == 1
    assert _kpi(body, "avg_deal_size") == 25000


def test_losing_a_deal_updates_win_rate(client, sales_rep_user):
    headers = auth_headers(client, "rep@test.io")
    won_deal = _create_deal(client, headers, value=25000, stage="negotiation")
    lost_deal = _create_deal(client, headers, value=15000, stage="negotiation")

    client.patch(f"/api/v1/deals/{won_deal['id']}/stage", headers=headers, json={"stage": "won"})
    client.patch(f"/api/v1/deals/{lost_deal['id']}/stage", headers=headers, json={"stage": "lost"})

    body = client.get("/api/v1/analytics/kpis", headers=headers).json()
    assert _kpi(body, "win_rate") == 50.0
    assert _kpi(body, "revenue") == 25000


def test_sales_rep_kpis_are_isolated_from_other_reps(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")

    _create_deal(client, rep1_headers, value=25000, stage="negotiation")
    deal2 = _create_deal(client, rep2_headers, value=99000, stage="negotiation")
    client.patch(f"/api/v1/deals/{deal2['id']}/stage", headers=rep2_headers, json={"stage": "won"})

    rep1_body = client.get("/api/v1/analytics/kpis", headers=rep1_headers).json()
    assert _kpi(rep1_body, "pipeline_value") == 25000
    assert _kpi(rep1_body, "revenue") == 0
    assert _kpi(rep1_body, "won_deals") == 0

    rep2_body = client.get("/api/v1/analytics/kpis", headers=rep2_headers).json()
    assert _kpi(rep2_body, "pipeline_value") == 0
    assert _kpi(rep2_body, "revenue") == 99000
    assert _kpi(rep2_body, "won_deals") == 1


def test_admin_sees_organization_wide_kpis(client, admin_user, sales_rep_user):
    rep_headers = auth_headers(client, "rep@test.io")
    deal = _create_deal(client, rep_headers, value=25000, stage="negotiation")
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=rep_headers, json={"stage": "won"})

    admin_headers = auth_headers(client, "admin@test.io")
    body = client.get("/api/v1/analytics/kpis", headers=admin_headers).json()
    assert _kpi(body, "revenue") == 25000
    assert _kpi(body, "won_deals") == 1
