"""Progressive-overload engine: objective, week-over-week calculations.

This never guesses — every number here comes directly from logged
WorkoutExerciseEntry rows. The AI coach (services/ai_coach.py) consumes
this engine's output rather than deciding progression on its own.
"""

from ..models import WorkoutExerciseEntry
from ..schemas import NextWeightSuggestion, ProgressPoint

HistoryItem = tuple[int, WorkoutExerciseEntry]  # (week_number, entry)


def volume(entry: WorkoutExerciseEntry) -> float:
    return entry.weight * entry.reps * entry.sets


def default_increment(weight: float) -> float:
    if weight <= 0:
        return 0.0
    if weight < 20:
        return 1.25
    if weight < 60:
        return 2.5
    return 5.0


def build_progress_points(history: list[HistoryItem]) -> list[ProgressPoint]:
    ordered = sorted(history, key=lambda pair: (pair[0], pair[1].id or 0))
    return [
        ProgressPoint(
            week_number=week,
            weight=entry.weight,
            reps=entry.reps,
            sets=entry.sets,
            volume=round(volume(entry), 2),
        )
        for week, entry in ordered
    ]


def classify_trend(points: list[ProgressPoint]) -> str:
    """Classify recent performance from up to the last 4 logged weeks."""
    if len(points) < 2:
        return "insufficient_data"

    recent = points[-4:]
    first_volume = recent[0].volume
    last_volume = recent[-1].volume

    if first_volume == 0:
        return "insufficient_data"

    change_ratio = (last_volume - first_volume) / first_volume

    if change_ratio > 0.03:
        return "improving"
    if change_ratio < -0.03:
        return "declining"
    return "stable"


def suggest_next_weight(
    exercise_name: str,
    history: list[HistoryItem],
    rep_range: tuple[int, int] = (8, 12),
    increment_override: float | None = None,
) -> NextWeightSuggestion:
    """A simple, explainable next-session suggestion from week history.

    Never suggests a decrease. Never suggests a weight change for
    bodyweight (weight == 0) exercises.
    """
    if not history:
        return NextWeightSuggestion(
            exercise_name=exercise_name,
            has_history=False,
            rationale="No prior logged weeks for this exercise yet — "
            "log one to start getting suggestions.",
        )

    ordered = sorted(history, key=lambda pair: (pair[0], pair[1].id or 0))
    last_week, latest = ordered[-1]
    rep_low, rep_high = rep_range

    base = {
        "exercise_name": exercise_name,
        "has_history": True,
        "last_week_number": last_week,
        "last_weight": latest.weight,
        "last_reps": latest.reps,
        "last_sets": latest.sets,
    }

    if latest.weight <= 0:
        return NextWeightSuggestion(
            **base,
            suggested_weight=latest.weight,
            increment=0,
            rationale=(
                f"{exercise_name} is logged with no added weight, so this "
                "tool doesn't suggest a weight change — try adding reps or "
                "sets instead."
            ),
        )

    if len(ordered) == 1:
        return NextWeightSuggestion(
            **base,
            suggested_weight=latest.weight,
            increment=0,
            rationale=(
                f"Only one logged week for {exercise_name} so far — repeat "
                f"{latest.weight} to confirm it's solid before increasing."
            ),
        )

    _, previous = ordered[-2]
    reached_top_of_range = latest.reps >= rep_high and latest.sets >= previous.sets
    matched_or_beat_prior = latest.sets >= previous.sets and latest.reps >= previous.reps

    if reached_top_of_range or (matched_or_beat_prior and latest.reps >= rep_low):
        increment = (
            increment_override
            if increment_override is not None
            else default_increment(latest.weight)
        )
        return NextWeightSuggestion(
            **base,
            suggested_weight=round(latest.weight + increment, 2),
            increment=increment,
            rationale=(
                f"Last week you hit {latest.sets}x{latest.reps} at "
                f"{latest.weight}, within/above your {rep_low}-{rep_high} rep "
                f"target — try +{increment} next session."
            ),
        )

    if latest.reps < previous.reps or latest.sets < previous.sets:
        return NextWeightSuggestion(
            **base,
            suggested_weight=latest.weight,
            increment=0,
            rationale=(
                f"Last week ({latest.sets}x{latest.reps} at {latest.weight}) "
                f"was below the week before ({previous.sets}x{previous.reps} "
                f"at {previous.weight}) — repeat {latest.weight} and rebuild "
                "toward that before increasing."
            ),
        )

    return NextWeightSuggestion(
        **base,
        suggested_weight=latest.weight,
        increment=0,
        rationale=(
            f"Last week was {latest.sets}x{latest.reps} at {latest.weight}, "
            f"still below the {rep_low}-{rep_high} rep target — keep "
            "building reps at this weight before increasing."
        ),
    )
