from collections import defaultdict
from datetime import date as date_type

from ..models import FoodEntry
from ..schemas import DailyFoodTotal


def daily_totals(entries: list[FoodEntry]) -> list[DailyFoodTotal]:
    """Group food entries by date and sum calories/macros.

    Only dates that actually have a logged entry appear in the result —
    callers must not treat a missing date as zero, since that would
    misrepresent an unlogged day as a zero-calorie day.
    """
    buckets: dict[date_type, list[FoodEntry]] = defaultdict(list)
    for entry in entries:
        buckets[entry.date].append(entry)

    totals = []
    for day in sorted(buckets.keys()):
        day_entries = buckets[day]
        totals.append(
            DailyFoodTotal(
                date=day,
                calories=round(sum(e.calories for e in day_entries), 2),
                protein=round(sum(e.protein or 0 for e in day_entries), 2),
                carbs=round(sum(e.carbs or 0 for e in day_entries), 2),
                fat=round(sum(e.fat or 0 for e in day_entries), 2),
                entry_count=len(day_entries),
            )
        )
    return totals
