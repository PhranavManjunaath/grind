def test_create_session_with_exercises(client):
    resp = client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-05",
            "notes": "Push day",
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 8, "sets": 3}
            ],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["date"] == "2026-01-05"
    assert len(body["exercises"]) == 1
    assert body["exercises"][0]["exercise_name"] == "Bench Press"


def test_reject_nonpositive_reps(client):
    resp = client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-05",
            "exercises": [
                {"exercise_name": "Squat", "weight": 80, "reps": 0, "sets": 3}
            ],
        },
    )
    assert resp.status_code == 422


def test_reject_negative_weight(client):
    resp = client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-05",
            "exercises": [
                {"exercise_name": "Squat", "weight": -5, "reps": 5, "sets": 3}
            ],
        },
    )
    assert resp.status_code == 422


def test_list_filter_by_date_range(client):
    client.post("/api/workouts/sessions", json={"date": "2026-01-01", "exercises": []})
    client.post("/api/workouts/sessions", json={"date": "2026-02-01", "exercises": []})

    resp = client.get(
        "/api/workouts/sessions", params={"start": "2026-01-01", "end": "2026-01-31"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["date"] == "2026-01-01"


def test_update_and_delete_session(client):
    create = client.post(
        "/api/workouts/sessions", json={"date": "2026-01-01", "exercises": []}
    )
    session_id = create.json()["id"]

    update = client.patch(
        f"/api/workouts/sessions/{session_id}", json={"notes": "updated"}
    )
    assert update.status_code == 200
    assert update.json()["notes"] == "updated"

    delete = client.delete(f"/api/workouts/sessions/{session_id}")
    assert delete.status_code == 204

    missing = client.get(f"/api/workouts/sessions/{session_id}")
    assert missing.status_code == 404


def test_delete_session_cascades_exercises(client):
    create = client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-01",
            "exercises": [
                {"exercise_name": "Row", "weight": 40, "reps": 10, "sets": 3}
            ],
        },
    )
    session_id = create.json()["id"]
    exercise_id = create.json()["exercises"][0]["id"]

    client.delete(f"/api/workouts/sessions/{session_id}")

    missing_exercise = client.patch(
        f"/api/workouts/exercises/{exercise_id}", json={"weight": 50}
    )
    assert missing_exercise.status_code == 404


def test_suggestion_no_history(client):
    resp = client.get(
        "/api/workouts/suggestions", params={"exercise_name": "Overhead Press"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["has_history"] is False
    assert body["suggested_weight"] is None


def test_suggestion_single_session_repeats_weight(client):
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-01",
            "exercises": [
                {"exercise_name": "Deadlift", "weight": 100, "reps": 5, "sets": 3}
            ],
        },
    )
    resp = client.get(
        "/api/workouts/suggestions", params={"exercise_name": "Deadlift"}
    )
    body = resp.json()
    assert body["has_history"] is True
    assert body["suggested_weight"] == 100


def test_suggestion_increases_after_full_completion(client):
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-01",
            "exercises": [
                {"exercise_name": "Squat", "weight": 80, "reps": 5, "sets": 3}
            ],
        },
    )
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-08",
            "exercises": [
                {"exercise_name": "Squat", "weight": 80, "reps": 5, "sets": 3}
            ],
        },
    )
    resp = client.get("/api/workouts/suggestions", params={"exercise_name": "Squat"})
    body = resp.json()
    assert body["suggested_weight"] > 80
    assert body["increment"] > 0


def test_suggestion_repeats_after_incomplete_session(client):
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-01",
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 8, "sets": 3}
            ],
        },
    )
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-08",
            "exercises": [
                {"exercise_name": "Bench Press", "weight": 60, "reps": 5, "sets": 3}
            ],
        },
    )
    resp = client.get(
        "/api/workouts/suggestions", params={"exercise_name": "Bench Press"}
    )
    body = resp.json()
    assert body["suggested_weight"] == 60
    assert body["increment"] == 0


def test_suggestion_bodyweight_exercise_never_suggests_weight_increase(client):
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-01",
            "exercises": [
                {"exercise_name": "Pull-ups", "weight": 0, "reps": 10, "sets": 3}
            ],
        },
    )
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-08",
            "exercises": [
                {"exercise_name": "Pull-ups", "weight": 0, "reps": 12, "sets": 3}
            ],
        },
    )
    resp = client.get("/api/workouts/suggestions", params={"exercise_name": "Pull-ups"})
    body = resp.json()
    assert body["suggested_weight"] == 0
    assert body["increment"] == 0


def test_custom_increment_override(client):
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-01",
            "exercises": [
                {"exercise_name": "Squat", "weight": 80, "reps": 5, "sets": 3}
            ],
        },
    )
    client.post(
        "/api/workouts/sessions",
        json={
            "date": "2026-01-08",
            "exercises": [
                {"exercise_name": "Squat", "weight": 80, "reps": 5, "sets": 3}
            ],
        },
    )
    resp = client.get(
        "/api/workouts/suggestions",
        params={"exercise_name": "Squat", "increment": 10},
    )
    body = resp.json()
    assert body["suggested_weight"] == 90
