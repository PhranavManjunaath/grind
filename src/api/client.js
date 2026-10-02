const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError('Could not reach the backend API. Is it running?', 0);
  }

  if (response.status === 204) return null;

  let body = null;
  try {
    body = await response.json();
  } catch {
    // no JSON body
  }

  if (!response.ok) {
    const detail = body?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join('; ')
      : detail || `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return body;
}

function qs(params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ---------- Workout ----------

export const workoutApi = {
  getSplit: () => request('/api/workout/split'),
  updateSplit: (days) =>
    request('/api/workout/split', { method: 'PUT', body: JSON.stringify({ days }) }),

  currentWeekNumber: () => request('/api/workout/weeks/current'),
  getWeek: (weekNumber) => request(`/api/workout/weeks/${weekNumber}`),
  createWeekLog: (payload) =>
    request('/api/workout/weeks', { method: 'POST', body: JSON.stringify(payload) }),
  updateWeekLog: (logId, payload) =>
    request(`/api/workout/weeks/${logId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  copyWeekForward: (logId, targetWeekNumber) =>
    request(`/api/workout/weeks/${logId}/copy-forward${qs({ target_week_number: targetWeekNumber })}`, {
      method: 'POST',
    }),

  addExercise: (logId, payload) =>
    request(`/api/workout/weeks/${logId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateExercise: (id, payload) =>
    request(`/api/workout/exercises/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteExercise: (id) => request(`/api/workout/exercises/${id}`, { method: 'DELETE' }),

  exerciseProgress: (exerciseName) =>
    request(`/api/workout/progress/${encodeURIComponent(exerciseName)}`),
  aiRecommendation: (exerciseName) =>
    request(`/api/workout/ai-recommendation${qs({ exercise_name: exerciseName })}`, {
      method: 'POST',
    }),
  aiWeeklySummary: (weekNumber) =>
    request(`/api/workout/ai-weekly-summary${qs({ week_number: weekNumber })}`),
};

// ---------- Food ----------

export const foodApi = {
  listEntries: (params) => request(`/api/food${qs(params)}`),
  createEntry: (payload) =>
    request('/api/food', { method: 'POST', body: JSON.stringify(payload) }),
  updateEntry: (id, payload) =>
    request(`/api/food/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEntry: (id) => request(`/api/food/${id}`, { method: 'DELETE' }),
  dailyTotals: (params) => request(`/api/food/daily-totals${qs(params)}`),
  listSaved: () => request('/api/food/saved'),
  createSaved: (payload) =>
    request('/api/food/saved', { method: 'POST', body: JSON.stringify(payload) }),
  updateSaved: (id, payload) =>
    request(`/api/food/saved/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSaved: (id) => request(`/api/food/saved/${id}`, { method: 'DELETE' }),
};

// ---------- Skills ----------

export const skillsApi = {
  listEntries: (params) => request(`/api/skills${qs(params)}`),
  createEntry: (payload) =>
    request('/api/skills', { method: 'POST', body: JSON.stringify(payload) }),
  updateEntry: (id, payload) =>
    request(`/api/skills/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEntry: (id) => request(`/api/skills/${id}`, { method: 'DELETE' }),
};

// ---------- Analytics ----------

export const analyticsApi = {
  currentWeekNumber: () => request('/api/analytics/week/current/number'),
  week: (weekNumber) => request(`/api/analytics/week/${weekNumber}`),
};

// ---------- Settings ----------

export const settingsApi = {
  get: () => request('/api/settings'),
  update: (payload) =>
    request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
};
