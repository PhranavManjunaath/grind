import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { workoutApi, ApiError } from '../api/client';
import {
  panelClass,
  inputClass,
  primaryButtonClass,
  iconButtonClass,
} from '../utils/ui';

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TREND_ICON = {
  improving: <TrendingUp size={13} className="text-good" />,
  declining: <TrendingDown size={13} className="text-week-4" />,
  stable: <Minus size={13} className="text-text-dim" />,
  insufficient_data: null,
};

export default function WorkoutLog() {
  const [split, setSplit] = useState([]);
  const [weekNumber, setWeekNumber] = useState(null);
  const [weekView, setWeekView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function loadSplit() {
    try {
      setSplit(await workoutApi.getSplit());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load workout split.');
    }
  }

  async function loadWeek(wn) {
    setLoading(true);
    setError('');
    try {
      setWeekView(await workoutApi.getWeek(wn));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load week.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSplit();
    workoutApi
      .currentWeekNumber()
      .then((r) => setWeekNumber(r.week_number))
      .catch(() => setWeekNumber(1));
  }, []);

  useEffect(() => {
    if (weekNumber != null) {
      loadWeek(weekNumber);
      setAiSummary(null);
    }
  }, [weekNumber]);

  function logForDay(splitDayId) {
    return weekView?.days.find((d) => d.split_day_id === splitDayId) || null;
  }

  async function startDay(splitDayId) {
    setError('');
    try {
      await workoutApi.createWeekLog({ week_number: weekNumber, split_day_id: splitDayId, exercises: [] });
      loadWeek(weekNumber);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start day.');
    }
  }

  async function copyPreviousWeek(splitDayId) {
    if (weekNumber <= 1) return;
    setError('');
    try {
      const prevView = await workoutApi.getWeek(weekNumber - 1);
      const prevLog = prevView.days.find((d) => d.split_day_id === splitDayId);
      if (!prevLog) {
        setError('No log for this day in the previous week to copy.');
        return;
      }
      await workoutApi.copyWeekForward(prevLog.id, weekNumber);
      setNotice('Copied previous week into this week.');
      loadWeek(weekNumber);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to copy previous week.');
    }
  }

  async function runAiSummary() {
    setAiLoading(true);
    setAiSummary(null);
    try {
      setAiSummary(await workoutApi.aiWeeklySummary(weekNumber));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to get AI summary.');
    } finally {
      setAiLoading(false);
    }
  }

  const orderedDays = [...split].sort((a, b) => a.weekday - b.weekday);

  return (
    <div className="px-3 sm:px-6 pb-10 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <h1 className="text-xl font-semibold text-text">Workout</h1>
        <div className="flex items-center gap-2 bg-panel border border-panel-border rounded-full px-2 py-1">
          <button
            onClick={() => setWeekNumber((w) => Math.max(1, w - 1))}
            disabled={weekNumber <= 1}
            className="p-1 rounded-full text-text-muted hover:text-text disabled:opacity-30"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text px-2">Week {weekNumber ?? '...'}</span>
          <button
            onClick={() => setWeekNumber((w) => w + 1)}
            className="p-1 rounded-full text-text-muted hover:text-text"
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {weekView && (
        <p className="text-xs text-text-dim -mt-2">
          {weekView.range_start} to {weekView.range_end}
        </p>
      )}

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

      {split.length === 0 ? (
        <div className={panelClass}>
          <p className="text-sm text-text-muted">
            No workout split configured yet. Set up your recurring weekly split in Settings
            (e.g. Monday = Chest + Triceps + Shoulders) to start logging.
          </p>
        </div>
      ) : loading ? (
        <div className={panelClass}>
          <p className="text-xs text-text-dim">Loading week...</p>
        </div>
      ) : (
        orderedDays.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            log={logForDay(day.id)}
            weekNumber={weekNumber}
            onStartDay={() => startDay(day.id)}
            onCopyPrevious={() => copyPreviousWeek(day.id)}
            onChanged={() => loadWeek(weekNumber)}
            onError={setError}
          />
        ))
      )}

      {split.length > 0 && (
        <div className={panelClass}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <Sparkles size={15} className="text-accent" /> AI Coach
            </h2>
            <button onClick={runAiSummary} disabled={aiLoading} className={primaryButtonClass}>
              {aiLoading ? 'Analyzing...' : 'Analyze Week'}
            </button>
          </div>
          {aiSummary && !aiSummary.available && (
            <p className="text-xs text-text-dim">
              {aiSummary.message || 'AI recommendation temporarily unavailable.'}
            </p>
          )}
          {aiSummary && aiSummary.available && (
            <div className="flex flex-col gap-2 text-xs">
              <SummaryRow label="Improved" items={aiSummary.improved} color="text-good" />
              <SummaryRow label="Stable" items={aiSummary.stable} color="text-text-muted" />
              <SummaryRow label="Declined" items={aiSummary.declined} color="text-week-4" />
              <SummaryRow label="Ready to progress" items={aiSummary.ready_for_progression} color="text-accent" />
              <SummaryRow label="Maintain weight" items={aiSummary.maintain_weight} color="text-week-2" />
              <SummaryRow label="Needs attention" items={aiSummary.needs_attention} color="text-week-4" />
              {aiSummary.focus_next_week && (
                <p className="text-text-muted mt-1">
                  <span className="text-text font-medium">Focus next week: </span>
                  {aiSummary.focus_next_week}
                </p>
              )}
              <p className="text-[10px] text-text-dim italic mt-1">{aiSummary.safety_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <p>
      <span className={`font-medium ${color}`}>{label}: </span>
      <span className="text-text-muted">{items.join(', ')}</span>
    </p>
  );
}

function DayCard({ day, log, weekNumber, onStartDay, onCopyPrevious, onChanged, onError }) {
  const [adding, setAdding] = useState(false);
  const [newExercise, setNewExercise] = useState({ exercise_name: '', weight: '', reps: '', sets: '', notes: '' });

  async function submitNewExercise(e) {
    e.preventDefault();
    if (!newExercise.exercise_name.trim()) return;
    try {
      await workoutApi.addExercise(log.id, {
        exercise_name: newExercise.exercise_name.trim(),
        weight: Number(newExercise.weight) || 0,
        reps: Number(newExercise.reps) || 0,
        sets: Number(newExercise.sets) || 0,
        notes: newExercise.notes.trim() || null,
      });
      setNewExercise({ exercise_name: '', weight: '', reps: '', sets: '', notes: '' });
      setAdding(false);
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to add exercise.');
    }
  }

  async function deleteExercise(id) {
    if (!window.confirm('Delete this exercise entry?')) return;
    try {
      await workoutApi.deleteExercise(id);
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to delete exercise.');
    }
  }

  return (
    <div className={panelClass}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-text">{WEEKDAY_NAMES[day.weekday]}</h2>
          <p className="text-xs text-text-dim">{day.label}</p>
        </div>
        {!log && (
          <div className="flex gap-2">
            {weekNumber > 1 && (
              <button
                onClick={onCopyPrevious}
                className="flex items-center gap-1 text-xs text-week-2 hover:brightness-110"
              >
                <Copy size={12} /> Copy previous week
              </button>
            )}
            <button onClick={onStartDay} className="flex items-center gap-1 text-xs text-accent hover:text-week-6">
              <Plus size={13} /> Start Day
            </button>
          </div>
        )}
      </div>

      {log && (
        <>
          <div className="flex flex-col gap-1.5">
            {log.exercises.map((ex) => (
              <ExerciseRow key={ex.id} exercise={ex} onDelete={() => deleteExercise(ex.id)} onChanged={onChanged} onError={onError} />
            ))}
            {log.exercises.length === 0 && (
              <p className="text-xs text-text-dim">No exercises logged for this day yet.</p>
            )}
          </div>

          {adding ? (
            <form onSubmit={submitNewExercise} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 items-start">
              <input
                autoFocus
                placeholder="Exercise name"
                value={newExercise.exercise_name}
                onChange={(e) => setNewExercise((f) => ({ ...f, exercise_name: e.target.value }))}
                className={`${inputClass} col-span-2`}
              />
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Weight"
                value={newExercise.weight}
                onChange={(e) => setNewExercise((f) => ({ ...f, weight: e.target.value }))}
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                placeholder="Reps"
                value={newExercise.reps}
                onChange={(e) => setNewExercise((f) => ({ ...f, reps: e.target.value }))}
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                placeholder="Sets"
                value={newExercise.sets}
                onChange={(e) => setNewExercise((f) => ({ ...f, sets: e.target.value }))}
                className={inputClass}
              />
              <div className="col-span-2 sm:col-span-5 flex gap-2">
                <button type="submit" className={primaryButtonClass}>
                  Save
                </button>
                <button type="button" onClick={() => setAdding(false)} className={iconButtonClass}>
                  <X size={14} />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-3 flex items-center gap-1 text-xs text-accent hover:text-week-6"
            >
              <Plus size={13} /> Add Exercise
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ExerciseRow({ exercise, onDelete, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ weight: exercise.weight, reps: exercise.reps, sets: exercise.sets });
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [aiRec, setAiRec] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await workoutApi.updateExercise(exercise.id, {
        weight: Number(form.weight),
        reps: Number(form.reps),
        sets: Number(form.sets),
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to update exercise.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleProgress() {
    if (!showProgress && !progress) {
      try {
        setProgress(await workoutApi.exerciseProgress(exercise.exercise_name));
      } catch {
        // surfaced as empty state below
      }
    }
    setShowProgress((v) => !v);
  }

  async function getAiRec() {
    setAiLoading(true);
    setAiRec(null);
    try {
      setAiRec(await workoutApi.aiRecommendation(exercise.exercise_name));
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to get AI recommendation.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="bg-cell border border-cell-border rounded-lg px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-text flex-1 truncate">{exercise.exercise_name}</span>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              style={{ width: '4rem' }}
              className={`${inputClass} py-1`}
            />
            <input
              type="number"
              value={form.reps}
              onChange={(e) => setForm((f) => ({ ...f, reps: e.target.value }))}
              style={{ width: '3.5rem' }}
              className={`${inputClass} py-1`}
            />
            <input
              type="number"
              value={form.sets}
              onChange={(e) => setForm((f) => ({ ...f, sets: e.target.value }))}
              style={{ width: '3.5rem' }}
              className={`${inputClass} py-1`}
            />
            <button onClick={save} disabled={saving} className={iconButtonClass} aria-label="Save">
              <Check size={13} />
            </button>
            <button onClick={() => setEditing(false)} className={iconButtonClass} aria-label="Cancel">
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-muted tabular-nums">
              {exercise.weight > 0 ? `${exercise.weight} kg × ` : ''}
              {exercise.reps} reps × {exercise.sets} sets
            </span>
            <button onClick={() => setEditing(true)} className={iconButtonClass} aria-label={`Edit ${exercise.exercise_name}`}>
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className={iconButtonClass} aria-label={`Delete ${exercise.exercise_name}`}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-1.5">
        <button onClick={toggleProgress} className="text-[10px] text-text-dim hover:text-text-muted underline-offset-2 hover:underline">
          {showProgress ? 'Hide progress' : 'Compare with history'}
        </button>
        <button onClick={getAiRec} disabled={aiLoading} className="text-[10px] text-accent hover:text-week-6">
          {aiLoading ? 'Asking AI...' : 'Why? (AI suggestion)'}
        </button>
        {progress && TREND_ICON[progress.trend]}
      </div>

      {showProgress && progress && (
        <div className="mt-2 text-xs text-text-muted bg-panel-soft rounded-lg p-2">
          {progress.history.length === 0 ? (
            <p>No prior history.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {progress.history.map((p) => (
                <div key={p.week_number} className="flex justify-between tabular-nums">
                  <span>Week {p.week_number}</span>
                  <span>
                    {p.weight} kg × {p.reps} × {p.sets} ({p.volume} vol)
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-1 text-[10px] text-text-dim">{progress.basic_suggestion.rationale}</p>
        </div>
      )}

      {aiRec && (
        <div className="mt-2 text-xs bg-panel-soft rounded-lg p-2">
          <p className="text-text">
            {aiRec.available ? (
              <>
                <span className="text-accent font-semibold">
                  {aiRec.recommended_weight != null ? `${aiRec.recommended_weight} kg × ` : ''}
                  {aiRec.target_reps}
                  {aiRec.target_sets ? ` × ${aiRec.target_sets}` : ''}
                </span>{' '}
                — {aiRec.recommendation}
              </>
            ) : (
              <span className="text-text-dim">AI recommendation temporarily unavailable — using baseline calculation.</span>
            )}
          </p>
          <p className="text-[10px] text-text-dim mt-1">{aiRec.reason}</p>
        </div>
      )}
    </div>
  );
}
