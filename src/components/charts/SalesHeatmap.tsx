import { useMemo } from 'react';
import { SaleRecord } from '@/types/sales';
import { getHeatmapData } from '@/utils/calculations';
import { DAY_NAMES, formatBRL } from '@/utils/formatters';

interface Props { records: SaleRecord[] }

export default function SalesHeatmap({ records }: Props) {
  const grid = useMemo(() => getHeatmapData(records), [records]);

  const maxVal = useMemo(() => {
    let max = 0;
    grid.forEach(row => row.forEach(v => { if (v > max) max = v; }));
    return max || 1;
  }, [grid]);

  const getColor = (value: number) => {
    const intensity = value / maxVal;
    if (intensity === 0) return 'rgba(0, 212, 170, 0.03)';
    return `rgba(0, 212, 170, ${0.1 + intensity * 0.8})`;
  };

  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Concentração de Vendas por Dia/Hora</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${hours.length}, 1fr)` }}>
            <div />
            {hours.map(h => (
              <div key={h} className="text-center text-xs text-muted-foreground">{h}h</div>
            ))}
            {DAY_NAMES.map((day, dayIdx) => (
              <>
                <div key={`label-${dayIdx}`} className="text-xs text-muted-foreground flex items-center">{day}</div>
                {hours.map((_, hourIdx) => (
                  <div
                    key={`${dayIdx}-${hourIdx}`}
                    className="h-7 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-primary/50"
                    style={{ backgroundColor: getColor(grid[dayIdx][hourIdx]) }}
                    title={`${day} ${hours[hourIdx]}h: ${formatBRL(grid[dayIdx][hourIdx])}`}
                  />
                ))}
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
