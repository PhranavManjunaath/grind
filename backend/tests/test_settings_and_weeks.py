def test_default_settings_created_on_first_read(client):
    resp = client.get("/api/settings")
    assert resp.status_code == 200
    body = resp.json()
    assert body["rep_range_low"] == 8
    assert body["rep_range_high"] == 12
    assert body["weight_increment"] == 2.5


def test_update_settings(client):
    resp = client.put(
        "/api/settings",
        json={"rep_range_low": 6, "rep_range_high": 10, "weight_increment": 5},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["rep_range_low"] == 6
    assert body["rep_range_high"] == 10
    assert body["weight_increment"] == 5


def test_split_replace_removes_old_days(client):
    client.put(
        "/api/workout/split",
        json={"days": [{"weekday": 0, "label": "Day A"}, {"weekday": 1, "label": "Day B"}]},
    )
    client.put("/api/workout/split", json={"days": [{"weekday": 2, "label": "Day C"}]})

    resp = client.get("/api/workout/split")
    body = resp.json()
    assert len(body) == 1
    assert body[0]["label"] == "Day C"


def test_current_week_number_is_stable_across_calls(client):
    first = client.get("/api/workout/weeks/current").json()["week_number"]
    second = client.get("/api/workout/weeks/current").json()["week_number"]
    assert first == second
    assert first >= 1
