from tests.conftest import auth_headers


def _create_deal(client, headers, **overrides):
    payload = {"title": "Test Deal", "value": 10000, "stage": "lead"}
    payload.update(overrides)
    response = client.post("/api/v1/deals", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_deal_defaults_to_lead_stage(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = _create_deal(client, headers)
    assert deal["stage"] == "lead"
    assert deal["probability"] == 20


def test_sort_by_relationship_name_does_not_crash(client, admin_user):
    # Regression test: sort_by is a free-text query param. "company"/"owner" are relationship
    # attributes on Deal, not sortable columns, and used to raise NotImplementedError from
    # .desc()/.asc(), producing a 500. An unrecognized sort_by must fall back silently instead.
    headers = auth_headers(client, "admin@test.io")
    _create_deal(client, headers)

    response = client.get("/api/v1/deals?sort_by=company", headers=headers)
    assert response.status_code == 200

    response = client.get("/api/v1/deals?sort_by=owner", headers=headers)
    assert response.status_code == 200


def test_valid_stage_transition(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = _create_deal(client, headers)

    response = client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "qualified"})
    assert response.status_code == 200
    assert response.json()["stage"] == "qualified"


def test_invalid_stage_transition_rejected(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = _create_deal(client, headers)

    # Cannot skip straight from Lead to Negotiation.
    response = client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "negotiation"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_STAGE_TRANSITION"


def test_terminal_stage_cannot_transition(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = _create_deal(client, headers)

    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "qualified"})
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "opportunity"})
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "proposal"})
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "negotiation"})
    won = client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "won"})
    assert won.status_code == 200
    assert won.json()["probability"] == 100

    # Won is terminal - cannot move it anywhere else.
    response = client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "lost"})
    assert response.status_code == 422


def test_stage_history_is_recorded(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = _create_deal(client, headers)
    client.patch(
        f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "qualified", "note": "Great first call"}
    )

    history = client.get(f"/api/v1/deals/{deal['id']}/history", headers=headers).json()
    assert len(history) == 2  # creation + one transition
    assert history[-1]["to_stage"] == "qualified"
    assert history[-1]["note"] == "Great first call"


def test_pipeline_board_groups_by_stage(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    _create_deal(client, headers, title="Deal A", stage="lead")
    _create_deal(client, headers, title="Deal B", stage="lead")

    board = client.get("/api/v1/deals/pipeline", headers=headers).json()
    lead_column = next(col for col in board["columns"] if col["stage"] == "lead")
    assert lead_column["count"] == 2


def test_lost_deal_requires_no_special_field_but_records_reason(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    deal = _create_deal(client, headers)

    response = client.patch(
        f"/api/v1/deals/{deal['id']}/stage",
        headers=headers,
        json={"stage": "lost", "lost_reason": "Budget constraints"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stage"] == "lost"
    assert body["lost_reason"] == "Budget constraints"
    assert body["probability"] == 0


def test_deal_not_found(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    response = client.get("/api/v1/deals/99999", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DEAL_NOT_FOUND"


def test_deal_pagination(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    for i in range(12):
        _create_deal(client, headers, title=f"Deal {i}")

    page1 = client.get("/api/v1/deals?page=1&page_size=5", headers=headers).json()
    assert page1["total"] == 12
    assert len(page1["items"]) == 5
    assert page1["total_pages"] == 3


def test_deal_stage_and_value_filters(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    _create_deal(client, headers, title="Cheap Lead Deal", value=1000, stage="lead")
    won = _create_deal(client, headers, title="Qualified Deal", value=50000, stage="lead")
    client.patch(f"/api/v1/deals/{won['id']}/stage", headers=headers, json={"stage": "qualified"})

    by_stage = client.get("/api/v1/deals?stage=qualified", headers=headers).json()
    assert by_stage["total"] == 1
    assert by_stage["items"][0]["title"] == "Qualified Deal"

    by_value = client.get("/api/v1/deals?min_value=10000", headers=headers).json()
    assert by_value["total"] == 1
    assert by_value["items"][0]["title"] == "Qualified Deal"


def test_deal_search_filter(client, admin_user):
    headers = auth_headers(client, "admin@test.io")
    _create_deal(client, headers, title="Findable Unique Title")
    _create_deal(client, headers, title="Other Deal")

    response = client.get("/api/v1/deals?search=Findable", headers=headers)
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Findable Unique Title"
