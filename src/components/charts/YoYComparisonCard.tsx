import { useMemo } from 'react';
import { SaleRecord } from '@/types/sales';
import { getCurrentMonthRecords, getSameMonthLastYear, getChannelBreakdown, totalRevenue, yoyChange } from '@/utils/calculations';
import { formatBRL, formatPercent } from '@/utils/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { records: SaleRecord[] }

export default function YoYComparisonCard({ records }: Props) {
  const now = new Date();
  
  const data = useMemo(() => {
    const current = getCurrentMonthRecords(records, now);
    const previous = getSameMonthLastYear(records, now);
    const currentTotal = totalRevenue(current);
    const previousTotal = totalRevenue(previous);
    const change = yoyChange(currentTotal, previousTotal);

    const currentChannels = getChannelBreakdown(current);
    const previousChannels = getChannelBreakdown(previous);

    const channelComparison = currentChannels.map(cc => {
      const pc = previousChannels.find(p => p.channel === cc.channel);
      const prevVal = pc?.value || 0;
      return {
        channel: cc.channel,
        current: cc.value,
        previous: prevVal,
        change: yoyChange(cc.value, prevVal),
      };
    });

    return { currentTotal, previousTotal, change, channelComparison };
  }, [records]);

  const isPositive = data.change >= 0;

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">Comparativo Ano a Ano — Mês Atual</h3>
      <div className="text-center mb-6">
        <div className={cn("text-4xl font-bold", isPositive ? "text-success" : "text-destructive")}>
          {isPositive ? <TrendingUp className="inline h-8 w-8 mr-2" /> : <TrendingDown className="inline h-8 w-8 mr-2" />}
          {formatPercent(data.change)}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {formatBRL(data.currentTotal)} vs {formatBRL(data.previousTotal)}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.channelComparison.map(ch => (
          <div key={ch.channel} className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{ch.channel}</p>
            <p className={cn("text-sm font-semibold", ch.change >= 0 ? "text-success" : "text-destructive")}>
              {formatPercent(ch.change)}
            </p>
            <p className="text-xs text-muted-foreground">{formatBRL(ch.current)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
