def test_create_skill_entry(client):
    resp = client.post(
        "/api/skills/entries",
        json={
            "date": "2026-01-01",
            "skill_name": "Guitar",
            "time_spent_minutes": 30,
            "confidence": 3,
        },
    )
    assert resp.status_code == 201


def test_reject_zero_time_spent(client):
    resp = client.post(
        "/api/skills/entries",
        json={
            "date": "2026-01-01",
            "skill_name": "Guitar",
            "time_spent_minutes": 0,
            "confidence": 3,
        },
    )
    assert resp.status_code == 422


def test_reject_confidence_out_of_range(client):
    resp = client.post(
        "/api/skills/entries",
        json={
            "date": "2026-01-01",
            "skill_name": "Guitar",
            "time_spent_minutes": 20,
            "confidence": 6,
        },
    )
    assert resp.status_code == 422


def test_filter_by_skill_name(client):
    client.post(
        "/api/skills/entries",
        json={
            "date": "2026-01-01",
            "skill_name": "Guitar",
            "time_spent_minutes": 20,
            "confidence": 3,
        },
    )
    client.post(
        "/api/skills/entries",
        json={
            "date": "2026-01-01",
            "skill_name": "Spanish",
            "time_spent_minutes": 15,
            "confidence": 2,
        },
    )
    resp = client.get("/api/skills/entries", params={"skill_name": "Guitar"})
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["skill_name"] == "Guitar"


def test_update_and_delete_skill_entry(client):
    create = client.post(
        "/api/skills/entries",
        json={
            "date": "2026-01-01",
            "skill_name": "Chess",
            "time_spent_minutes": 45,
            "confidence": 4,
        },
    )
    entry_id = create.json()["id"]

    update = client.patch(
        f"/api/skills/entries/{entry_id}", json={"confidence": 5}
    )
    assert update.json()["confidence"] == 5

    delete = client.delete(f"/api/skills/entries/{entry_id}")
    assert delete.status_code == 204
    assert client.get(f"/api/skills/entries/{entry_id}").status_code == 404
