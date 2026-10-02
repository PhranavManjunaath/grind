import { useRef, useState } from 'react';
import { Check, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import WeekHeader from './WeekHeader';
import { formatDateKey, formatFullDate, getWeekBuckets, isFutureDate, isToday, shortDayLabel } from '../utils/dateUtils';

const ROW_H = 30;

export default function HabitGrid({
  habits,
  year,
  month,
  allDays,
  onToggle,
  onAddHabit,
  onEditHabit,
  onDeleteHabit,
  onReorder,
  title = 'My Habits',
  showAddButton = true,
  allowEditDelete = true,
  allowReorder = true,
  footerLabel = 'Daily %',
}) {
  const buckets = getWeekBuckets(year, month);
  const totalDays = allDays.length;
  const [tooltip, setTooltip] = useState(null);
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const gridTemplateColumns = `repeat(${totalDays}, minmax(26px, 1fr))`;

  function handleDragStart(index) {
    dragIndex.current = index;
  }
  function handleDragOver(e, index) {
    e.preventDefault();
    setDragOverIndex(index);
  }
  function handleDrop(index) {
    if (dragIndex.current !== null && dragIndex.current !== index) {
      onReorder(dragIndex.current, index);
    }
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  function dailyPercent(day) {
    if (habits.length === 0) return 0;
    const key = formatDateKey(year, month, day);
    const completed = habits.filter((h) => h.completions[key]).length;
    return Math.round((completed / habits.length) * 100);
  }

  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text tracking-wide">{title}</h2>
        {showAddButton && (
          <button
            onClick={onAddHabit}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:text-week-6 transition-colors bg-accent/10 hover:bg-accent/20 px-2.5 py-1.5 rounded-lg"
          >
            <Plus size={13} /> Add Habit
          </button>
        )}
      </div>

      <div className="flex gap-3">
        {/* Habit name column */}
        <div className="flex flex-col shrink-0 w-[150px] sm:w-[180px]">
          <div style={{ height: ROW_H }} />
          <div style={{ height: ROW_H }} />
          {habits.map((habit, i) => (
            <div
              key={habit.id}
              draggable={allowReorder}
              onDragStart={() => allowReorder && handleDragStart(i)}
              onDragOver={(e) => allowReorder && handleDragOver(e, i)}
              onDrop={() => allowReorder && handleDrop(i)}
              className={`group flex items-center gap-1.5 pr-1 border-b border-panel-border/40 ${
                dragOverIndex === i ? 'bg-panel-soft' : ''
              }`}
              style={{ height: ROW_H }}
            >
              {allowReorder && (
                <GripVertical size={12} className="text-text-dim cursor-grab shrink-0 opacity-40 group-hover:opacity-100" />
              )}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: habit.color }}
              />
              <span className="text-xs text-text truncate flex-1" title={habit.name}>
                {habit.name}
              </span>
              {allowEditDelete && (
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onEditHabit(habit)}
                    aria-label={`Edit ${habit.name}`}
                    className="p-1 rounded text-text-muted hover:text-text hover:bg-panel-soft"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => onDeleteHabit(habit.id)}
                    aria-label={`Delete ${habit.name}`}
                    className="p-1 rounded text-text-muted hover:text-week-4 hover:bg-panel-soft"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {habits.length === 0 && (
            <div className="text-xs text-text-dim py-3">No habits yet. Add one to get started.</div>
          )}
          <div style={{ height: ROW_H }} className="flex items-center text-[10px] text-text-dim uppercase tracking-wider">
            {footerLabel}
          </div>
        </div>

        {/* Scrollable calendar grid */}
        <div className="overflow-x-auto flex-1 min-w-0 relative">
          <div style={{ display: 'grid', gridTemplateColumns, gap: 0, minWidth: totalDays * 26 }}>
            <WeekHeader buckets={buckets} />

            {allDays.map((day) => (
              <div
                key={`d-${day}`}
                style={{ height: ROW_H }}
                className={`flex items-center justify-center text-[10px] font-medium ${
                  isToday(year, month, day) ? 'text-accent' : 'text-text-dim'
                }`}
              >
                {shortDayLabel(day)}
              </div>
            ))}

            {habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                year={year}
                month={month}
                allDays={allDays}
                onToggle={onToggle}
                setTooltip={setTooltip}
              />
            ))}

            {allDays.map((day) => {
              const pct = dailyPercent(day);
              return (
                <div
                  key={`pct-${day}`}
                  style={{ height: ROW_H }}
                  className="flex items-center justify-center text-[9px] text-text-dim tabular-nums"
                >
                  {habits.length > 0 ? `${pct}` : ''}
                </div>
              );
            })}
          </div>

          {tooltip && (
            <div
              className="pointer-events-none fixed z-50 bg-panel-soft border border-panel-border rounded-lg px-3 py-2 text-xs shadow-lg animate-fade-in"
              style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
            >
              <div className="font-semibold text-text">{tooltip.habitName}</div>
              <div className="text-text-muted">{tooltip.date}</div>
              <div className={tooltip.done ? 'text-good' : 'text-text-dim'}>
                {tooltip.done ? 'Completed' : 'Not Completed'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitRow({ habit, year, month, allDays, onToggle, setTooltip }) {
  return (
    <>
      {allDays.map((day) => {
        const key = formatDateKey(year, month, day);
        const done = !!habit.completions[key];
        const future = isFutureDate(year, month, day);
        return (
          <div
            key={key}
            style={{ height: ROW_H }}
            className="flex items-center justify-center"
            onMouseEnter={(e) =>
              setTooltip({
                x: e.clientX,
                y: e.clientY,
                habitName: habit.name,
                date: formatFullDate(year, month, day),
                done,
              })
            }
            onMouseMove={(e) =>
              setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <button
              disabled={future}
              onClick={() => onToggle(habit.id, key)}
              aria-label={`Toggle ${habit.name} on ${key}`}
              className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-all ${
                future
                  ? 'border-panel-border/50 bg-transparent cursor-not-allowed opacity-30'
                  : done
                  ? 'border-transparent'
                  : 'border-cell-border bg-cell hover:border-text-muted cursor-pointer'
              }`}
              style={done ? { backgroundColor: habit.color } : undefined}
            >
              {done && <Check size={11} strokeWidth={3} className="text-bg" />}
            </button>
          </div>
        );
      })}
    </>
  );
}
