import { useState, useMemo, useCallback } from 'react';
import { SaleRecord } from '@/types/sales';
import { useSalesData } from '@/hooks/useSalesData';
import { useFilters } from '@/hooks/useFilters';
import { useKPIs } from '@/hooks/useKPIs';
import { filterRecords, filterByDateRange } from '@/utils/calculations';
import Header from '@/components/layout/Header';
import FilterBar from '@/components/layout/FilterBar';
import FileUpload from '@/components/upload/FileUpload';
import KPIGrid from '@/components/kpi/KPIGrid';
import MonthlySalesChart from '@/components/charts/MonthlySalesChart';
import WeeklyTrendChart from '@/components/charts/WeeklyTrendChart';
import ChannelDonutChart from '@/components/charts/ChannelDonutChart';
import ChannelStackedChart from '@/components/charts/ChannelStackedChart';
import TopSellersChart from '@/components/charts/TopSellersChart';
import TopProductsChart from '@/components/charts/TopProductsChart';
import YoYComparisonCard from '@/components/charts/YoYComparisonCard';
import SalesHeatmap from '@/components/charts/SalesHeatmap';
import RegionalTreemap from '@/components/charts/RegionalTreemap';
import TargetFunnelChart from '@/components/charts/TargetFunnelChart';
import InsightsPanel from '@/components/insights/InsightsPanel';
import TransactionsTable from '@/components/table/TransactionsTable';
import { Button } from '@/components/ui/button';
import { Trash2, Upload } from 'lucide-react';

export default function Index() {
  const { records, setRecords, loading, setLoading, clearData } = useSalesData();
  const { filters, updateFilter, resetFilters } = useFilters();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const filteredRecords = useMemo(() => {
    let result = records;
    if (filters.dateFrom && filters.dateTo) {
      result = filterByDateRange(result, filters.dateFrom, filters.dateTo);
    }
    result = filterRecords(result, filters.channels, filters.sellers, filters.regions);
    return result;
  }, [records, filters]);

  // KPIs use ALL records (not date-filtered) for YoY comparisons
  const kpis = useKPIs(records);

  const handlePrint = useCallback(() => window.print(), []);
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      if (!prev) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
      return !prev;
    });
  }, []);

  const hasData = records.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Processando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} onPrint={handlePrint} hasData={hasData} />

      {!hasData ? (
        <FileUpload onDataLoaded={setRecords} setLoading={setLoading} />
      ) : (
        <>
          <FilterBar filters={filters} onUpdate={updateFilter} onReset={resetFilters} records={records} />
          
          <main className="p-4 space-y-4 max-w-[1600px] mx-auto">
            <div className="flex justify-end gap-2 no-print">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { clearData(); }}>
                <Trash2 className="h-3 w-3 mr-1" /> Limpar Dados
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => document.getElementById('reupload-input')?.click()}>
                <Upload className="h-3 w-3 mr-1" /> Novo Upload
              </Button>
              <input id="reupload-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLoading(true);
                try {
                  const { parseExcelData } = await import('@/utils/excelExport');
                  if (file.name.endsWith('.csv')) {
                    const text = await file.text();
                    setRecords(parseExcelData(text, true));
                  } else {
                    const buffer = await file.arrayBuffer();
                    setRecords(parseExcelData(buffer));
                  }
                } catch { } finally { setLoading(false); }
              }} />
            </div>

            <KPIGrid data={kpis} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MonthlySalesChart records={records} />
              <WeeklyTrendChart records={records} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChannelDonutChart records={filteredRecords} />
              <ChannelStackedChart records={records} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TopSellersChart records={filteredRecords} />
              <TopProductsChart records={filteredRecords} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <YoYComparisonCard records={records} />
              <SalesHeatmap records={filteredRecords} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RegionalTreemap records={filteredRecords} />
              <TargetFunnelChart records={filteredRecords} />
            </div>

            <InsightsPanel records={records} />
            <TransactionsTable records={filteredRecords} />
          </main>
        </>
      )}
    </div>
  );
}
