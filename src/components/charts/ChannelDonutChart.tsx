import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SaleRecord } from '@/types/sales';
import { getChannelBreakdown } from '@/utils/calculations';
import { formatBRL } from '@/utils/formatters';

const COLORS = ['#00D4AA', '#4A90E2', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6'];

interface Props { records: SaleRecord[] }

export default function ChannelDonutChart({ records }: Props) {
  const data = useMemo(() => getChannelBreakdown(records), [records]);

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Mix de Canais</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="channel"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1A2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
            formatter={(value: number, name: string) => [formatBRL(value), name]}
          />
          <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
