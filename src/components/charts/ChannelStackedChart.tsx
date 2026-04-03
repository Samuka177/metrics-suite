import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SaleRecord } from '@/types/sales';
import { getChannelMonthlyData } from '@/utils/calculations';
import { MONTH_NAMES, formatBRL } from '@/utils/formatters';

const COLORS: Record<string, string> = {
  'On-Trade': '#00D4AA',
  'Delivery': '#4A90E2',
  'E-commerce': '#F59E0B',
  'Atacado': '#22C55E',
  'Varejo': '#8B5CF6',
};

interface Props { records: SaleRecord[] }

export default function ChannelStackedChart({ records }: Props) {
  const data = useMemo(() => {
    const raw = getChannelMonthlyData(records);
    return raw.map(d => ({ ...d, name: MONTH_NAMES[d.month] }));
  }, [records]);

  const channels = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => set.add(r.channel));
    return [...set];
  }, [records]);

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Desempenho por Canal — Últimos 6 Meses</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ background: '#1A2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
            formatter={(value: number) => formatBRL(value)}
          />
          <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
          {channels.map(ch => (
            <Bar key={ch} dataKey={ch} stackId="a" fill={COLORS[ch] || '#64748B'} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
