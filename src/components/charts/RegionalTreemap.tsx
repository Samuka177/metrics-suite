import { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { SaleRecord } from '@/types/sales';
import { getRegionalData } from '@/utils/calculations';
import { formatBRL } from '@/utils/formatters';

const COLORS = ['#00D4AA', '#4A90E2', '#F59E0B', '#22C55E', '#8B5CF6'];

interface Props { records: SaleRecord[] }

export default function RegionalTreemap({ records }: Props) {
  const data = useMemo(() => {
    const regional = getRegionalData(records);
    return regional.map((r, i) => ({
      ...r,
      fill: COLORS[i % COLORS.length],
    }));
  }, [records]);

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Distribuição Regional</h3>
      <ResponsiveContainer width="100%" height={300}>
        <Treemap
          data={data}
          dataKey="value"
          nameKey="name"
          aspectRatio={4 / 3}
          stroke="rgba(255,255,255,0.1)"
          content={({ x, y, width, height, name, value }: any) => {
            if (width < 40 || height < 30) return null;
            return (
              <g>
                <rect x={x} y={y} width={width} height={height} rx={4}
                  fill={data.find(d => d.name === name)?.fill || '#4A90E2'} fillOpacity={0.85} />
                <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#F1F5F9" fontSize={13} fontWeight={600}>
                  {name}
                </text>
                <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="#F1F5F9" fontSize={11} opacity={0.8}>
                  {formatBRL(value)}
                </text>
              </g>
            );
          }}
        />
      </ResponsiveContainer>
    </div>
  );
}
