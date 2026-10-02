import { ListChecks, Dumbbell, Utensils, BookOpen, BarChart3, Settings as SettingsIcon, Flame } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Habit Tracker', icon: ListChecks },
  { key: 'workout', label: 'Workout', icon: Dumbbell },
  { key: 'food', label: 'Food', icon: Utensils },
  { key: 'skills', label: 'Skills', icon: BookOpen },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function Navigation({ active, onChange }) {
  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-panel-border/60">
      <div className="flex items-center gap-2 text-text">
        <Flame size={18} className="text-accent" />
        <span className="text-sm font-semibold tracking-wide">Quiet Progress</span>
      </div>
      <div className="flex items-center gap-1 bg-panel/60 rounded-full p-1 border border-panel-border">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              active === key
                ? 'bg-panel-soft text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
