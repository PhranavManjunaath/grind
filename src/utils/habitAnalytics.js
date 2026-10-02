import { daysInMonth, formatDateKey, getWeekBuckets, isFutureDate } from './dateUtils';

export function isComplete(habit, dateKey) {
  return !!habit.completions[dateKey];
}

// Total habits actually trackable up to today (excludes future days) so
// percentages don't get dragged down by days that haven't happened yet.
function trackableDayCount(year, month) {
  const total = daysInMonth(year, month);
  let count = 0;
  for (let d = 1; d <= total; d++) {
    if (!isFutureDate(year, month, d)) count++;
  }
  return count;
}

export function habitCompletionCount(habit, year, month) {
  const total = daysInMonth(year, month);
  let count = 0;
  for (let d = 1; d <= total; d++) {
    const key = formatDateKey(year, month, d);
    if (habit.completions[key]) count++;
  }
  return count;
}

export function habitCompletionPercent(habit, year, month) {
  const trackable = trackableDayCount(year, month);
  if (trackable === 0) return 0;
  const completed = habitCompletionCount(habit, year, month);
  return Math.round((completed / trackable) * 1000) / 10;
}

export function overallStats(habits, year, month) {
  const trackable = trackableDayCount(year, month);
  const totalPossible = habits.length * trackable;
  let totalCompleted = 0;
  habits.forEach((h) => {
    totalCompleted += habitCompletionCount(h, year, month);
  });
  const progressPercent = totalPossible === 0 ? 0 : (totalCompleted / totalPossible) * 100;
  return {
    numberOfHabits: habits.length,
    completedHabits: totalCompleted,
    progressPercent: Math.round(progressPercent * 10) / 10,
  };
}

export function dailyCompletionSeries(habits, year, month) {
  const total = daysInMonth(year, month);
  const series = [];
  for (let d = 1; d <= total; d++) {
    if (isFutureDate(year, month, d)) continue;
    const key = formatDateKey(year, month, d);
    if (habits.length === 0) {
      series.push({ day: d, date: key, percent: 0 });
      continue;
    }
    const completed = habits.filter((h) => h.completions[key]).length;
    const percent = Math.round((completed / habits.length) * 1000) / 10;
    series.push({ day: d, date: key, percent });
  }
  return series;
}

export function weeklyCompletionStats(habits, year, month) {
  const buckets = getWeekBuckets(year, month);
  return buckets.map((bucket) => {
    let totalPossible = 0;
    let totalCompleted = 0;
    bucket.days.forEach((d) => {
      if (isFutureDate(year, month, d)) return;
      const key = formatDateKey(year, month, d);
      habits.forEach((h) => {
        totalPossible++;
        if (h.completions[key]) totalCompleted++;
      });
    });
    const percent = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 1000) / 10;
    return { weekNumber: bucket.weekNumber, days: bucket.days, percent };
  });
}

export function habitRanking(habits, year, month) {
  return habits
    .map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      percent: habitCompletionPercent(h, year, month),
      completed: habitCompletionCount(h, year, month),
    }))
    .sort((a, b) => b.percent - a.percent);
}

export function bestAndWorstHabit(habits, year, month) {
  const ranked = habitRanking(habits, year, month);
  if (ranked.length === 0) return { best: null, worst: null };
  return { best: ranked[0], worst: ranked[ranked.length - 1] };
}

export function currentStreak(habit, year, month) {
  const total = daysInMonth(year, month);
  const now = new Date();
  let startDay = total;
  if (now.getFullYear() === year && now.getMonth() === month) {
    startDay = now.getDate();
  } else if (isFutureDate(year, month, 1)) {
    return 0;
  }
  let streak = 0;
  for (let d = startDay; d >= 1; d--) {
    const key = formatDateKey(year, month, d);
    if (habit.completions[key]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function longestStreak(habit, year, month) {
  const total = daysInMonth(year, month);
  let longest = 0;
  let running = 0;
  for (let d = 1; d <= total; d++) {
    const key = formatDateKey(year, month, d);
    if (habit.completions[key]) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }
  return longest;
}

export function colorForPercent(percent) {
  if (percent >= 80) return 'var(--color-good)';
  if (percent >= 50) return 'var(--color-mid)';
  return 'var(--color-low)';
}

// ---- Arbitrary date-range helpers (used by the unified Analytics page) ----
// These are additive and don't change the month-based functions above,
// which the existing Habit Tracker dashboard keeps using unchanged.

function dateRangeKeys(startStr, endStr) {
  const keys = [];
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d > today) break;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    keys.push(`${y}-${m}-${day}`);
  }
  return keys;
}

export function habitRangeCompletion(habits, startStr, endStr) {
  const dateKeys = dateRangeKeys(startStr, endStr);
  if (dateKeys.length === 0 || habits.length === 0) {
    return { trackableDays: dateKeys.length, completed: 0, possible: 0, percent: 0 };
  }
  let completed = 0;
  dateKeys.forEach((key) => {
    habits.forEach((h) => {
      if (h.completions[key]) completed++;
    });
  });
  const possible = dateKeys.length * habits.length;
  return {
    trackableDays: dateKeys.length,
    completed,
    possible,
    percent: possible === 0 ? 0 : Math.round((completed / possible) * 1000) / 10,
  };
}
