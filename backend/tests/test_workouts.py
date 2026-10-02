def _set_split(client):
    resp = client.put(
        "/api/workout/split",
        json={
            "days": [
                {"weekday": 0, "label": "Chest + Triceps + Shoulders"},
                {"weekday": 1, "label": "Back + Biceps"},
            ]
        },
    )
    assert resp.status_code == 200
    return resp.json()


def test_update_and_get_split(client):
    days = _set_split(client)
    assert len(days) == 2
    assert days[0]["label"] == "Chest + Triceps + Shoulders"

    resp = client.get("/api/workout/split")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_create_week_log_with_exercises(client):
    days = _set_split(client)
    resp = client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [
                {"exercise_name": "Incline DB Press", "weight": 25, "reps": 10, "sets": 3}
            ],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["week_number"] == 1
    assert len(body["exercises"]) == 1


def test_reject_negative_weight(client):
    days = _set_split(client)
    resp = client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [{"exercise_name": "Squat", "weight": -5, "reps": 5, "sets": 3}],
        },
    )
    assert resp.status_code == 422


def test_duplicate_week_day_log_rejected(client):
    days = _set_split(client)
    client.post(
        "/api/workout/weeks",
        json={"week_number": 1, "split_day_id": days[0]["id"], "exercises": []},
    )
    resp = client.post(
        "/api/workout/weeks",
        json={"week_number": 1, "split_day_id": days[0]["id"], "exercises": []},
    )
    assert resp.status_code == 409


def test_get_week_view(client):
    days = _set_split(client)
    client.post(
        "/api/workout/weeks",
        json={"week_number": 2, "split_day_id": days[0]["id"], "exercises": []},
    )
    resp = client.get("/api/workout/weeks/2")
    assert resp.status_code == 200
    body = resp.json()
    assert body["week_number"] == 2
    assert len(body["days"]) == 1


def test_copy_week_forward(client):
    days = _set_split(client)
    create = client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 8, "sets": 3}
            ],
        },
    )
    log_id = create.json()["id"]

    resp = client.post(
        f"/api/workout/weeks/{log_id}/copy-forward", params={"target_week_number": 2}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["week_number"] == 2
    assert body["exercises"][0]["exercise_name"] == "Bench Press"
    assert body["exercises"][0]["weight"] == 60


def test_update_and_delete_exercise(client):
    days = _set_split(client)
    create = client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [
                {"exercise_name": "Row", "weight": 40, "reps": 10, "sets": 3}
            ],
        },
    )
    exercise_id = create.json()["exercises"][0]["id"]

    update = client.put(f"/api/workout/exercises/{exercise_id}", json={"weight": 42.5})
    assert update.json()["weight"] == 42.5

    delete = client.delete(f"/api/workout/exercises/{exercise_id}")
    assert delete.status_code == 204


def test_progress_no_history(client):
    resp = client.get("/api/workout/progress/Overhead Press")
    assert resp.status_code == 200
    body = resp.json()
    assert body["trend"] == "insufficient_data"
    assert body["basic_suggestion"]["has_history"] is False


def test_progress_single_week_repeats_weight(client):
    days = _set_split(client)
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [
                {"exercise_name": "Deadlift", "weight": 100, "reps": 5, "sets": 3}
            ],
        },
    )
    resp = client.get("/api/workout/progress/Deadlift")
    body = resp.json()
    assert body["basic_suggestion"]["suggested_weight"] == 100
    assert body["trend"] == "insufficient_data"


def test_progress_increases_after_hitting_rep_target(client):
    days = _set_split(client)
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [{"exercise_name": "Squat", "weight": 80, "reps": 10, "sets": 3}],
        },
    )
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 2,
            "split_day_id": days[0]["id"],
            "exercises": [{"exercise_name": "Squat", "weight": 80, "reps": 12, "sets": 3}],
        },
    )
    resp = client.get("/api/workout/progress/Squat")
    body = resp.json()
    assert body["basic_suggestion"]["suggested_weight"] > 80
    assert body["trend"] == "improving"


def test_progress_bodyweight_never_suggests_weight_change(client):
    days = _set_split(client)
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [{"exercise_name": "Pull-ups", "weight": 0, "reps": 8, "sets": 3}],
        },
    )
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 2,
            "split_day_id": days[0]["id"],
            "exercises": [{"exercise_name": "Pull-ups", "weight": 0, "reps": 10, "sets": 3}],
        },
    )
    resp = client.get("/api/workout/progress/Pull-ups")
    body = resp.json()
    assert body["basic_suggestion"]["suggested_weight"] == 0
    assert body["basic_suggestion"]["increment"] == 0


def test_progress_repeats_after_falling_short(client):
    days = _set_split(client)
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 10, "sets": 3}
            ],
        },
    )
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 2,
            "split_day_id": days[0]["id"],
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 6, "sets": 3}
            ],
        },
    )
    resp = client.get("/api/workout/progress/Bench Press")
    body = resp.json()
    assert body["basic_suggestion"]["suggested_weight"] == 60
    assert body["basic_suggestion"]["increment"] == 0
    assert body["trend"] == "declining"


def test_never_suggests_a_decrease_across_many_weeks(client):
    days = _set_split(client)
    weights_and_reps = [(80, 10), (80, 6), (80, 5), (80, 4)]
    for week, (weight, reps) in enumerate(weights_and_reps, start=1):
        client.post(
            "/api/workout/weeks",
            json={
                "week_number": week,
                "split_day_id": days[0]["id"],
                "exercises": [
                    {"exercise_name": "Squat", "weight": weight, "reps": reps, "sets": 3}
                ],
            },
        )
    resp = client.get("/api/workout/progress/Squat")
    body = resp.json()
    assert body["basic_suggestion"]["suggested_weight"] >= 80


def test_ai_recommendation_degrades_gracefully_without_api_key(client, monkeypatch):
    import app.services.ai_coach as ai_coach

    monkeypatch.setattr(ai_coach, "AI_API_KEY", None)

    days = _set_split(client)
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 8, "sets": 3}
            ],
        },
    )
    resp = client.post(
        "/api/workout/ai-recommendation", params={"exercise_name": "Bench Press"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["available"] is False
    assert body["exercise"] == "Bench Press"


def test_ai_weekly_summary_degrades_gracefully_without_api_key(client, monkeypatch):
    import app.services.ai_coach as ai_coach

    monkeypatch.setattr(ai_coach, "AI_API_KEY", None)

    days = _set_split(client)
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 8, "sets": 3}
            ],
        },
    )
    resp = client.get("/api/workout/ai-weekly-summary", params={"week_number": 1})
    assert resp.status_code == 200
    assert resp.json()["available"] is False


def test_settings_rep_range_and_increment_affect_suggestion(client):
    days = _set_split(client)
    client.put(
        "/api/settings",
        json={"rep_range_low": 5, "rep_range_high": 6, "weight_increment": 10},
    )
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 1,
            "split_day_id": days[0]["id"],
            "exercises": [{"exercise_name": "Squat", "weight": 80, "reps": 5, "sets": 3}],
        },
    )
    client.post(
        "/api/workout/weeks",
        json={
            "week_number": 2,
            "split_day_id": days[0]["id"],
            "exercises": [{"exercise_name": "Squat", "weight": 80, "reps": 6, "sets": 3}],
        },
    )
    resp = client.get("/api/workout/progress/Squat")
    body = resp.json()
    assert body["basic_suggestion"]["suggested_weight"] == 90
