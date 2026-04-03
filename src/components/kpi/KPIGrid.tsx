import KPICard from './KPICard';

interface KPIGridProps {
  data: {
    currentMonthRev: number;
    currentMonthChange: number;
    ytdRev: number;
    ytdChange: number;
    currentWeekRev: number;
    weekChange: number;
    orders: number;
    ticket: number;
    ticketChange: number;
    target: number;
    achieved: number;
    projection: number;
  };
}

export default function KPIGrid({ data }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard label="Vendas — Mês Atual" value={data.currentMonthRev} change={data.currentMonthChange} format="currency" subtitle="vs mesmo mês ano anterior" />
      <KPICard label="Vendas — YTD" value={data.ytdRev} change={data.ytdChange} format="currency" subtitle="vs mesmo período ano anterior" />
      <KPICard label="Vendas — Semana" value={data.currentWeekRev} change={data.weekChange} format="currency" subtitle="vs semana anterior" />
      <KPICard label="Volume de Pedidos" value={data.orders} change={0} format="number" subtitle={`Ticket médio: R$ ${data.ticket.toFixed(2)}`} />
      <KPICard label="Meta de Vendas" value={data.achieved} change={0} format="currency" target={data.target} achieved={data.achieved} />
      <KPICard label="Ticket Médio" value={data.ticket} change={data.ticketChange} format="currency" subtitle="vs mês anterior" />
    </div>
  );
}
