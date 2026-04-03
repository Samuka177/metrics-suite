import { useMemo } from 'react';
import { SaleRecord, KPIData } from '@/types/sales';
import {
  totalRevenue, totalQuantity, avgTicket, yoyChange,
  getCurrentMonthRecords, getSameMonthLastYear,
  getYTDRecords, getYTDLastYear,
  getCurrentWeekRecords, getPrevWeekRecords,
  getMonthlyProjection,
} from '@/utils/calculations';

export function useKPIs(records: SaleRecord[]) {
  return useMemo(() => {
    const now = new Date();
    
    const currentMonth = getCurrentMonthRecords(records, now);
    const sameMonthLY = getSameMonthLastYear(records, now);
    const currentMonthRev = totalRevenue(currentMonth);
    const sameMonthLYRev = totalRevenue(sameMonthLY);

    const ytd = getYTDRecords(records, now);
    const ytdLY = getYTDLastYear(records, now);
    const ytdRev = totalRevenue(ytd);
    const ytdLYRev = totalRevenue(ytdLY);

    const currentWeek = getCurrentWeekRecords(records, now);
    const prevWeek = getPrevWeekRecords(records, now);
    const currentWeekRev = totalRevenue(currentWeek);
    const prevWeekRev = totalRevenue(prevWeek);

    const orders = currentMonth.length;
    const ticket = avgTicket(currentMonth);
    
    const prevMonthRecords = getSameMonthLastYear(records, now);
    const prevTicket = avgTicket(prevMonthRecords);

    const avgTarget = currentMonth.length > 0
      ? currentMonth.reduce((sum, r) => sum + (r.sellerTarget || 0), 0) / new Set(currentMonth.map(r => r.seller)).size
      : 80000;

    const projection = getMonthlyProjection(records, now);

    return {
      currentMonthRev,
      currentMonthChange: yoyChange(currentMonthRev, sameMonthLYRev),
      ytdRev,
      ytdChange: yoyChange(ytdRev, ytdLYRev),
      currentWeekRev,
      weekChange: yoyChange(currentWeekRev, prevWeekRev),
      orders,
      ticket,
      ticketChange: yoyChange(ticket, prevTicket),
      target: avgTarget,
      achieved: currentMonthRev,
      projection,
    };
  }, [records]);
}
