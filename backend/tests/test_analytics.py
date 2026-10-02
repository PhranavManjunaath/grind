def _current_week_number(client) -> int:
    return client.get("/api/analytics/week/current/number").json()["week_number"]


def test_week_summary_empty_week_handles_gracefully(client):
    week = _current_week_number(client)
    resp = client.get(f"/api/analytics/week/{week}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["workouts"]["days_logged"] == 0
    assert body["food"]["average_daily_calories"] is None
    assert body["food"]["daily_totals"] == []
    assert body["skills"]["average_confidence"] is None


def test_week_summary_aggregates_across_domains(client):
    week = _current_week_number(client)
    range_start = client.get(f"/api/analytics/week/{week}").json()["range_start"]

    split = client.put(
        "/api/workout/split", json={"days": [{"weekday": 0, "label": "Push"}]}
    ).json()
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": week,
            "split_day_id": split[0]["id"],
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 8, "sets": 3}
            ],
        },
    )
    client.post(
        "/api/food", json={"date": range_start, "food_name": "Eggs", "calories": 150}
    )
    client.post(
        "/api/skills",
        json={
            "week_number": week,
            "skill_name": "Guitar",
            "hours_spent": 2,
            "confidence": 3,
        },
    )

    resp = client.get(f"/api/analytics/week/{week}")
    body = resp.json()

    assert body["workouts"]["days_logged"] == 1
    assert body["workouts"]["total_sets"] == 3
    assert "Bench Press" in body["workouts"]["exercises_trained"]
    assert body["workouts"]["volume_by_exercise"]["Bench Press"] == 60 * 8 * 3

    assert body["food"]["days_logged"] == 1
    assert body["food"]["total_calories"] == 150

    assert body["skills"]["entries_logged"] == 1
    assert body["skills"]["total_hours"] == 2
    assert body["skills"]["average_confidence"] == 3


def test_week_summary_excludes_entries_outside_week(client):
    week = _current_week_number(client)
    client.post(
        "/api/food", json={"date": "2020-01-01", "food_name": "Old Cookie", "calories": 100}
    )
    resp = client.get(f"/api/analytics/week/{week}")
    body = resp.json()
    assert body["food"]["days_logged"] == 0


def test_skills_improved_confidence_detected_week_over_week(client):
    week = _current_week_number(client)
    client.post(
        "/api/skills",
        json={
            "week_number": week - 1 if week > 1 else 1,
            "skill_name": "Python",
            "hours_spent": 2,
            "confidence": 4,
        },
    )
    target_week = week if week > 1 else 2
    client.post(
        "/api/skills",
        json={
            "week_number": target_week,
            "skill_name": "Python",
            "hours_spent": 2,
            "confidence": 7,
        },
    )
    resp = client.get(f"/api/analytics/week/{target_week}")
    assert "Python" in resp.json()["skills"]["improved_confidence"]
