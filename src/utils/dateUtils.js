const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function monthLabel(year, month) {
  return MONTH_NAMES[month];
}

export function monthYearLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

// Buckets the days of a month into calendar weeks (Mon-Sun aligned by
// simple 7-day chunks starting at day 1, matching the reference's
// "Week 1 / Week 2 / ..." banded header rather than a Sun-Sat grid).
export function getWeekBuckets(year, month) {
  const total = daysInMonth(year, month);
  const buckets = [];
  let day = 1;
  let weekIndex = 0;
  while (day <= total) {
    const start = day;
    const end = Math.min(day + 6, total);
    const days = [];
    for (let d = start; d <= end; d++) {
      days.push(d);
    }
    buckets.push({
      weekNumber: weekIndex + 1,
      days,
    });
    day = end + 1;
    weekIndex++;
  }
  return buckets;
}

export function getAllDays(year, month) {
  const total = daysInMonth(year, month);
  return Array.from({ length: total }, (_, i) => i + 1);
}

export function isToday(year, month, day) {
  const now = new Date();
  return (
    now.getFullYear() === year &&
    now.getMonth() === month &&
    now.getDate() === day
  );
}

export function isFutureDate(year, month, day) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(year, month, day);
  return target > now;
}

export function formatFullDate(year, month, day) {
  const d = new Date(year, month, day);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function shortDayLabel(day) {
  return String(day).padStart(2, '0');
}

export const WEEK_COLOR_KEYS = ['week-1', 'week-2', 'week-3', 'week-4', 'week-5', 'week-6'];
