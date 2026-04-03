import { useMemo } from 'react';
import { SaleRecord, InsightData } from '@/types/sales';
import {
  totalRevenue, getCurrentMonthRecords, getSameMonthLastYear,
  getTopSellers, getTopProducts, getChannelBreakdown, yoyChange,
  getMonthlyProjection,
} from '@/utils/calculations';
import { formatBRL, formatPercent, formatNumber } from '@/utils/formatters';
import { TrendingUp, AlertTriangle, Star, ShoppingCart, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { records: SaleRecord[] }

export default function InsightsPanel({ records }: Props) {
  const now = new Date();

  const insights = useMemo((): InsightData[] => {
    if (records.length === 0) return [];
    const result: InsightData[] = [];

    const currentMonth = getCurrentMonthRecords(records, now);
    const prevMonth = getSameMonthLastYear(records, now);
    const currentRev = totalRevenue(currentMonth);
    const prevRev = totalRevenue(prevMonth);
    const change = yoyChange(currentRev, prevRev);

    result.push({
      type: change >= 0 ? 'positive' : 'warning',
      icon: 'trend',
      title: change >= 0 ? 'Crescimento' : 'Queda',
      description: `As vendas do mês atual ${change >= 0 ? 'cresceram' : 'caíram'} ${Math.abs(change).toFixed(1)}% em relação ao mesmo período do ano anterior.`,
    });

    const topSellers = getTopSellers(currentMonth, 1);
    if (topSellers.length > 0) {
      result.push({
        type: 'positive',
        icon: 'star',
        title: 'Top Performer',
        description: `${topSellers[0].name} é o vendedor com melhor performance, representando ${topSellers[0].percentOfTeam.toFixed(1)}% das vendas totais.`,
      });
    }

    const channels = getChannelBreakdown(currentMonth);
    const prevChannels = getChannelBreakdown(prevMonth);
    let bestChannel = { name: '', growth: -Infinity };
    channels.forEach(ch => {
      const prev = prevChannels.find(p => p.channel === ch.channel);
      const growth = prev ? yoyChange(ch.value, prev.value) : 0;
      if (growth > bestChannel.growth) bestChannel = { name: ch.channel, growth };
    });
    if (bestChannel.name) {
      result.push({
        type: 'info',
        icon: 'cart',
        title: 'Canal em Alta',
        description: `${bestChannel.name} é o canal com maior crescimento, ${formatPercent(bestChannel.growth)} vs período anterior.`,
      });
    }

    const topProducts = getTopProducts(currentMonth, 1);
    if (topProducts.length > 0) {
      result.push({
        type: 'positive',
        icon: 'product',
        title: 'Produto Destaque',
        description: `${topProducts[0].name} é o produto mais vendido, com ${formatNumber(topProducts[0].units)} unidades / ${formatBRL(topProducts[0].revenue)} em receita.`,
      });
    }

    const allSellers = getTopSellers(currentMonth, 100);
    const belowTarget = allSellers.filter(s => s.percentOfTarget < 70);
    if (belowTarget.length > 0) {
      result.push({
        type: 'warning',
        icon: 'alert',
        title: 'Atenção',
        description: `${belowTarget.length} vendedor(es) estão abaixo de 70% da meta mensal.`,
      });
    }

    const projection = getMonthlyProjection(records, now);
    const avgTarget = 80000;
    result.push({
      type: 'info',
      icon: 'target',
      title: 'Projeção',
      description: `No ritmo atual, a projeção para o mês é de ${formatBRL(projection)} (${((projection / avgTarget) * 100).toFixed(0)}% da meta).`,
    });

    return result;
  }, [records]);

  const iconMap: Record<string, React.ReactNode> = {
    trend: <TrendingUp className="h-5 w-5" />,
    star: <Star className="h-5 w-5" />,
    cart: <ShoppingCart className="h-5 w-5" />,
    product: <BarChart3 className="h-5 w-5" />,
    alert: <AlertTriangle className="h-5 w-5" />,
    target: <Target className="h-5 w-5" />,
  };

  const borderColorMap: Record<string, string> = {
    positive: 'border-l-success',
    warning: 'border-l-destructive',
    info: 'border-l-secondary',
  };

  if (insights.length === 0) return null;

  return (
    <div className="card-surface p-5 fade-in">
      <h3 className="text-section mb-4">💡 Insights Automáticos</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight, i) => (
          <div key={i} className={cn("bg-muted/30 rounded-lg p-4 border-l-4", borderColorMap[insight.type])}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(insight.type === 'positive' ? 'text-success' : insight.type === 'warning' ? 'text-destructive' : 'text-secondary')}>
                {iconMap[insight.icon]}
              </span>
              <span className="text-sm font-semibold text-foreground">{insight.title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
