from tests.conftest import auth_headers


def _create_contact(client, headers, **overrides):
    payload = {"first_name": "Jane", "last_name": "Doe"}
    payload.update(overrides)
    response = client.post("/api/v1/contacts", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_get_contact(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    contact = _create_contact(client, headers, first_name="Alice", last_name="Smith", email="alice@example.com")

    get_response = client.get(f"/api/v1/contacts/{contact['id']}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["email"] == "alice@example.com"


def test_contact_not_found(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/contacts/99999", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CONTACT_NOT_FOUND"


def test_update_contact(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    contact = _create_contact(client, headers)

    update = client.patch(f"/api/v1/contacts/{contact['id']}", headers=headers, json={"job_title": "CFO"})
    assert update.status_code == 200
    assert update.json()["job_title"] == "CFO"


def test_delete_contact(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    contact = _create_contact(client, headers)

    delete = client.delete(f"/api/v1/contacts/{contact['id']}", headers=headers)
    assert delete.status_code == 204
    assert client.get(f"/api/v1/contacts/{contact['id']}", headers=headers).status_code == 404


def test_contact_pagination(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    for i in range(23):
        _create_contact(client, headers, first_name=f"Person{i}", last_name="Test")

    page1 = client.get("/api/v1/contacts?page=1&page_size=10", headers=headers).json()
    assert page1["total"] == 23
    assert len(page1["items"]) == 10
    assert page1["total_pages"] == 3


def test_contact_search_filter(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    _create_contact(client, headers, first_name="Zach", last_name="Unique-Lastname")
    _create_contact(client, headers, first_name="Other", last_name="Person")

    response = client.get("/api/v1/contacts?search=Unique-Lastname", headers=headers)
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["first_name"] == "Zach"


def test_contact_company_filter(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    company = client.post("/api/v1/companies", headers=headers, json={"name": "Filter Co"}).json()
    _create_contact(client, headers, first_name="Linked", company_id=company["id"])
    _create_contact(client, headers, first_name="Unlinked")

    response = client.get(f"/api/v1/contacts?company_id={company['id']}", headers=headers)
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["first_name"] == "Linked"


def test_sales_rep_cannot_access_another_reps_contact(client, sales_rep_user, sales_rep2_user):
    rep1_headers = auth_headers(client, "rep@test.io")
    rep2_headers = auth_headers(client, "rep2@test.io")

    contact = _create_contact(client, rep1_headers, first_name="Owned")

    response = client.get(f"/api/v1/contacts/{contact['id']}", headers=rep2_headers)
    assert response.status_code == 403

    response = client.patch(f"/api/v1/contacts/{contact['id']}", headers=rep2_headers, json={"job_title": "Hacked"})
    assert response.status_code == 403


def test_viewer_cannot_create_contact(client, viewer_user):
    headers = auth_headers(client, "viewer@test.io")
    response = client.post("/api/v1/contacts", headers=headers, json={"first_name": "X", "last_name": "Y"})
    assert response.status_code == 403
