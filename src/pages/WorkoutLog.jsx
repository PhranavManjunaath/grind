import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, TrendingUp } from 'lucide-react';
import { workoutApi, ApiError } from '../api/client';
import {
  panelClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  iconButtonClass,
} from '../utils/ui';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyExercise = () => ({
  exercise_name: '',
  weight: '',
  reps: '',
  sets: '',
  rest_seconds: '',
  notes: '',
});

export default function WorkoutLog() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState([emptyExercise()]);
  const [submitting, setSubmitting] = useState(false);

  const [suggestName, setSuggestName] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  async function loadSessions() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterStart) params.start = filterStart;
      if (filterEnd) params.end = filterEnd;
      const page = await workoutApi.listSessions(params);
      setSessions(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load workout sessions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStart, filterEnd]);

  function updateExerciseField(index, field, value) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  }

  function addExerciseRow() {
    setExercises((prev) => [...prev, emptyExercise()]);
  }

  function removeExerciseRow(index) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitSession(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    const cleanExercises = exercises
      .filter((ex) => ex.exercise_name.trim())
      .map((ex) => ({
        exercise_name: ex.exercise_name.trim(),
        weight: Number(ex.weight) || 0,
        reps: Number(ex.reps),
        sets: Number(ex.sets),
        rest_seconds: ex.rest_seconds ? Number(ex.rest_seconds) : null,
        notes: ex.notes.trim() || null,
      }));

    setSubmitting(true);
    try {
      await workoutApi.createSession({ date, notes: notes.trim() || null, exercises: cleanExercises });
      setNotice('Session logged.');
      setDate(todayStr());
      setNotes('');
      setExercises([emptyExercise()]);
      loadSessions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save session.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSession(id) {
    if (!window.confirm('Delete this workout session and all its exercises?')) return;
    try {
      await workoutApi.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete session.');
    }
  }

  async function handleDeleteExercise(sessionId, exerciseId) {
    if (!window.confirm('Delete this exercise entry?')) return;
    try {
      await workoutApi.deleteExercise(exerciseId);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete exercise.');
    }
  }

  async function fetchSuggestion(e) {
    e.preventDefault();
    if (!suggestName.trim()) return;
    setSuggestLoading(true);
    setSuggestError('');
    setSuggestion(null);
    try {
      const result = await workoutApi.suggestion(suggestName.trim());
      setSuggestion(result);
    } catch (err) {
      setSuggestError(err instanceof ApiError ? err.message : 'Failed to get suggestion.');
    } finally {
      setSuggestLoading(false);
    }
  }

  const knownExerciseNames = Array.from(
    new Set(sessions.flatMap((s) => s.exercises.map((e) => e.exercise_name)))
  );

  return (
    <div className="px-3 sm:px-6 pb-10 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text pt-2">Workout Log</h1>

      {error && (
        <div className="text-xs text-week-4 bg-week-4/10 border border-week-4/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {notice && (
        <div className="text-xs text-good bg-good/10 border border-good/30 rounded-lg px-3 py-2">
          {notice}
        </div>
      )}

      <div className={panelClass}>
        <h2 className="text-sm font-semibold text-text mb-3">Log a Session</h2>
        <form onSubmit={submitSession} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Push day, felt strong"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Exercises</label>
            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-start">
                <input
                  placeholder="Exercise name"
                  value={ex.exercise_name}
                  onChange={(e) => updateExerciseField(i, 'exercise_name', e.target.value)}
                  list="known-exercises"
                  className={`${inputClass} col-span-2 sm:col-span-2`}
                />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Weight"
                  value={ex.weight}
                  onChange={(e) => updateExerciseField(i, 'weight', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Reps"
                  value={ex.reps}
                  onChange={(e) => updateExerciseField(i, 'reps', e.target.value)}
                  required
                  className={inputClass}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Sets"
                  value={ex.sets}
                  onChange={(e) => updateExerciseField(i, 'sets', e.target.value)}
                  required
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => removeExerciseRow(i)}
                  disabled={exercises.length === 1}
                  aria-label="Remove exercise row"
                  className={`${iconButtonClass} justify-self-start disabled:opacity-30`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <datalist id="known-exercises">
              {knownExerciseNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={addExerciseRow}
              className="self-start flex items-center gap-1 text-xs text-accent hover:text-week-6 transition-colors"
            >
              <Plus size={13} /> Add exercise
            </button>
          </div>

          <button type="submit" disabled={submitting} className={`${primaryButtonClass} self-start`}>
            {submitting ? 'Saving...' : 'Save Session'}
          </button>
        </form>
      </div>

      <div className={panelClass}>
        <h2 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <TrendingUp size={15} className="text-accent" /> Next-Session Weight Suggestion
        </h2>
        <form onSubmit={fetchSuggestion} className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className={labelClass}>Exercise</label>
            <input
              value={suggestName}
              onChange={(e) => setSuggestName(e.target.value)}
              list="known-exercises"
              placeholder="e.g. Bench Press"
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={suggestLoading} className={primaryButtonClass}>
            {suggestLoading ? 'Checking...' : 'Get Suggestion'}
          </button>
        </form>
        {suggestError && <p className="text-xs text-week-4 mt-2">{suggestError}</p>}
        {suggestion && (
          <div className="mt-3 bg-cell border border-cell-border rounded-lg p-3">
            {suggestion.has_history ? (
              <p className="text-sm text-text">
                Suggested next weight for <strong>{suggestion.exercise_name}</strong>:{' '}
                <span className="text-accent font-semibold">{suggestion.suggested_weight}</span>
              </p>
            ) : (
              <p className="text-sm text-text-muted">No history yet for {suggestion.exercise_name}.</p>
            )}
            <p className="text-xs text-text-dim mt-1">{suggestion.rationale}</p>
            <p className="text-[10px] text-text-dim mt-2 italic">
              A suggestion based on your own logs — not guaranteed coaching advice.
            </p>
          </div>
        )}
      </div>

      <div className={panelClass}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-text">History</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              className={`${inputClass} w-36`}
            />
            <span className="text-text-dim text-xs">to</span>
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              className={`${inputClass} w-36`}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-text-dim">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-text-dim">No workout sessions logged yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDeleteSession={() => handleDeleteSession(session.id)}
                onDeleteExercise={(exerciseId) => handleDeleteExercise(session.id, exerciseId)}
                onChanged={loadSessions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onDeleteSession, onDeleteExercise, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(session.date);
  const [notes, setNotes] = useState(session.notes || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await workoutApi.updateSession(session.id, { date, notes: notes.trim() || null });
      setEditing(false);
      onChanged();
    } catch {
      // surfaced via parent reload failing silently is acceptable here;
      // keep editing open so the user can retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-cell border border-cell-border rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} w-36`}
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className={`${inputClass} flex-1 min-w-[140px]`}
            />
            <button onClick={save} disabled={saving} className={iconButtonClass} aria-label="Save">
              <Check size={14} />
            </button>
            <button onClick={() => setEditing(false)} className={iconButtonClass} aria-label="Cancel edit">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-text">{session.date}</p>
            {session.notes && <p className="text-xs text-text-muted">{session.notes}</p>}
          </div>
        )}
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className={iconButtonClass} aria-label="Edit session">
              <Pencil size={13} />
            </button>
            <button onClick={onDeleteSession} className={iconButtonClass} aria-label="Delete session">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {session.exercises.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between text-xs text-text-muted">
            <span>
              <span className="text-text">{ex.exercise_name}</span> — {ex.sets} x {ex.reps}
              {ex.weight > 0 ? ` @ ${ex.weight}` : ''}
            </span>
            <button
              onClick={() => onDeleteExercise(ex.id)}
              aria-label={`Delete ${ex.exercise_name} entry`}
              className="text-text-dim hover:text-week-4 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
