def test_create_skill_entry(client):
    resp = client.post(
        "/api/skills",
        json={
            "week_number": 1,
            "skill_name": "FastAPI",
            "hours_spent": 5,
            "confidence": 7,
            "progress": "Beginner -> Intermediate",
        },
    )
    assert resp.status_code == 201


def test_reject_zero_hours(client):
    resp = client.post(
        "/api/skills",
        json={"week_number": 1, "skill_name": "Guitar", "hours_spent": 0, "confidence": 3},
    )
    assert resp.status_code == 422


def test_reject_confidence_out_of_range(client):
    resp = client.post(
        "/api/skills",
        json={"week_number": 1, "skill_name": "Guitar", "hours_spent": 2, "confidence": 11},
    )
    assert resp.status_code == 422


def test_confidence_allows_full_1_to_10_range(client):
    resp = client.post(
        "/api/skills",
        json={"week_number": 1, "skill_name": "Guitar", "hours_spent": 2, "confidence": 10},
    )
    assert resp.status_code == 201


def test_filter_by_week_and_skill_name(client):
    client.post(
        "/api/skills",
        json={"week_number": 1, "skill_name": "Guitar", "hours_spent": 2, "confidence": 3},
    )
    client.post(
        "/api/skills",
        json={"week_number": 2, "skill_name": "Guitar", "hours_spent": 3, "confidence": 4},
    )
    client.post(
        "/api/skills",
        json={"week_number": 1, "skill_name": "Spanish", "hours_spent": 1, "confidence": 2},
    )

    resp = client.get("/api/skills", params={"week_number": 1})
    body = resp.json()
    assert body["total"] == 2

    resp = client.get("/api/skills", params={"skill_name": "Guitar"})
    assert resp.json()["total"] == 2


def test_update_and_delete_skill_entry(client):
    create = client.post(
        "/api/skills",
        json={"week_number": 1, "skill_name": "Chess", "hours_spent": 1, "confidence": 4},
    )
    entry_id = create.json()["id"]

    update = client.put(f"/api/skills/{entry_id}", json={"confidence": 5})
    assert update.json()["confidence"] == 5

    delete = client.delete(f"/api/skills/{entry_id}")
    assert delete.status_code == 204
    assert client.get(f"/api/skills/{entry_id}").status_code == 404
