import { daysInMonth, formatDateKey } from './dateUtils';

const STORAGE_KEY = 'habit-tracker-data';

export const HABIT_COLORS = [
  '#a78bfa', '#60a5fa', '#2dd4bf', '#f472b6', '#4ade80',
  '#fbbf24', '#fb923c', '#38bdf8', '#e879f9', '#facc15',
];

const DEMO_HABIT_NAMES = [
  'Wake Up Early',
  'Drink 2L Water',
  'Workout',
  'Read 10 Pages',
  'Study',
  'Walk 8K Steps',
  'No Junk Food',
  'Sleep Before 11',
  'Meditation',
  'Skin Care',
];

function uid() {
  return `habit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Seeds realistic-looking completion data (weighted random, denser toward
// "now" and skewed per-habit so some habits look stronger than others).
function generateDemoCompletions(year, month, weight) {
  const total = daysInMonth(year, month);
  const now = new Date();
  const completions = {};
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month, d);
    if (date > now) continue;
    const key = formatDateKey(year, month, d);
    completions[key] = Math.random() < weight;
  }
  return completions;
}

export function createDemoHabits(year, month) {
  const weights = [0.78, 0.7, 0.85, 0.6, 0.72, 0.65, 0.55, 0.8, 0.68, 0.9];
  return DEMO_HABIT_NAMES.map((name, i) => ({
    id: uid(),
    name,
    color: HABIT_COLORS[i % HABIT_COLORS.length],
    goal: '',
    completions: generateDemoCompletions(year, month, weights[i] ?? 0.7),
  }));
}

const MENTAL_STATE_NAMES = ['Mood Check-in', 'Motivation Check-in'];
const MENTAL_STATE_COLORS = ['#a78bfa', '#fbbf24'];

export function createDemoMentalState(year, month) {
  return MENTAL_STATE_NAMES.map((name, i) => ({
    id: uid(),
    name,
    color: MENTAL_STATE_COLORS[i],
    goal: '',
    completions: generateDemoCompletions(year, month, i === 0 ? 0.74 : 0.62),
  }));
}

// Generates a smooth-ish daily mood/energy/motivation series (1-10) for
// the "Mental State" wavy line chart, seeded per-month so it's stable.
export function generateMentalStateSeries(year, month) {
  const total = daysInMonth(year, month);
  const now = new Date();
  const series = [];
  let mood = 6;
  let energy = 6;
  let motivation = 6;
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month, d);
    if (date > now) break;
    mood = clamp(mood + (Math.random() - 0.5) * 2.2, 2, 10);
    energy = clamp(energy + (Math.random() - 0.5) * 2.2, 2, 10);
    motivation = clamp(motivation + (Math.random() - 0.5) * 2.2, 2, 10);
    series.push({
      day: d,
      mood: Math.round(mood * 10) / 10,
      energy: Math.round(energy * 10) / 10,
      motivation: Math.round(motivation * 10) / 10,
    });
  }
  return series;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function createHabit(name, color, goal) {
  return {
    id: uid(),
    name,
    color,
    goal: goal || '',
    completions: {},
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.habits)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private browsing, quota) — fail silently
  }
}

export function clearData() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `habit-tracker-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importDataFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.habits)) {
          reject(new Error('Invalid file format'));
          return;
        }
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
