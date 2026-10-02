import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Trash2, Moon, Dumbbell, Sliders, Plus, X } from 'lucide-react';
import { workoutApi, settingsApi, ApiError } from '../api/client';
import { inputClass, labelClass, primaryButtonClass, iconButtonClass } from '../utils/ui';

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function WorkoutSplitSettings() {
  const [days, setDays] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    workoutApi
      .getSplit()
      .then((d) => setDays(d.length > 0 ? d : [{ weekday: 0, label: '' }]))
      .catch(() => setDays([{ weekday: 0, label: '' }]));
  }, []);

  function updateDay(i, field, value) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  }

  function addDay() {
    setDays((prev) => [...prev, { weekday: 0, label: '' }]);
  }

  function removeDay(i) {
    setDays((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const payload = days
        .filter((d) => d.label.trim())
        .map((d) => ({ weekday: Number(d.weekday), label: d.label.trim() }));
      const saved = await workoutApi.updateSplit(payload);
      setDays(saved);
      setNotice('Workout split saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save split.');
    } finally {
      setSaving(false);
    }
  }

  if (days === null) return null;

  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-panel-soft text-text-muted">
          <Dumbbell size={16} />
        </div>
        <div>
          <div className="text-sm text-text font-medium">Workout Split</div>
          <div className="text-xs text-text-dim">Your fixed recurring weekly training days</div>
        </div>
      </div>

      {error && <p className="text-xs text-week-4">{error}</p>}
      {notice && <p className="text-xs text-good">{notice}</p>}

      <div className="flex flex-col gap-2">
        {days.map((day, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={day.weekday}
              onChange={(e) => updateDay(i, 'weekday', e.target.value)}
              style={{ width: '9rem', flexShrink: 0 }}
              className={inputClass}
            >
              {WEEKDAY_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
            <input
              value={day.label}
              onChange={(e) => updateDay(i, 'label', e.target.value)}
              placeholder="e.g. Chest + Triceps + Shoulders"
              className={`${inputClass} flex-1 min-w-0`}
            />
            <button onClick={() => removeDay(i)} className={`${iconButtonClass} shrink-0`} aria-label="Remove day">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={addDay} className="flex items-center gap-1 text-xs text-accent hover:text-week-6">
          <Plus size={13} /> Add day
        </button>
        <button onClick={save} disabled={saving} className={`${primaryButtonClass} ml-auto`}>
          {saving ? 'Saving...' : 'Save Split'}
        </button>
      </div>
    </div>
  );
}

function ProgressionSettings() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.get().then(setConfig).catch(() => setConfig(null));
  }, []);

  async function save() {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const updated = await settingsApi.update({
        rep_range_low: Number(config.rep_range_low),
        rep_range_high: Number(config.rep_range_high),
        weight_increment: Number(config.weight_increment),
      });
      setConfig(updated);
      setNotice('Progression preferences saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  }

  if (config === null) return null;

  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-panel-soft text-text-muted">
          <Sliders size={16} />
        </div>
        <div>
          <div className="text-sm text-text font-medium">Progression Preferences</div>
          <div className="text-xs text-text-dim">Used by the progressive-overload suggestions</div>
        </div>
      </div>

      {error && <p className="text-xs text-week-4">{error}</p>}
      {notice && <p className="text-xs text-good">{notice}</p>}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>Rep range low</label>
          <input
            type="number"
            min="1"
            value={config.rep_range_low}
            onChange={(e) => setConfig((c) => ({ ...c, rep_range_low: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Rep range high</label>
          <input
            type="number"
            min="1"
            value={config.rep_range_high}
            onChange={(e) => setConfig((c) => ({ ...c, rep_range_high: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Weight increment</label>
          <input
            type="number"
            min="0"
            step="0.25"
            value={config.weight_increment}
            onChange={(e) => setConfig((c) => ({ ...c, weight_increment: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      <button onClick={save} disabled={saving} className={`${primaryButtonClass} self-start`}>
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}

export default function Settings({ onClearData, onExport, onImport }) {
  const fileRef = useRef(null);

  function handleImportClick() {
    fileRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = '';
  }

  function handleClear() {
    if (window.confirm('Clear all habit data? This cannot be undone.')) {
      onClearData();
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text mb-2">Settings</h2>

      <WorkoutSplitSettings />
      <ProgressionSettings />

      <div className="bg-panel border border-panel-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-panel-soft text-text-muted">
            <Moon size={16} />
          </div>
          <div>
            <div className="text-sm text-text font-medium">Theme</div>
            <div className="text-xs text-text-dim">Dark (default for this dashboard)</div>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-text-dim px-2 py-1 rounded-full bg-panel-soft">
          Dark
        </span>
      </div>

      <div className="bg-panel border border-panel-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-panel-soft text-text-muted">
            <Download size={16} />
          </div>
          <div>
            <div className="text-sm text-text font-medium">Export Data</div>
            <div className="text-xs text-text-dim">Download all habits and completions as JSON</div>
          </div>
        </div>
        <button
          onClick={onExport}
          className="text-xs font-medium text-accent hover:text-week-6 bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          Export
        </button>
      </div>

      <div className="bg-panel border border-panel-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-panel-soft text-text-muted">
            <Upload size={16} />
          </div>
          <div>
            <div className="text-sm text-text font-medium">Import Data</div>
            <div className="text-xs text-text-dim">Restore from a previously exported JSON file</div>
          </div>
        </div>
        <button
          onClick={handleImportClick}
          className="text-xs font-medium text-week-2 hover:brightness-110 bg-week-2/10 hover:bg-week-2/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          Import
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
      </div>

      <div className="bg-panel border border-panel-border rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-week-4/10 text-week-4">
            <Trash2 size={16} />
          </div>
          <div>
            <div className="text-sm text-text font-medium">Clear All Data</div>
            <div className="text-xs text-text-dim">Permanently delete all habits and progress</div>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="text-xs font-medium text-week-4 hover:brightness-110 bg-week-4/10 hover:bg-week-4/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          Clear Data
        </button>
      </div>
    </div>
  );
}
