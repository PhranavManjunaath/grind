import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel } from '../utils/dateUtils';
import StatSummary from './StatSummary';

export default function Header({ year, month, onPrevMonth, onNextMonth, stats }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 px-4 sm:px-6 py-5">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevMonth}
              aria-label="Previous month"
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-panel-soft transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h1 className="text-3xl font-semibold tracking-tight text-text leading-none">
              {monthLabel(year, month)}
            </h1>
            <button
              onClick={onNextMonth}
              aria-label="Next month"
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-panel-soft transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <p className="text-xs text-text-dim mt-1 pl-1">Monthly Habit Tracker &middot; {year}</p>
        </div>
      </div>
      <StatSummary {...stats} />
    </div>
  );
}
