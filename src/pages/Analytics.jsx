import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Dumbbell, Utensils, BookOpen, CheckCircle2 } from 'lucide-react';
import { analyticsApi, ApiError } from '../api/client';
import { loadData } from '../utils/storage';
import { habitRangeCompletion } from '../utils/habitAnalytics';
import { panelClass, inputClass, labelClass } from '../utils/ui';

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Analytics() {
  const [start, setStart] = useState(isoDaysAgo(6));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [habitStats, setHabitStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    analyticsApi
      .weekly({ start, end })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Failed to load analytics from the backend.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const local = loadData();
    setHabitStats(
      local ? habitRangeCompletion(local.habits, start, end) : { trackableDays: 0, completed: 0, possible: 0, percent: 0 }
    );

    return () => {
      cancelled = true;
    };
  }, [start, end]);

  return (
    <div className="px-3 sm:px-6 pb-10 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <h1 className="text-xl font-semibold text-text">Analytics</h1>
        <div className="flex items-center gap-2">
          <div>
            <label className={labelClass}>From</label>
            <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} className={`${inputClass} w-36`} />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input type="date" value={end} min={start} max={isoDaysAgo(0)} onChange={(e) => setEnd(e.target.value)} className={`${inputClass} w-36`} />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-week-4 bg-week-4/10 border border-week-4/30 rounded-lg px-3 py-2">
          {error} — Workout, Food, and Skills analytics need the backend API running.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 size={16} className="text-good" />}
          label="Habit Completion"
          value={habitStats ? `${habitStats.percent}%` : '—'}
          sub={habitStats ? `${habitStats.completed}/${habitStats.possible} checks` : ''}
        />
        <StatCard
          icon={<Dumbbell size={16} className="text-week-2" />}
          label="Workout Sessions"
          value={summary ? summary.workouts.sessions_logged : '—'}
          sub={summary ? `${summary.workouts.total_sets} total sets` : ''}
        />
        <StatCard
          icon={<Utensils size={16} className="text-week-6" />}
          label="Avg Daily Calories"
          value={summary?.food.average_daily_calories ?? '—'}
          sub={summary ? `${summary.food.days_logged} day(s) logged` : ''}
        />
        <StatCard
          icon={<BookOpen size={16} className="text-week-1" />}
          label="Skill Minutes"
          value={summary ? summary.skills.total_minutes : '—'}
          sub={summary?.skills.average_confidence != null ? `avg confidence ${summary.skills.average_confidence}/5` : ''}
        />
      </div>

      {loading ? (
        <div className={panelClass}>
          <p className="text-xs text-text-dim">Loading analytics...</p>
        </div>
      ) : (
        <>
          <div className={panelClass}>
            <h2 className="text-sm font-semibold text-text mb-3">Calories per Day</h2>
            {summary && summary.food.daily_totals.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.food.daily_totals} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2445" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5c6188' }} axisLine={{ stroke: '#1e2445' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#5c6188' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={{ background: '#131834', border: '1px solid #232a52', borderRadius: 8, fontSize: 12, color: '#e8eaf6' }}
                      formatter={(v) => [`${v} cal`, 'Calories']}
                    />
                    <Bar dataKey="calories" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-text-dim">No food logged in this range yet.</p>
            )}
          </div>

          <div className={panelClass}>
            <h2 className="text-sm font-semibold text-text mb-3">Workout Volume by Exercise</h2>
            {summary && Object.keys(summary.workouts.volume_by_exercise).length > 0 ? (
              <div className="flex flex-col gap-2">
                {Object.entries(summary.workouts.volume_by_exercise)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, volume]) => {
                    const max = Math.max(...Object.values(summary.workouts.volume_by_exercise));
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-xs text-text-muted w-28 truncate">{name}</span>
                        <div className="flex-1 h-2 rounded-full bg-cell overflow-hidden">
                          <div
                            className="h-full rounded-full bg-week-2"
                            style={{ width: `${(volume / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-dim w-16 text-right">{Math.round(volume)} kg</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs text-text-dim">No workouts logged in this range yet.</p>
            )}
          </div>

          <div className={panelClass}>
            <h2 className="text-sm font-semibold text-text mb-3">Skills Practiced</h2>
            {summary && Object.keys(summary.skills.by_skill).length > 0 ? (
              <div className="flex flex-col gap-2">
                {Object.entries(summary.skills.by_skill)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, minutes]) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <span className="text-text">{name}</span>
                      <span className="text-text-dim">{minutes} min</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-text-dim">No skills logged in this range yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className={panelClass}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-text-dim">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-text tabular-nums">{value}</div>
      {sub && <div className="text-xs text-text-dim mt-1">{sub}</div>}
    </div>
  );
}
