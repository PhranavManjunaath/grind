import { colorForPercent } from '../utils/habitAnalytics';

export default function AnalysisPanel({ ranking, title = 'Analysis' }) {
  const max = ranking.length > 0 ? Math.max(...ranking.map((r) => r.percent), 1) : 1;
  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 sm:p-5 h-full">
      <h2 className="text-sm font-semibold text-text tracking-wide mb-4">{title}</h2>
      <div className="flex flex-col gap-3">
        {ranking.map((item) => (
          <div key={item.id ?? item.name} className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted w-20 sm:w-24 truncate shrink-0" title={item.name}>
              {item.name}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-cell overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.percent / max) * 100}%`,
                  backgroundColor: colorForPercent(item.percent),
                }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-text-dim w-9 text-right shrink-0">
              {item.percent}%
            </span>
          </div>
        ))}
        {ranking.length === 0 && (
          <div className="text-xs text-text-dim">No data yet.</div>
        )}
      </div>
    </div>
  );
}
