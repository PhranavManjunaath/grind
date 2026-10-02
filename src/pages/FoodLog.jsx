import { useEffect, useState } from 'react';
import { Trash2, Pencil, Check, X, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { foodApi, ApiError } from '../api/client';
import { panelClass, inputClass, labelClass, primaryButtonClass, iconButtonClass } from '../utils/ui';

const todayStr = () => new Date().toISOString().slice(0, 10);

function shiftDay(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const emptyForm = () => ({
  date: todayStr(),
  food_name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  serving: '',
  meal: '',
  notes: '',
  save_as_food: false,
});

export default function FoodLog() {
  const [entries, setEntries] = useState([]);
  const [savedFoods, setSavedFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filterDate, setFilterDate] = useState(todayStr());
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  async function loadEntries() {
    setLoading(true);
    setError('');
    try {
      const params = filterDate ? { start: filterDate, end: filterDate } : {};
      const page = await foodApi.listEntries(params);
      setEntries(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load food entries.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSaved() {
    try {
      setSavedFoods(await foodApi.listSaved());
    } catch {
      // saved-food list failing isn't fatal to the page
    }
  }

  useEffect(() => {
    loadSaved();
  }, []);

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);

  function applySavedFood(id) {
    const saved = savedFoods.find((f) => String(f.id) === id);
    if (!saved) return;
    setForm((prev) => ({
      ...prev,
      food_name: saved.name,
      calories: saved.default_calories ?? '',
      protein: saved.default_protein ?? '',
      carbs: saved.default_carbs ?? '',
      fat: saved.default_fat ?? '',
      serving: saved.default_serving ?? '',
      save_as_food: false,
    }));
  }

  async function submitEntry(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await foodApi.createEntry({
        date: form.date,
        food_name: form.food_name.trim(),
        calories: Number(form.calories) || 0,
        protein: form.protein === '' ? null : Number(form.protein),
        carbs: form.carbs === '' ? null : Number(form.carbs),
        fat: form.fat === '' ? null : Number(form.fat),
        serving: form.serving.trim() || null,
        meal: form.meal || null,
        notes: form.notes.trim() || null,
        save_as_food: form.save_as_food,
      });
      setNotice('Food entry logged.');
      setForm(emptyForm());
      loadEntries();
      if (form.save_as_food) loadSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this food entry?')) return;
    try {
      await foodApi.deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete entry.');
    }
  }

  async function handleDeleteSaved(id) {
    if (!window.confirm('Remove this saved food? Past entries are unaffected.')) return;
    try {
      await foodApi.deleteSaved(id);
      setSavedFoods((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete saved food.');
    }
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="px-3 sm:px-6 pb-10 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-text pt-2">Food & Calorie Log</h1>

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
        <h2 className="text-sm font-semibold text-text mb-3">Log Food</h2>

        {savedFoods.length > 0 && (
          <div className="mb-3">
            <label className={labelClass}>Prefill from saved food</label>
            <select
              onChange={(e) => applySavedFood(e.target.value)}
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Choose a saved food...
              </option>
              {savedFoods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={submitEntry} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <div className="sm:col-span-2">
            <label className={labelClass}>Food name</label>
            <input
              required
              value={form.food_name}
              onChange={(e) => setForm((f) => ({ ...f, food_name: e.target.value }))}
              placeholder="e.g. Grilled chicken"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Calories</label>
            <input
              type="number"
              min="0"
              required
              value={form.calories}
              onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Protein (g, optional)</label>
            <input
              type="number"
              min="0"
              value={form.protein}
              onChange={(e) => setForm((f) => ({ ...f, protein: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Carbs (g, optional)</label>
            <input
              type="number"
              min="0"
              value={form.carbs}
              onChange={(e) => setForm((f) => ({ ...f, carbs: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fat (g, optional)</label>
            <input
              type="number"
              min="0"
              value={form.fat}
              onChange={(e) => setForm((f) => ({ ...f, fat: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Serving / quantity</label>
            <input
              value={form.serving}
              onChange={(e) => setForm((f) => ({ ...f, serving: e.target.value }))}
              placeholder="e.g. 1 cup"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Meal</label>
            <select
              value={form.meal}
              onChange={(e) => setForm((f) => ({ ...f, meal: e.target.value }))}
              className={inputClass}
            >
              <option value="">(none)</option>
              {MEAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>Notes (optional)</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-text-muted sm:col-span-3">
            <input
              type="checkbox"
              checked={form.save_as_food}
              onChange={(e) => setForm((f) => ({ ...f, save_as_food: e.target.checked }))}
            />
            Save as a reusable food
          </label>
          <button type="submit" disabled={submitting} className={`${primaryButtonClass} self-start sm:col-span-3 w-fit`}>
            {submitting ? 'Saving...' : 'Log Entry'}
          </button>
        </form>
      </div>

      {savedFoods.length > 0 && (
        <div className={panelClass}>
          <h2 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Bookmark size={14} className="text-accent" /> Saved Foods
          </h2>
          <div className="flex flex-col gap-1">
            {savedFoods.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-xs text-text-muted">
                <span className="text-text">
                  {f.name} {f.default_calories != null ? `· ${f.default_calories} cal` : ''}
                </span>
                <button
                  onClick={() => handleDeleteSaved(f.id)}
                  aria-label={`Delete saved food ${f.name}`}
                  className="text-text-dim hover:text-week-4 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={panelClass}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-text">Entries</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterDate((d) => shiftDay(d, -1))}
              className={iconButtonClass}
              aria-label="Previous day"
            >
              <ChevronLeft size={14} />
            </button>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ width: '9rem' }}
              className={inputClass}
            />
            <button
              onClick={() => setFilterDate((d) => shiftDay(d, 1))}
              className={iconButtonClass}
              aria-label="Next day"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {filterDate && entries.length > 0 && (
          <div className="flex gap-4 mb-3 text-xs text-text-muted flex-wrap">
            <span>
              Total: <strong className="text-text">{Math.round(totals.calories)} cal</strong>
            </span>
            <span>Protein: {Math.round(totals.protein)}g</span>
            <span>Carbs: {Math.round(totals.carbs)}g</span>
            <span>Fat: {Math.round(totals.fat)}g</span>
          </div>
        )}

        {loading ? (
          <p className="text-xs text-text-dim">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-text-dim">No food logged for this date.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} onChanged={loadEntries} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryRow({ entry, onDelete, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [calories, setCalories] = useState(entry.calories);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await foodApi.updateEntry(entry.id, { calories: Number(calories) });
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between bg-cell border border-cell-border rounded-lg px-3 py-2 text-sm">
      <div>
        <span className="text-text">{entry.food_name}</span>
        {entry.meal && <span className="text-text-dim text-xs ml-2">({entry.meal})</span>}
        {entry.serving && <span className="text-text-dim text-xs ml-2">{entry.serving}</span>}
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="number"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              style={{ width: '5rem' }}
              className={`${inputClass} py-1`}
            />
            <button onClick={save} disabled={saving} className={iconButtonClass} aria-label="Save calories">
              <Check size={13} />
            </button>
            <button onClick={() => setEditing(false)} className={iconButtonClass} aria-label="Cancel edit">
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <span className="text-text-muted text-xs">{entry.calories} cal</span>
            <button onClick={() => setEditing(true)} className={iconButtonClass} aria-label={`Edit ${entry.food_name}`}>
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className={iconButtonClass} aria-label={`Delete ${entry.food_name}`}>
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
