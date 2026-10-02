import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const LINES = [
  { key: 'mood', label: 'Mood', color: '#a78bfa' },
  { key: 'energy', label: 'Energy', color: '#60a5fa' },
  { key: 'motivation', label: 'Motivation', color: '#fbbf24' },
];

export default function MentalStateChart({ data }) {
  return (
    <div className="h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2445" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#5c6188' }}
            axisLine={{ stroke: '#1e2445' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#5c6188' }} axisLine={false} tickLine={false} width={24} />
          <Tooltip
            contentStyle={{
              background: '#131834',
              border: '1px solid #232a52',
              borderRadius: 8,
              fontSize: 12,
              color: '#e8eaf6',
            }}
            labelFormatter={(d) => `Day ${d}`}
          />
          <Legend wrapperStyle={{ fontSize: 10, color: '#8b90b3' }} iconSize={8} />
          {LINES.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              strokeWidth={1.75}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
