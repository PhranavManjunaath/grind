import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { HABIT_COLORS } from '../utils/storage';

export default function AddHabitModal({ habit, onSave, onClose }) {
  const [name, setName] = useState(habit?.name ?? '');
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[0]);
  const [goal, setGoal] = useState(habit?.goal ?? '');

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, goal: goal.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-panel border border-panel-border rounded-2xl p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text">
            {habit ? 'Edit Habit' : 'Add New Habit'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-panel-soft"
          >
            <X size={16} />
          </button>
        </div>

        <label className="block text-[10px] uppercase tracking-wider text-text-dim mb-1.5">
          Habit Name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Drink 2L Water"
          className="w-full mb-4 bg-cell border border-cell-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors"
        />

        <label className="block text-[10px] uppercase tracking-wider text-text-dim mb-1.5">
          Color
        </label>
        <div className="flex flex-wrap gap-2 mb-4">
          {HABIT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Select color ${c}`}
              className={`w-6 h-6 rounded-full transition-transform ${
                color === c ? 'ring-2 ring-offset-2 ring-offset-panel ring-text scale-110' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <label className="block text-[10px] uppercase tracking-wider text-text-dim mb-1.5">
          Optional Goal
        </label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Every day this month"
          className="w-full mb-5 bg-cell border border-cell-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-panel-soft transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-accent text-bg hover:brightness-110 transition-all"
          >
            {habit ? 'Save Changes' : 'Create Habit'}
          </button>
        </div>
      </form>
    </div>
  );
}
