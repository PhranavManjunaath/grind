import { weekStyle } from './WeekHeader';

export default function WeeklyProgress({ weeklyStats }) {
  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-text tracking-wide mb-4">Weekly Progress</h2>
      <div className="flex flex-col gap-3">
        {weeklyStats.map((w) => {
          const style = weekStyle(w.weekNumber);
          return (
            <div key={w.weekNumber} className="flex items-center gap-3">
              <span className={`text-[11px] font-medium w-14 shrink-0 ${style.text}`}>
                Week {w.weekNumber}
              </span>
              <div className="flex-1 h-2 rounded-full bg-cell overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${w.percent}%`,
                    backgroundColor: `var(--color-week-${((w.weekNumber - 1) % 6) + 1})`,
                  }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-text-dim w-10 text-right shrink-0">
                {w.percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
