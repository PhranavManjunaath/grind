import { Trophy, TrendingDown } from 'lucide-react';
import { weekStyle } from './WeekHeader';

function CircularProgress({ percent, colorVar, size = 56 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e2445" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colorVar}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

const WEEK_HEX = ['#a78bfa', '#60a5fa', '#2dd4bf', '#f472b6', '#4ade80', '#fbbf24'];

export default function HabitualStats({ weeklyStats, best, worst }) {
  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-text tracking-wide mb-4">Habitual Stats</h2>

      <div className="flex flex-wrap gap-4 sm:gap-6 mb-5">
        {weeklyStats.map((w, i) => (
          <div key={w.weekNumber} className="flex flex-col items-center gap-1.5">
            <div className="relative flex items-center justify-center">
              <CircularProgress percent={w.percent} colorVar={WEEK_HEX[i % WEEK_HEX.length]} />
              <span className="absolute text-[11px] font-semibold text-text tabular-nums rotate-0">
                {w.percent}%
              </span>
            </div>
            <span className={`text-[10px] font-medium ${weekStyle(w.weekNumber).text}`}>
              Week {w.weekNumber}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-panel-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-good/10 text-good">
            <Trophy size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Best Habit</span>
            <span className="text-xs font-medium text-text truncate max-w-[110px]">
              {best ? `${best.name} (${best.percent}%)` : '—'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-week-4/10 text-week-4">
            <TrendingDown size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-dim uppercase tracking-wider">Needs Work</span>
            <span className="text-xs font-medium text-text truncate max-w-[110px]">
              {worst ? `${worst.name} (${worst.percent}%)` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
