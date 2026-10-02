import { useEffect, useState } from 'react';
import { Trash2, Pencil, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { skillsApi, workoutApi, ApiError } from '../api/client';
import { panelClass, inputClass, labelClass, primaryButtonClass, iconButtonClass } from '../utils/ui';

const emptyForm = (week) => ({
  week_number: week,
  skill_name: '',
  category: '',
  hours_spent: '',
  progress: '',
  confidence: 5,
  notes: '',
});

export default function SkillsLog() {
  const [weekNumber, setWeekNumber] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    workoutApi
      .currentWeekNumber()
      .then((r) => setWeekNumber(r.week_number))
      .catch(() => setWeekNumber(1));
  }, []);

  async function loadEntries(wn) {
    setLoading(true);
    setError('');
    try {
      const page = await skillsApi.listEntries({ week_number: wn, limit: 100 });
      setEntries(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load skill entries.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (weekNumber != null) {
      loadEntries(weekNumber);
      setForm(emptyForm(weekNumber));
    }
  }, [weekNumber]);

  async function submitEntry(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await skillsApi.createEntry({
        week_number: weekNumber,
        skill_name: form.skill_name.trim(),
        category: form.category.trim() || null,
        hours_spent: Number(form.hours_spent),
        progress: form.progress.trim() || null,
        confidence: Number(form.confidence),
        notes: form.notes.trim() || null,
      });
      setNotice('Skill entry logged.');
      setForm(emptyForm(weekNumber));
      loadEntries(weekNumber);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this skill entry?')) return;
    try {
      await skillsApi.deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete entry.');
    }
  }

  if (form === null) return null;

  return (
    <div className="px-3 sm:px-6 pb-10 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <h1 className="text-xl font-semibold text-text">Skills</h1>
        <div className="flex items-center gap-2 bg-panel border border-panel-border rounded-full px-2 py-1">
          <button
            onClick={() => setWeekNumber((w) => Math.max(1, w - 1))}
            disabled={weekNumber <= 1}
            className="p-1 rounded-full text-text-muted hover:text-text disabled:opacity-30"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text px-2">Week {weekNumber}</span>
          <button
            onClick={() => setWeekNumber((w) => w + 1)}
            className="p-1 rounded-full text-text-muted hover:text-text"
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <p className="text-xs text-text-dim -mt-2">
        Time is tracked in hours. Confidence/progress is a 1 (just starting) to 10 (confident) scale.
      </p>

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
        <h2 className="text-sm font-semibold text-text mb-3">Log Practice — Week {weekNumber}</h2>
        <form onSubmit={submitEntry} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Skill</label>
            <input
              required
              value={form.skill_name}
              onChange={(e) => setForm((f) => ({ ...f, skill_name: e.target.value }))}
              placeholder="e.g. FastAPI"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Category (optional)</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Backend"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Hours spent</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              required
              value={form.hours_spent}
              onChange={(e) => setForm((f) => ({ ...f, hours_spent: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Progress (optional)</label>
            <input
              value={form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))}
              placeholder="e.g. Beginner -> Intermediate"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Confidence / progress (1-10)</label>
            <input
              type="range"
              min="1"
              max="10"
              value={form.confidence}
              onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value }))}
              className="w-full"
            />
            <div className="text-xs text-text-muted text-center">{form.confidence} / 10</div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes (optional)</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={submitting} className={`${primaryButtonClass} self-start w-fit`}>
            {submitting ? 'Saving...' : 'Log Entry'}
          </button>
        </form>
      </div>

      <div className={panelClass}>
        <h2 className="text-sm font-semibold text-text mb-3">Week {weekNumber} Entries</h2>
        {loading ? (
          <p className="text-xs text-text-dim">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-text-dim">No skills logged for this week yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <SkillRow key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} onChanged={() => loadEntries(weekNumber)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillRow({ entry, onDelete, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [confidence, setConfidence] = useState(entry.confidence);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await skillsApi.updateEntry(entry.id, { confidence: Number(confidence) });
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between bg-cell border border-cell-border rounded-lg px-3 py-2 text-sm">
      <div>
        <span className="text-text">{entry.skill_name}</span>
        {entry.category && <span className="text-text-dim text-xs ml-2">({entry.category})</span>}
        <span className="text-text-dim text-xs ml-2">{entry.hours_spent}h</span>
        {entry.progress && <span className="text-text-dim text-xs ml-2">{entry.progress}</span>}
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="number"
              min="1"
              max="10"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              style={{ width: '4rem' }}
              className={`${inputClass} py-1`}
            />
            <button onClick={save} disabled={saving} className={iconButtonClass} aria-label="Save confidence">
              <Check size={13} />
            </button>
            <button onClick={() => setEditing(false)} className={iconButtonClass} aria-label="Cancel edit">
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <span className="text-text-muted text-xs">Confidence {entry.confidence}/10</span>
            <button onClick={() => setEditing(true)} className={iconButtonClass} aria-label={`Edit ${entry.skill_name}`}>
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className={iconButtonClass} aria-label={`Delete ${entry.skill_name}`}>
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
