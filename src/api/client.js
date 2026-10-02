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
    throw new ApiError(
      'Could not reach the backend API. Is it running?',
      0
    );
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
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ---------- Workouts ----------

export const workoutApi = {
  listSessions: (params) => request(`/api/workouts/sessions${qs(params)}`),
  getSession: (id) => request(`/api/workouts/sessions/${id}`),
  createSession: (payload) =>
    request('/api/workouts/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  updateSession: (id, payload) =>
    request(`/api/workouts/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSession: (id) => request(`/api/workouts/sessions/${id}`, { method: 'DELETE' }),
  addExercise: (sessionId, payload) =>
    request(`/api/workouts/sessions/${sessionId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateExercise: (id, payload) =>
    request(`/api/workouts/exercises/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteExercise: (id) => request(`/api/workouts/exercises/${id}`, { method: 'DELETE' }),
  exerciseHistory: (exerciseName, limit) =>
    request(`/api/workouts/exercises/history${qs({ exercise_name: exerciseName, limit })}`),
  suggestion: (exerciseName, increment) =>
    request(`/api/workouts/suggestions${qs({ exercise_name: exerciseName, increment })}`),
};

// ---------- Food ----------

export const foodApi = {
  listEntries: (params) => request(`/api/food/entries${qs(params)}`),
  createEntry: (payload) =>
    request('/api/food/entries', { method: 'POST', body: JSON.stringify(payload) }),
  updateEntry: (id, payload) =>
    request(`/api/food/entries/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEntry: (id) => request(`/api/food/entries/${id}`, { method: 'DELETE' }),
  dailyTotals: (params) => request(`/api/food/entries/daily-totals/list${qs(params)}`),
  listSaved: () => request('/api/food/saved'),
  createSaved: (payload) =>
    request('/api/food/saved', { method: 'POST', body: JSON.stringify(payload) }),
  updateSaved: (id, payload) =>
    request(`/api/food/saved/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSaved: (id) => request(`/api/food/saved/${id}`, { method: 'DELETE' }),
};

// ---------- Skills ----------

export const skillsApi = {
  listEntries: (params) => request(`/api/skills/entries${qs(params)}`),
  createEntry: (payload) =>
    request('/api/skills/entries', { method: 'POST', body: JSON.stringify(payload) }),
  updateEntry: (id, payload) =>
    request(`/api/skills/entries/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEntry: (id) => request(`/api/skills/entries/${id}`, { method: 'DELETE' }),
};

// ---------- Analytics ----------

export const analyticsApi = {
  weekly: (params) => request(`/api/analytics/weekly${qs(params)}`),
};
