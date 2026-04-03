import { useMemo } from 'react';
import { SaleRecord } from '@/types/sales';
import { getTopSellers } from '@/utils/calculations';
import { formatBRL } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface Props { records: SaleRecord[] }

export default function TargetFunnelChart({ records }: Props) {
  const sellers = useMemo(() => getTopSellers(records, 20).sort((a, b) => b.percentOfTarget - a.percentOfTarget), [records]);

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Performance vs Metas por Vendedor</h3>
      <div className="space-y-3">
        {sellers.map((s) => {
          const pct = Math.min(s.percentOfTarget, 100);
          const color = pct >= 90 ? 'bg-success' : pct >= 70 ? 'bg-warning' : 'bg-destructive';
          const badge = pct >= 90 ? '✅' : pct >= 70 ? '⚠️' : '🔴';
          return (
            <div key={s.name} className={cn("space-y-1", pct < 70 && "pulse-red rounded-lg p-1")}>
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">{badge} {s.name}</span>
                <span className="text-muted-foreground">{formatBRL(s.total)} / {formatBRL(s.target)} ({s.percentOfTarget.toFixed(0)}%)</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
