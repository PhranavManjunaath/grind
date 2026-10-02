def test_create_entry_calories_only(client):
    resp = client.post(
        "/api/food", json={"date": "2026-01-01", "food_name": "Banana", "calories": 105}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["protein"] is None


def test_reject_negative_calories(client):
    resp = client.post(
        "/api/food", json={"date": "2026-01-01", "food_name": "Banana", "calories": -5}
    )
    assert resp.status_code == 422


def test_reject_negative_macro(client):
    resp = client.post(
        "/api/food",
        json={"date": "2026-01-01", "food_name": "Shake", "calories": 200, "protein": -10},
    )
    assert resp.status_code == 422


def test_save_as_food_creates_saved_entry(client):
    resp = client.post(
        "/api/food",
        json={
            "date": "2026-01-01",
            "food_name": "Oatmeal",
            "calories": 300,
            "protein": 10,
            "save_as_food": True,
        },
    )
    assert resp.status_code == 201

    saved = client.get("/api/food/saved").json()
    assert any(f["name"] == "Oatmeal" for f in saved)


def test_editing_saved_food_does_not_rewrite_past_entries(client):
    client.post(
        "/api/food",
        json={
            "date": "2026-01-01",
            "food_name": "Oatmeal",
            "calories": 300,
            "save_as_food": True,
        },
    )
    saved_id = client.get("/api/food/saved").json()[0]["id"]

    client.put(f"/api/food/saved/{saved_id}", json={"default_calories": 999})

    entries = client.get("/api/food").json()["items"]
    assert entries[0]["calories"] == 300


def test_daily_totals_only_include_logged_days(client):
    client.post(
        "/api/food",
        json={"date": "2026-01-01", "food_name": "Eggs", "calories": 150, "protein": 12},
    )
    client.post(
        "/api/food",
        json={"date": "2026-01-01", "food_name": "Toast", "calories": 120, "protein": 4},
    )
    client.post("/api/food", json={"date": "2026-01-03", "food_name": "Rice", "calories": 200})

    resp = client.get(
        "/api/food/daily-totals", params={"start": "2026-01-01", "end": "2026-01-03"}
    )
    totals = {t["date"]: t for t in resp.json()}
    assert "2026-01-02" not in totals
    assert totals["2026-01-01"]["calories"] == 270
    assert totals["2026-01-01"]["protein"] == 16
    assert totals["2026-01-03"]["calories"] == 200


def test_update_and_delete_entry(client):
    create = client.post(
        "/api/food", json={"date": "2026-01-01", "food_name": "Apple", "calories": 95}
    )
    entry_id = create.json()["id"]

    update = client.put(f"/api/food/{entry_id}", json={"calories": 100})
    assert update.json()["calories"] == 100

    delete = client.delete(f"/api/food/{entry_id}")
    assert delete.status_code == 204
    assert client.get(f"/api/food/{entry_id}").status_code == 404


def test_saved_food_routes_dont_collide_with_entry_id_route(client):
    # /api/food/saved must resolve to the saved-foods list, not attempt to
    # parse "saved" as an integer entry id.
    resp = client.get("/api/food/saved")
    assert resp.status_code == 200
    assert resp.json() == []
