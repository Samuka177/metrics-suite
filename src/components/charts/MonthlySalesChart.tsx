import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { SaleRecord } from '@/types/sales';
import { getMonthlyData } from '@/utils/calculations';
import { MONTH_NAMES, formatBRL } from '@/utils/formatters';

interface Props { records: SaleRecord[] }

export default function MonthlySalesChart({ records }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();

  const data = useMemo(() => {
    const current = getMonthlyData(records, currentYear);
    const previous = getMonthlyData(records, currentYear - 1);
    return current.map((c, i) => ({
      name: MONTH_NAMES[i],
      atual: Math.round(c.total),
      anterior: Math.round(previous[i].total),
      meta: 80000,
    }));
  }, [records, currentYear]);

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Evolução Mensal de Vendas</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ background: '#1A2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
            formatter={(value: number, name: string) => [formatBRL(value), name === 'atual' ? 'Ano Atual' : name === 'anterior' ? 'Ano Anterior' : 'Meta']}
          />
          <Bar dataKey="anterior" fill="#475569" radius={[4, 4, 0, 0]} />
          <Bar dataKey="atual" fill="#00D4AA" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="meta" stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
