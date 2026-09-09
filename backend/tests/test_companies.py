from tests.conftest import auth_headers


def test_create_and_get_company(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.post(
        "/api/v1/companies", headers=headers, json={"name": "Acme Corporation", "industry": "Software"}
    )
    assert response.status_code == 201
    company_id = response.json()["id"]

    get_response = client.get(f"/api/v1/companies/{company_id}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Acme Corporation"


def test_company_requires_auth(client):
    response = client.get("/api/v1/companies")
    assert response.status_code == 401


def test_company_not_found(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/companies/99999", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "COMPANY_NOT_FOUND"


def test_update_company(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    create = client.post("/api/v1/companies", headers=headers, json={"name": "Initech"})
    company_id = create.json()["id"]

    update = client.patch(f"/api/v1/companies/{company_id}", headers=headers, json={"industry": "Manufacturing"})
    assert update.status_code == 200
    assert update.json()["industry"] == "Manufacturing"


def test_delete_company(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    create = client.post("/api/v1/companies", headers=headers, json={"name": "ToDelete Ltd"})
    company_id = create.json()["id"]

    delete = client.delete(f"/api/v1/companies/{company_id}", headers=headers)
    assert delete.status_code == 204
    assert client.get(f"/api/v1/companies/{company_id}", headers=headers).status_code == 404


def test_pagination(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    for i in range(25):
        client.post("/api/v1/companies", headers=headers, json={"name": f"Company {i}"})

    response = client.get("/api/v1/companies?page=1&page_size=10", headers=headers)
    body = response.json()
    assert body["total"] == 25
    assert body["page"] == 1
    assert body["page_size"] == 10
    assert len(body["items"]) == 10
    assert body["total_pages"] == 3

    page2 = client.get("/api/v1/companies?page=2&page_size=10", headers=headers).json()
    assert len(page2["items"]) == 10
    assert page2["items"][0]["id"] != body["items"][0]["id"]


def test_search_filter(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    client.post("/api/v1/companies", headers=headers, json={"name": "Globex International"})
    client.post("/api/v1/companies", headers=headers, json={"name": "Umbrella Group"})

    response = client.get("/api/v1/companies?search=Globex", headers=headers)
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Globex International"
