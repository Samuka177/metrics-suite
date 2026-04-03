import { useState } from 'react';
import { FilterState, SaleRecord } from '@/types/sales';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  filters: FilterState;
  onUpdate: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  records: SaleRecord[];
}

export default function FilterBar({ filters, onUpdate, onReset, records }: FilterBarProps) {
  const channels = [...new Set(records.map(r => r.channel))];
  const sellers = [...new Set(records.map(r => r.seller))];
  const regions = [...new Set(records.map(r => r.region))];

  const toggleItem = (key: 'channels' | 'sellers' | 'regions', item: string) => {
    const current = filters[key];
    const next = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    onUpdate(key, next);
  };

  return (
    <div className="card-surface px-4 py-3 flex flex-wrap items-center gap-3 sticky top-[60px] z-40 no-print">
      <Filter className="h-4 w-4 text-muted-foreground" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yy') : 'De'} — {filters.dateTo ? format(filters.dateTo, 'dd/MM/yy') : 'Até'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarPicker
            mode="range"
            selected={{ from: filters.dateFrom || undefined, to: filters.dateTo || undefined }}
            onSelect={(range: any) => {
              onUpdate('dateFrom', range?.from || null);
              onUpdate('dateTo', range?.to || null);
            }}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <MultiSelect label="Canal" items={channels} selected={filters.channels} onToggle={(v) => toggleItem('channels', v)} />
      <MultiSelect label="Vendedor" items={sellers} selected={filters.sellers} onToggle={(v) => toggleItem('sellers', v)} />
      <MultiSelect label="Região" items={regions} selected={filters.regions} onToggle={(v) => toggleItem('regions', v)} />

      <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-muted-foreground">
        <X className="h-3 w-3 mr-1" /> Limpar
      </Button>
    </div>
  );
}

function MultiSelect({ label, items, selected, onToggle }: { label: string; items: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          {label} {selected.length > 0 && `(${selected.length})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {items.map(item => (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={cn(
                "w-full text-left text-xs px-2 py-1.5 rounded transition-colors",
                selected.includes(item) ? "bg-primary/20 text-primary" : "hover:bg-muted text-foreground"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
