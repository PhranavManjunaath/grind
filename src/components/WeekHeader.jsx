const WEEK_STYLES = [
  { bg: 'bg-week-1-bg', text: 'text-week-1' },
  { bg: 'bg-week-2-bg', text: 'text-week-2' },
  { bg: 'bg-week-3-bg', text: 'text-week-3' },
  { bg: 'bg-week-4-bg', text: 'text-week-4' },
  { bg: 'bg-week-5-bg', text: 'text-week-5' },
  { bg: 'bg-week-6-bg', text: 'text-week-6' },
];

export function weekStyle(weekNumber) {
  return WEEK_STYLES[(weekNumber - 1) % WEEK_STYLES.length];
}

export default function WeekHeader({ buckets }) {
  return (
    <>
      {buckets.map((bucket) => {
        const style = weekStyle(bucket.weekNumber);
        return (
          <div
            key={bucket.weekNumber}
            style={{ gridColumn: `span ${bucket.days.length}` }}
            className={`${style.bg} ${style.text} text-[10px] font-semibold uppercase tracking-wider text-center py-1.5 rounded-md mx-[1px]`}
          >
            Week {bucket.weekNumber}
          </div>
        );
      })}
    </>
  );
}
