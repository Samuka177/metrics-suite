import { useMemo } from 'react';
import { SaleRecord } from '@/types/sales';
import { getRegionalData } from '@/utils/calculations';
import { formatBRL } from '@/utils/formatters';

const COLORS = ['#00D4AA', '#4A90E2', '#F59E0B', '#22C55E', '#8B5CF6'];

interface Props { records: SaleRecord[] }

export default function RegionalTreemap({ records }: Props) {
  const data = useMemo(() => getRegionalData(records), [records]);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Distribuição Regional</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.sort((a, b) => b.value - a.value).map((region, i) => {
          const pct = total > 0 ? (region.value / total) * 100 : 0;
          return (
            <div
              key={region.name}
              className="rounded-xl p-4 text-center transition-all hover:scale-105"
              style={{ backgroundColor: COLORS[i % COLORS.length] + '22', borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}
            >
              <p className="text-sm font-semibold text-foreground">{region.name}</p>
              <p className="text-lg font-bold text-foreground mt-1">{formatBRL(region.value)}</p>
              <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
