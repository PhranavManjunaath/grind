import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ProgressChart({ data, title = 'Habit Progress' }) {
  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text tracking-wide">{title}</h2>
        <span className="text-[10px] uppercase tracking-wider text-text-dim">Daily completion %</span>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2445" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: '#5c6188' }}
              axisLine={{ stroke: '#1e2445' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#5c6188' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: '#131834',
                border: '1px solid #232a52',
                borderRadius: 8,
                fontSize: 12,
                color: '#e8eaf6',
              }}
              labelFormatter={(d) => `Day ${d}`}
              formatter={(v) => [`${v}%`, 'Completion']}
            />
            <Area
              type="monotone"
              dataKey="percent"
              stroke="#2dd4bf"
              strokeWidth={2}
              fill="url(#progressFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
