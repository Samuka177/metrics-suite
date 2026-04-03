import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SaleRecord } from '@/types/sales';
import { getTopProducts } from '@/utils/calculations';
import { formatBRL, formatNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';

interface Props { records: SaleRecord[] }

export default function TopProductsChart({ records }: Props) {
  const [by, setBy] = useState<'revenue' | 'volume'>('revenue');
  const data = useMemo(() => getTopProducts(records, 10, by), [records, by]);

  return (
    <div className="card-surface p-5 fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-section">Produtos Mais Vendidos</h3>
        <div className="flex gap-1">
          <Button variant={by === 'revenue' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setBy('revenue')}>Por Receita</Button>
          <Button variant={by === 'volume' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setBy('volume')}>Por Volume</Button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={(v) => by === 'revenue' ? `${(v/1000).toFixed(0)}k` : formatNumber(v)} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#F1F5F9', fontSize: 11 }} width={140} />
          <Tooltip
            contentStyle={{ background: '#1A2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
            formatter={(value: number) => [by === 'revenue' ? formatBRL(value) : `${formatNumber(value)} un.`, by === 'revenue' ? 'Receita' : 'Volume']}
          />
          <Bar dataKey={by === 'revenue' ? 'revenue' : 'units'} fill="#00D4AA" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
