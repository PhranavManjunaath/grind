import { Flame } from 'lucide-react';
import { colorForPercent } from '../utils/habitAnalytics';

export default function DailyProgress({ items }) {
  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-text tracking-wide mb-4">Daily Progress</h2>
      <div className="flex flex-col divide-y divide-panel-border/40">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-text truncate flex-1" title={item.name}>
              {item.name}
            </span>
            <span
              className="text-xs font-semibold tabular-nums w-11 text-right"
              style={{ color: colorForPercent(item.percent) }}
            >
              {item.percent}%
            </span>
            <span className="text-[10px] text-text-dim tabular-nums w-14 text-right">
              {item.completed} / {item.total}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted w-10 justify-end shrink-0">
              <Flame size={11} className={item.streak > 0 ? 'text-accent' : 'text-text-dim'} />
              {item.streak}
            </span>
          </div>
        ))}
        {items.length === 0 && <div className="text-xs text-text-dim py-2">No habits yet.</div>}
      </div>
    </div>
  );
}
