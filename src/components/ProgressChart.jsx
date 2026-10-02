import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressChart({ data, title = 'Habit Progress' }) {
  return (
    <div className="bg-panel border border-panel-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text tracking-wide">{title}</h2>
        <span className="text-[10px] uppercase tracking-wider text-text-dim">Daily completion %</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.85} />
                <stop offset="45%" stopColor="#14b8a6" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0.12} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: '#5c6188' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
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
              strokeWidth={2.5}
              fill="url(#progressFill)"
              dot={{ r: 2.5, fill: '#2dd4bf', strokeWidth: 0 }}
              activeDot={{ r: 4.5, fill: '#2dd4bf', stroke: '#080b20', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
