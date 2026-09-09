from tests.conftest import auth_headers


def test_login_success(client, admin_user):
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.io", "password": "Password123!"})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "admin@test.io"
    assert body["user"]["role"] == "admin"


def test_login_wrong_password(client, admin_user):
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.io", "password": "wrong-password"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_unknown_user(client):
    response = client.post("/api/v1/auth/login", json={"email": "nobody@test.io", "password": "whatever123"})
    assert response.status_code == 401


def test_me_requires_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_valid_token(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "admin@test.io"


def test_invalid_token_rejected(client):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_register_first_user_becomes_admin(client):
    response = client.post(
        "/api/v1/auth/register", json={"email": "founder@test.io", "password": "Password123!", "full_name": "Founder"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["role"] == "admin"
    assert body["access_token"]


def test_register_subsequent_user_becomes_viewer(client, admin_user):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "newperson@test.io", "password": "Password123!", "full_name": "New Person"},
    )
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "viewer"


def test_register_duplicate_email_rejected(client, admin_user):
    response = client.post(
        "/api/v1/auth/register", json={"email": "admin@test.io", "password": "Password123!", "full_name": "Duplicate"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_TAKEN"


def test_change_password(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "Password123!", "new_password": "NewPassword456!"},
    )
    assert response.status_code == 200

    # old password no longer works, new one does
    assert (
        client.post("/api/v1/auth/login", json={"email": "admin@test.io", "password": "Password123!"}).status_code
        == 401
    )
    assert (
        client.post("/api/v1/auth/login", json={"email": "admin@test.io", "password": "NewPassword456!"}).status_code
        == 200
    )
