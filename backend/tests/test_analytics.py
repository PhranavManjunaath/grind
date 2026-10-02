def test_weekly_summary_empty_range_handles_gracefully(client):
    resp = client.get(
        "/api/analytics/weekly",
        params={"start": "2026-01-01", "end": "2026-01-07"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["workouts"]["sessions_logged"] == 0
    assert body["food"]["average_daily_calories"] is None
    assert body["food"]["daily_totals"] == []
    assert body["skills"]["average_confidence"] is None


def test_weekly_summary_aggregates_across_domains(client):
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-02",
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 8, "sets": 3}
            ],
        },
    )
    client.post(
        "/api/food/entries",
        json={"date": "2026-01-02", "food_name": "Eggs", "calories": 150},
    )
    client.post(
        "/api/food/entries",
        json={"date": "2026-01-04", "food_name": "Rice", "calories": 250},
    )
    client.post(
        "/api/skills/entries",
        json={
            "date": "2026-01-03",
            "skill_name": "Guitar",
            "time_spent_minutes": 30,
            "confidence": 3,
        },
    )

    resp = client.get(
        "/api/analytics/weekly",
        params={"start": "2026-01-01", "end": "2026-01-07"},
    )
    body = resp.json()

    assert body["workouts"]["sessions_logged"] == 1
    assert body["workouts"]["total_sets"] == 3
    assert "Bench Press" in body["workouts"]["exercises_trained"]
    assert body["workouts"]["volume_by_exercise"]["Bench Press"] == 60 * 8 * 3

    assert body["food"]["days_logged"] == 2
    assert body["food"]["total_calories"] == 400
    assert body["food"]["average_daily_calories"] == 200

    assert body["skills"]["entries_logged"] == 1
    assert body["skills"]["total_minutes"] == 30
    assert body["skills"]["average_confidence"] == 3


def test_weekly_summary_excludes_entries_outside_range(client):
    client.post(
        "/api/food/entries",
        json={"date": "2025-12-25", "food_name": "Cookie", "calories": 100},
    )
    resp = client.get(
        "/api/analytics/weekly",
        params={"start": "2026-01-01", "end": "2026-01-07"},
    )
    body = resp.json()
    assert body["food"]["days_logged"] == 0
    assert body["food"]["total_calories"] == 0
