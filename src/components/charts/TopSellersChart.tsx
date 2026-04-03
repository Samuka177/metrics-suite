import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SaleRecord } from '@/types/sales';
import { getTopSellers } from '@/utils/calculations';
import { formatBRL } from '@/utils/formatters';

interface Props { records: SaleRecord[] }

export default function TopSellersChart({ records }: Props) {
  const data = useMemo(() => getTopSellers(records), [records]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Ranking de Vendedores</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#F1F5F9', fontSize: 12 }}
            width={130}
            tickFormatter={(name, i) => `${i < 3 ? medals[i] + ' ' : ''}${name}`}
          />
          <Tooltip
            contentStyle={{ background: '#1A2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
            formatter={(value: number) => [formatBRL(value), 'Total']}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i < 3 ? '#F59E0B' : '#4A90E2'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
