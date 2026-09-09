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
    client.patch(f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "qualified", "note": "Great first call"})

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
        f"/api/v1/deals/{deal['id']}/stage", headers=headers, json={"stage": "lost", "lost_reason": "Budget constraints"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stage"] == "lost"
    assert body["lost_reason"] == "Budget constraints"
    assert body["probability"] == 0
