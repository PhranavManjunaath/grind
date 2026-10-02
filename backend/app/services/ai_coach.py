"""AI workout coach: a thin, structured-output layer on top of the
objective progressive-overload engine (services/overload.py).

The AI is never the source of truth for workout history or math — it
only receives data the engine already computed and is instructed to
reason about it, never invent it. If AI_API_KEY is unset or the call
fails for any reason (network, timeout, bad response), every function
here degrades to `available=False` with a safe message instead of
raising, so the Workout page keeps working without it.
"""

import json
import os

import httpx

from ..schemas import AIExerciseRecommendation, AIWeeklySummary, ExerciseProgress

AI_API_KEY = os.getenv("AI_API_KEY")
AI_MODEL = os.getenv("AI_MODEL", "claude-haiku-4-5-20251001")
AI_API_URL = "https://api.anthropic.com/v1/messages"
REQUEST_TIMEOUT = 15.0

UNAVAILABLE_MESSAGE = "AI recommendation temporarily unavailable."


def _call_claude(system: str, user: str) -> str | None:
    if not AI_API_KEY:
        return None
    try:
        response = httpx.post(
            AI_API_URL,
            headers={
                "x-api-key": AI_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": AI_MODEL,
                "max_tokens": 600,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return None


def _extract_json(text: str) -> dict | None:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except ValueError:
        return None


_EXERCISE_SYSTEM = (
    "You are a cautious strength-training assistant. You are given one "
    "exercise's objectively-computed progression history and a baseline "
    "suggestion already calculated by the application. Use ONLY the data "
    "given — never invent sets, reps, weights, or sessions that are not "
    "in it. Respond with ONLY a single JSON object, no prose, matching "
    "exactly this shape: "
    '{"exercise": string, "recommended_weight": number or null, '
    '"target_reps": string, "target_sets": number or null, '
    '"recommendation": string, "reason": string}. '
    "Never recommend a weight decrease. Keep reason under 240 characters."
)

_WEEKLY_SYSTEM = (
    "You are a cautious strength-training assistant summarizing one "
    "week of training across multiple exercises, using ONLY the "
    "objectively-computed progression data given to you — never invent "
    "exercises or numbers not present in it. Respond with ONLY a single "
    "JSON object matching exactly this shape: "
    '{"improved": [string], "stable": [string], "declined": [string], '
    '"ready_for_progression": [string], "maintain_weight": [string], '
    '"needs_attention": [string], "focus_next_week": string}. '
    "Keep focus_next_week under 300 characters."
)


def get_exercise_recommendation(progress: ExerciseProgress) -> AIExerciseRecommendation:
    payload = {
        "exercise_name": progress.exercise_name,
        "history": [p.model_dump() for p in progress.history],
        "trend": progress.trend,
        "baseline_suggestion": progress.basic_suggestion.model_dump(),
    }
    text = _call_claude(_EXERCISE_SYSTEM, json.dumps(payload))
    if text is None:
        return AIExerciseRecommendation(
            exercise=progress.exercise_name,
            recommended_weight=progress.basic_suggestion.suggested_weight,
            target_reps="-",
            target_sets=progress.basic_suggestion.last_sets,
            recommendation="Using the baseline calculation instead.",
            reason=progress.basic_suggestion.rationale,
            available=False,
        )

    parsed = _extract_json(text)
    if parsed is None:
        return AIExerciseRecommendation(
            exercise=progress.exercise_name,
            recommended_weight=progress.basic_suggestion.suggested_weight,
            target_reps="-",
            target_sets=progress.basic_suggestion.last_sets,
            recommendation="Using the baseline calculation instead.",
            reason="The AI response couldn't be parsed.",
            available=False,
        )

    try:
        return AIExerciseRecommendation(**parsed, available=True)
    except TypeError:
        return AIExerciseRecommendation(
            exercise=progress.exercise_name,
            recommended_weight=progress.basic_suggestion.suggested_weight,
            target_reps="-",
            target_sets=progress.basic_suggestion.last_sets,
            recommendation="Using the baseline calculation instead.",
            reason="The AI response was malformed.",
            available=False,
        )


def get_weekly_summary(progresses: list[ExerciseProgress]) -> AIWeeklySummary:
    if not progresses:
        return AIWeeklySummary(
            available=False, message="No exercises logged this week yet."
        )

    payload = [
        {
            "exercise_name": p.exercise_name,
            "trend": p.trend,
            "history": [point.model_dump() for point in p.history],
        }
        for p in progresses
    ]
    text = _call_claude(_WEEKLY_SYSTEM, json.dumps(payload))
    if text is None:
        return AIWeeklySummary(available=False, message=UNAVAILABLE_MESSAGE)

    parsed = _extract_json(text)
    if parsed is None:
        return AIWeeklySummary(available=False, message=UNAVAILABLE_MESSAGE)

    try:
        return AIWeeklySummary(**parsed, available=True)
    except TypeError:
        return AIWeeklySummary(available=False, message=UNAVAILABLE_MESSAGE)
