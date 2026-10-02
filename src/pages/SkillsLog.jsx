import { useEffect, useState } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { skillsApi, ApiError } from '../api/client';
import { panelClass, inputClass, labelClass, primaryButtonClass, iconButtonClass } from '../utils/ui';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  date: todayStr(),
  skill_name: '',
  time_spent_minutes: '',
  confidence: 3,
  notes: '',
});

export default function SkillsLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  async function loadEntries() {
    setLoading(true);
    setError('');
    try {
      const page = await skillsApi.listEntries({ limit: 100 });
      setEntries(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load skill entries.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function submitEntry(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await skillsApi.createEntry({
        date: form.date,
        skill_name: form.skill_name.trim(),
        time_spent_minutes: Number(form.time_spent_minutes),
        confidence: Number(form.confidence),
        notes: form.notes.trim() || null,
      });
      setNotice('Skill entry logged.');
      setForm(emptyForm());
      loadEntries();
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

  return (
    <div className="px-3 sm:px-6 pb-10 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text pt-2">Skills Log</h1>
      <p className="text-xs text-text-dim -mt-2">
        Time is tracked in minutes. Confidence/progress is a 1 (just starting) to 5 (confident) scale.
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
        <h2 className="text-sm font-semibold text-text mb-3">Log Practice</h2>
        <form onSubmit={submitEntry} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Skill</label>
            <input
              required
              value={form.skill_name}
              onChange={(e) => setForm((f) => ({ ...f, skill_name: e.target.value }))}
              placeholder="e.g. Guitar"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Time spent (minutes)</label>
            <input
              type="number"
              min="1"
              required
              value={form.time_spent_minutes}
              onChange={(e) => setForm((f) => ({ ...f, time_spent_minutes: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confidence / progress (1-5)</label>
            <input
              type="range"
              min="1"
              max="5"
              value={form.confidence}
              onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value }))}
              className="w-full"
            />
            <div className="text-xs text-text-muted text-center">{form.confidence} / 5</div>
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
        <h2 className="text-sm font-semibold text-text mb-3">History</h2>
        {loading ? (
          <p className="text-xs text-text-dim">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-text-dim">No skills logged yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <SkillRow key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} onChanged={loadEntries} />
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
        <span className="text-text-dim text-xs ml-2">{entry.date}</span>
        <span className="text-text-dim text-xs ml-2">{entry.time_spent_minutes} min</span>
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="number"
              min="1"
              max="5"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className={`${inputClass} w-16 py-1`}
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
            <span className="text-text-muted text-xs">Confidence {entry.confidence}/5</span>
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
