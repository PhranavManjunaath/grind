export default function StatSummary({ numberOfHabits, completedHabits, progressPercent }) {
  return (
    <div className="flex items-center gap-6 sm:gap-10 flex-wrap">
      <Stat label="Number of Habits" value={numberOfHabits} />
      <Stat label="Completed Habits" value={completedHabits} />
      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <span className="text-[10px] uppercase tracking-wider text-text-dim">Progress</span>
        <div className="h-2 w-36 rounded-full bg-cell overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-week-4 transition-all duration-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>
      <Stat label="Progress in %" value={`${progressPercent}%`} accent />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-text-dim">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${accent ? 'text-accent' : 'text-text'}`}>
        {value}
      </span>
    </div>
  );
}
