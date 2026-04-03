import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SaleRecord } from '@/types/sales';
import { getWeeklyData } from '@/utils/calculations';
import { formatBRL } from '@/utils/formatters';

interface Props { records: SaleRecord[] }

export default function WeeklyTrendChart({ records }: Props) {
  const data = useMemo(() => getWeeklyData(records), [records]);

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Tendência Semanal (últimas 12 semanas)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="week" tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={(w) => `S${w}`} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ background: '#1A2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
            formatter={(value: number) => [formatBRL(value), 'Total']}
            labelFormatter={(w) => `Semana ${w}`}
          />
          <Area type="monotone" dataKey="total" stroke="#00D4AA" fill="url(#areaGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
