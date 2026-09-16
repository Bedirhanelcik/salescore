from tests.conftest import auth_headers


def test_list_report_types(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/reports/types", headers=headers)
    assert response.status_code == 200
    assert "sales" in response.json()["types"]


def test_unknown_report_type_404s(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/reports/not-a-real-report", headers=headers)
    assert response.status_code == 404


def test_sales_report_reflects_created_deals(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    client.post("/api/v1/deals", headers=headers, json={"title": "Report Deal", "value": 15000})

    response = client.get("/api/v1/reports/sales", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(row["deal"] == "Report Deal" for row in body["items"])


def test_customer_report_includes_deal_rollup(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    company = client.post("/api/v1/companies", headers=headers, json={"name": "Report Co"}).json()
    deal = client.post(
        "/api/v1/deals", headers=headers, json={"title": "Co Deal", "value": 20000, "company_id": company["id"]}
    ).json()
    for stage in ["qualified", "opportunity", "proposal", "negotiation", "won"]:
        client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": stage})

    response = client.get("/api/v1/reports/customers", headers=headers)
    row = next(r for r in response.json()["items"] if r["company"] == "Report Co")
    assert row["total_deals"] == 1
    assert row["won_deals"] == 1
    assert row["lifetime_value"] == 20000.0


def test_report_csv_export(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    client.post("/api/v1/deals", headers=headers, json={"title": "CSV Deal", "value": 5000})

    response = client.get("/api/v1/reports/sales?format=csv", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "CSV Deal" in response.text


def test_report_pagination(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    for i in range(25):
        client.post("/api/v1/deals", headers=headers, json={"title": f"Deal {i}", "value": 1000})

    page1 = client.get("/api/v1/reports/pipeline?page=1&page_size=10", headers=headers).json()
    assert page1["total"] == 25
    assert len(page1["items"]) == 10
    assert page1["total_pages"] == 3


def test_sales_rep_only_sees_own_deals_in_report(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")

    client.post("/api/v1/deals", headers=rep1_headers, json={"title": "Rep1 Deal", "value": 1000})
    client.post("/api/v1/deals", headers=rep2_headers, json={"title": "Rep2 Deal", "value": 1000})

    rep1_report = client.get("/api/v1/reports/sales", headers=rep1_headers).json()
    titles = [row["deal"] for row in rep1_report["items"]]
    assert "Rep1 Deal" in titles
    assert "Rep2 Deal" not in titles


def _win_deal(client, headers, value):
    deal = client.post(
        "/api/v1/deals", headers=headers, json={"title": "Deal", "value": value, "stage": "negotiation"}
    ).json()
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "won"})


def _current_period_actual(items: list[dict]) -> float:
    return items[-1]["actual"]


def _kpi_value(items: list[dict], metric_label: str) -> float:
    return next(row["value"] for row in items if row["metric"] == metric_label)


def test_revenue_report_scoped_to_sales_rep(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")
    _win_deal(client, rep1_headers, 25000)
    _win_deal(client, rep2_headers, 99000)

    rep1_items = client.get("/api/v1/reports/revenue", headers=rep1_headers).json()["items"]
    assert _current_period_actual(rep1_items) == 25000.0

    rep2_items = client.get("/api/v1/reports/revenue", headers=rep2_headers).json()["items"]
    assert _current_period_actual(rep2_items) == 99000.0


def test_kpi_report_scoped_to_sales_rep(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")
    _win_deal(client, rep1_headers, 25000)
    _win_deal(client, rep2_headers, 99000)

    rep1_items = client.get("/api/v1/reports/kpi", headers=rep1_headers).json()["items"]
    assert _kpi_value(rep1_items, "Revenue") == 25000.0

    rep2_items = client.get("/api/v1/reports/kpi", headers=rep2_headers).json()["items"]
    assert _kpi_value(rep2_items, "Revenue") == 99000.0


def test_admin_sees_organization_wide_revenue_and_kpi_report(client, admin_user, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")
    _win_deal(client, rep1_headers, 25000)
    _win_deal(client, rep2_headers, 99000)

    admin_headers = auth_headers(client, "admin@test.io")
    revenue_items = client.get("/api/v1/reports/revenue", headers=admin_headers).json()["items"]
    assert _current_period_actual(revenue_items) == 124000.0

    kpi_items = client.get("/api/v1/reports/kpi", headers=admin_headers).json()["items"]
    assert _kpi_value(kpi_items, "Revenue") == 124000.0


def test_revenue_and_kpi_csv_export_are_scoped(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")
    _win_deal(client, rep1_headers, 25000)
    _win_deal(client, rep2_headers, 99000)

    revenue_csv = client.get("/api/v1/reports/revenue?format=csv", headers=rep1_headers).text
    assert "25000.0" in revenue_csv
    assert "99000.0" not in revenue_csv

    kpi_csv = client.get("/api/v1/reports/kpi?format=csv", headers=rep1_headers).text
    assert "25000" in kpi_csv
    assert "99000" not in kpi_csv
