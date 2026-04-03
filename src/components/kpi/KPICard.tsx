import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatBRL, formatNumber, formatPercent } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: number;
  change: number;
  format: 'currency' | 'number' | 'percent';
  subtitle?: string;
  target?: number;
  achieved?: number;
}

export default function KPICard({ label, value, change, format: fmt, subtitle, target, achieved }: KPICardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  const displayValue = fmt === 'currency' ? formatBRL(value) : fmt === 'percent' ? `${value.toFixed(1)}%` : formatNumber(value);

  const targetPercent = target && achieved ? Math.min((achieved / target) * 100, 100) : null;
  const targetColor = targetPercent !== null
    ? targetPercent >= 90 ? 'bg-success' : targetPercent >= 70 ? 'bg-warning' : 'bg-destructive'
    : '';

  return (
    <div className="card-surface p-5 space-y-3 fade-in">
      <p className="text-label">{label}</p>
      <p className="text-value animate-count">{displayValue}</p>
      
      <div className="flex items-center gap-2">
        {isNeutral ? (
          <Minus className="h-4 w-4 text-muted-foreground" />
        ) : isPositive ? (
          <TrendingUp className="h-4 w-4 text-success" />
        ) : (
          <TrendingDown className="h-4 w-4 text-destructive" />
        )}
        <span className={cn(
          "text-sm font-medium",
          isPositive ? "text-success" : isNeutral ? "text-muted-foreground" : "text-destructive"
        )}>
          {formatPercent(change)}
        </span>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>

      {targetPercent !== null && target && achieved !== undefined && (
        <div className="space-y-1">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", targetColor)} style={{ width: `${targetPercent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {targetPercent.toFixed(0)}% da meta • Faltam {formatBRL(Math.max(0, target - achieved))}
          </p>
        </div>
      )}
    </div>
  );
}
