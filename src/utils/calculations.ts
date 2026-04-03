import { SaleRecord } from '@/types/sales';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear,
  subMonths, subWeeks, subYears, isSameMonth, isSameYear,
  getISOWeek, getDay, getHours, getDaysInMonth, differenceInDays,
  isWithinInterval, getMonth, getYear
} from 'date-fns';

export function filterByDateRange(records: SaleRecord[], from: Date, to: Date): SaleRecord[] {
  return records.filter(r => r.date >= from && r.date <= to);
}

export function filterRecords(
  records: SaleRecord[],
  channels: string[],
  sellers: string[],
  regions: string[]
): SaleRecord[] {
  let result = records;
  if (channels.length > 0) result = result.filter(r => channels.includes(r.channel));
  if (sellers.length > 0) result = result.filter(r => sellers.includes(r.seller));
  if (regions.length > 0) result = result.filter(r => regions.includes(r.region));
  return result;
}

export function totalRevenue(records: SaleRecord[]): number {
  return records.reduce((sum, r) => sum + r.total, 0);
}

export function totalQuantity(records: SaleRecord[]): number {
  return records.reduce((sum, r) => sum + r.quantity, 0);
}

export function avgTicket(records: SaleRecord[]): number {
  return records.length > 0 ? totalRevenue(records) / records.length : 0;
}

export function yoyChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function getCurrentMonthRecords(records: SaleRecord[], now: Date): SaleRecord[] {
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return filterByDateRange(records, start, end);
}

export function getSameMonthLastYear(records: SaleRecord[], now: Date): SaleRecord[] {
  const lastYear = subYears(now, 1);
  return getCurrentMonthRecords(records, lastYear);
}

export function getYTDRecords(records: SaleRecord[], now: Date): SaleRecord[] {
  const start = startOfYear(now);
  return filterByDateRange(records, start, now);
}

export function getYTDLastYear(records: SaleRecord[], now: Date): SaleRecord[] {
  const lastYear = subYears(now, 1);
  const start = startOfYear(lastYear);
  const sameDay = new Date(lastYear.getFullYear(), now.getMonth(), now.getDate());
  return filterByDateRange(records, start, sameDay);
}

export function getCurrentWeekRecords(records: SaleRecord[], now: Date): SaleRecord[] {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return filterByDateRange(records, start, end);
}

export function getPrevWeekRecords(records: SaleRecord[], now: Date): SaleRecord[] {
  const prevWeek = subWeeks(now, 1);
  const start = startOfWeek(prevWeek, { weekStartsOn: 1 });
  const end = endOfWeek(prevWeek, { weekStartsOn: 1 });
  return filterByDateRange(records, start, end);
}

export function getMonthlyData(records: SaleRecord[], year: number) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthRecords = records.filter(r => getMonth(r.date) === i && getYear(r.date) === year);
    return {
      month: i,
      total: totalRevenue(monthRecords),
      quantity: totalQuantity(monthRecords),
      orders: monthRecords.length,
    };
  });
  return months;
}

export function getWeeklyData(records: SaleRecord[], weeks: number = 12) {
  const now = new Date();
  const result = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekDate = subWeeks(now, i);
    const start = startOfWeek(weekDate, { weekStartsOn: 1 });
    const end = endOfWeek(weekDate, { weekStartsOn: 1 });
    const weekRecords = filterByDateRange(records, start, end);
    result.push({
      week: getISOWeek(weekDate),
      total: totalRevenue(weekRecords),
      avgDaily: totalRevenue(weekRecords) / 7,
      orders: weekRecords.length,
    });
  }
  return result;
}

export function getChannelBreakdown(records: SaleRecord[]) {
  const map = new Map<string, number>();
  records.forEach(r => map.set(r.channel, (map.get(r.channel) || 0) + r.total));
  const total = totalRevenue(records);
  return Array.from(map.entries()).map(([channel, value]) => ({
    channel,
    value,
    percent: total > 0 ? (value / total) * 100 : 0,
  }));
}

export function getTopSellers(records: SaleRecord[], limit: number = 10) {
  const map = new Map<string, { total: number; target: number; orders: number }>();
  records.forEach(r => {
    const existing = map.get(r.seller) || { total: 0, target: r.sellerTarget || 0, orders: 0 };
    existing.total += r.total;
    existing.orders += 1;
    if (r.sellerTarget) existing.target = r.sellerTarget;
    map.set(r.seller, existing);
  });
  const teamTotal = totalRevenue(records);
  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      total: data.total,
      target: data.target,
      orders: data.orders,
      percentOfTeam: teamTotal > 0 ? (data.total / teamTotal) * 100 : 0,
      percentOfTarget: data.target > 0 ? (data.total / data.target) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function getTopProducts(records: SaleRecord[], limit: number = 10, by: 'revenue' | 'volume' = 'revenue') {
  const map = new Map<string, { revenue: number; units: number }>();
  records.forEach(r => {
    const existing = map.get(r.product) || { revenue: 0, units: 0 };
    existing.revenue += r.total;
    existing.units += r.quantity;
    map.set(r.product, existing);
  });
  return Array.from(map.entries())
    .map(([name, data]) => ({ name, revenue: data.revenue, units: data.units }))
    .sort((a, b) => by === 'revenue' ? b.revenue - a.revenue : b.units - a.units)
    .slice(0, limit);
}

export function getHeatmapData(records: SaleRecord[]) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(17).fill(0));
  records.forEach(r => {
    const day = (getDay(r.date) + 6) % 7; // Mon=0
    const hour = getHours(r.date);
    if (hour >= 6 && hour <= 22) {
      grid[day][hour - 6] += r.total;
    }
  });
  return grid;
}

export function getRegionalData(records: SaleRecord[]) {
  const map = new Map<string, number>();
  records.forEach(r => map.set(r.region, (map.get(r.region) || 0) + r.total));
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function getMonthlyProjection(records: SaleRecord[], now: Date): number {
  const monthStart = startOfMonth(now);
  const daysPassed = differenceInDays(now, monthStart) + 1;
  const daysInMonth = getDaysInMonth(now);
  const mtdRevenue = totalRevenue(getCurrentMonthRecords(records, now));
  const dailyRate = mtdRevenue / daysPassed;
  return dailyRate * daysInMonth;
}

export function getChannelMonthlyData(records: SaleRecord[], months: number = 6) {
  const now = new Date();
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const monthRecords = filterByDateRange(records, start, end);
    const breakdown = getChannelBreakdown(monthRecords);
    const entry: Record<string, any> = { month: getMonth(monthDate) };
    breakdown.forEach(b => { entry[b.channel] = b.value; });
    result.push(entry);
  }
  return result;
}
