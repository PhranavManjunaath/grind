import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Utensils, BookOpen, CheckCircle2 } from 'lucide-react';
import { analyticsApi, ApiError } from '../api/client';
import { loadData } from '../utils/storage';
import { habitRangeCompletion } from '../utils/habitAnalytics';
import { panelClass } from '../utils/ui';

export default function Analytics() {
  const [weekNumber, setWeekNumber] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [habitStats, setHabitStats] = useState(null);

  useEffect(() => {
    analyticsApi
      .currentWeekNumber()
      .then((r) => setWeekNumber(r.week_number))
      .catch(() => setWeekNumber(1));
  }, []);

  useEffect(() => {
    if (weekNumber == null) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    analyticsApi
      .week(weekNumber)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        const local = loadData();
        setHabitStats(
          local
            ? habitRangeCompletion(local.habits, data.range_start, data.range_end)
            : { trackableDays: 0, completed: 0, possible: 0, percent: 0 }
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load analytics from the backend.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [weekNumber]);

  return (
    <div className="px-3 sm:px-6 pb-10 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <h1 className="text-xl font-semibold text-text">Analytics</h1>
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

      {summary && (
        <p className="text-xs text-text-dim -mt-2">
          {summary.range_start} to {summary.range_end}
        </p>
      )}

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
          label="Workout Days"
          value={summary ? summary.workouts.days_logged : '—'}
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
          label="Skill Hours"
          value={summary ? summary.skills.total_hours : '—'}
          sub={summary?.skills.average_confidence != null ? `avg confidence ${summary.skills.average_confidence}/10` : ''}
        />
      </div>

      {loading ? (
        <div className={panelClass}>
          <p className="text-xs text-text-dim">Loading analytics...</p>
        </div>
      ) : (
        summary && (
          <>
            <div className={panelClass}>
              <h2 className="text-sm font-semibold text-text mb-3">Workout Progression</h2>
              {summary.workouts.exercises_trained.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <TrendList label="Improving" items={summary.workouts.improving} color="text-good" />
                  <TrendList label="Stable" items={summary.workouts.stable} color="text-text-muted" />
                  <TrendList label="Declining" items={summary.workouts.declining} color="text-week-4" />
                  <div className="flex flex-col gap-2 pt-2 border-t border-panel-border/60">
                    {Object.entries(summary.workouts.volume_by_exercise)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, vol]) => {
                        const max = Math.max(...Object.values(summary.workouts.volume_by_exercise));
                        return (
                          <div key={name} className="flex items-center gap-2">
                            <span className="text-xs text-text-muted w-28 truncate">{name}</span>
                            <div className="flex-1 h-2 rounded-full bg-cell overflow-hidden">
                              <div className="h-full rounded-full bg-week-2" style={{ width: `${(vol / max) * 100}%` }} />
                            </div>
                            <span className="text-xs text-text-dim w-20 text-right">{Math.round(vol)} vol</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-dim">No workouts logged this week yet.</p>
              )}
            </div>

            <div className={panelClass}>
              <h2 className="text-sm font-semibold text-text mb-3">Food</h2>
              {summary.food.daily_totals.length > 0 ? (
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex gap-4 flex-wrap text-text-muted">
                    <span>Avg protein: {summary.food.average_protein ?? '—'}g</span>
                    <span>Avg carbs: {summary.food.average_carbs ?? '—'}g</span>
                    <span>Avg fat: {summary.food.average_fat ?? '—'}g</span>
                  </div>
                  {summary.food.highest_calorie_day && (
                    <p className="text-text-muted">
                      Highest: <span className="text-text">{summary.food.highest_calorie_day.date}</span> (
                      {summary.food.highest_calorie_day.calories} cal)
                    </p>
                  )}
                  {summary.food.lowest_calorie_day && (
                    <p className="text-text-muted">
                      Lowest: <span className="text-text">{summary.food.lowest_calorie_day.date}</span> (
                      {summary.food.lowest_calorie_day.calories} cal)
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-dim">No food logged this week yet.</p>
              )}
            </div>

            <div className={panelClass}>
              <h2 className="text-sm font-semibold text-text mb-3">Skills Practiced</h2>
              {summary.skills.skills_worked_on.length > 0 ? (
                <div className="flex flex-col gap-1 text-xs">
                  <p className="text-text-muted">{summary.skills.skills_worked_on.join(', ')}</p>
                  {summary.skills.improved_confidence.length > 0 && (
                    <p className="text-good">Improved: {summary.skills.improved_confidence.join(', ')}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-dim">No skills logged this week yet.</p>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}

function TrendList({ label, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <p className="text-xs">
      <span className={`font-medium ${color}`}>{label}: </span>
      <span className="text-text-muted">{items.join(', ')}</span>
    </p>
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
