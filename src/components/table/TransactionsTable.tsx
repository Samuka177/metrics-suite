import { useState, useMemo } from 'react';
import { SaleRecord } from '@/types/sales';
import { formatBRL, formatDateBR } from '@/utils/formatters';
import { exportToExcel, exportToCSV } from '@/utils/excelExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download } from 'lucide-react';

interface Props { records: SaleRecord[] }

const PAGE_SIZE = 25;

export default function TransactionsTable({ records }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<keyof SaleRecord>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = records.filter(r =>
      !q || r.seller.toLowerCase().includes(q) || r.product.toLowerCase().includes(q) ||
      r.channel.toLowerCase().includes(q) || r.region.toLowerCase().includes(q)
    );
    result.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av instanceof Date && bv instanceof Date) return sortDir === 'asc' ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return result;
  }, [records, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: keyof SaleRecord) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const columns: { key: keyof SaleRecord; label: string }[] = [
    { key: 'date', label: 'Data' },
    { key: 'seller', label: 'Vendedor' },
    { key: 'product', label: 'Produto' },
    { key: 'channel', label: 'Canal' },
    { key: 'region', label: 'Região' },
    { key: 'quantity', label: 'Qtd' },
    { key: 'unitPrice', label: 'Valor Unit.' },
    { key: 'total', label: 'Total' },
  ];

  return (
    <div className="card-surface p-5 fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-section">Transações</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-8 h-8 w-48 text-sm" />
          </div>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => exportToCSV(filtered, 'turatti_vendas.csv')}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => exportToExcel(filtered, 'turatti_vendas.xlsx')}>
            <Download className="h-3 w-3 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map(col => (
                <th key={col.key} onClick={() => toggleSort(col.key)} className="text-left py-2 px-3 text-xs text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap">
                  {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map(r => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="py-2 px-3 whitespace-nowrap">{formatDateBR(r.date)}</td>
                <td className="py-2 px-3">{r.seller}</td>
                <td className="py-2 px-3">{r.product}</td>
                <td className="py-2 px-3">{r.channel}</td>
                <td className="py-2 px-3">{r.region}</td>
                <td className="py-2 px-3 text-right">{r.quantity}</td>
                <td className="py-2 px-3 text-right">{formatBRL(r.unitPrice)}</td>
                <td className="py-2 px-3 text-right font-medium">{formatBRL(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
        <span>Mostrando {pageData.length} de {filtered.length} registros</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="flex items-center px-2">{page + 1} / {totalPages || 1}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
        </div>
      </div>
    </div>
  );
}
