"""Progressive-overload suggestion logic.

This is a simple, explainable heuristic over the user's own logged
history — never a guarantee and never a decrease unless the caller
explicitly asks for one (not currently exposed).
"""

from datetime import date as date_type

from ..models import ExerciseEntry
from ..schemas import NextWeightSuggestion

HistoryItem = tuple[date_type, ExerciseEntry]


def default_increment(weight: float) -> float:
    """A sensible default plate/dumbbell increment for the given weight."""
    if weight <= 0:
        return 0.0
    if weight < 20:
        return 1.25
    if weight < 60:
        return 2.5
    return 5.0


def suggest_next_weight(
    exercise_name: str,
    history: list[HistoryItem],
    increment_override: float | None = None,
) -> NextWeightSuggestion:
    """Suggest a next-session weight for `exercise_name` from `history`.

    `history` is a list of (session_date, entry) pairs, any order — this
    function sorts it chronologically itself.
    """
    if not history:
        return NextWeightSuggestion(
            exercise_name=exercise_name,
            has_history=False,
            rationale="No prior logged sessions for this exercise yet — "
            "log one to start getting suggestions.",
        )

    ordered = sorted(history, key=lambda pair: (pair[0], pair[1].id or 0))
    last_date, latest = ordered[-1]

    # Bodyweight / no-weight movements: a "weight increase" is meaningless,
    # so we never suggest one — progression there comes from reps/sets,
    # which is outside the scope of this weight suggestion.
    if latest.weight <= 0:
        suggested_weight = latest.weight
        increment = 0.0
        rationale = (
            f"{exercise_name} is logged with no added weight, so this tool "
            "doesn't suggest a weight change — try adding reps or sets instead."
        )
    elif len(ordered) == 1:
        suggested_weight = latest.weight
        increment = 0.0
        rationale = (
            f"Only one logged session for {exercise_name} so far — repeat "
            f"{latest.weight} to confirm it's solid before increasing."
        )
    else:
        _, previous = ordered[-2]
        completed_full = latest.sets >= previous.sets and latest.reps >= previous.reps

        if completed_full:
            increment = (
                increment_override
                if increment_override is not None
                else default_increment(latest.weight)
            )
            suggested_weight = round(latest.weight + increment, 2)
            rationale = (
                f"Last session you completed {latest.sets} sets x {latest.reps} "
                f"reps at {latest.weight}, matching or beating the session "
                f"before it ({previous.sets}x{previous.reps} at "
                f"{previous.weight}) — try +{increment} next time."
            )
        else:
            suggested_weight = latest.weight
            increment = 0.0
            rationale = (
                f"Last session ({latest.sets}x{latest.reps} at {latest.weight}) "
                f"was below the prior best ({previous.sets}x{previous.reps} at "
                f"{previous.weight}) — repeat {latest.weight} and work back up "
                "to that target before increasing."
            )

    return NextWeightSuggestion(
        exercise_name=exercise_name,
        has_history=True,
        last_session_date=last_date,
        last_weight=latest.weight,
        last_reps=latest.reps,
        last_sets=latest.sets,
        suggested_weight=suggested_weight,
        increment=increment,
        rationale=rationale,
    )
