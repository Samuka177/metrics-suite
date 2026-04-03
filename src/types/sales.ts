export interface SaleRecord {
  id: string;
  date: Date;
  seller: string;
  product: string;
  channel: string;
  region: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sellerTarget?: number;
}

export interface FilterState {
  dateFrom: Date | null;
  dateTo: Date | null;
  channels: string[];
  sellers: string[];
  regions: string[];
  compareWith: 'prev_month' | 'same_month_ly' | 'prev_quarter';
}

export interface KPIData {
  label: string;
  value: number;
  change: number;
  format: 'currency' | 'number' | 'percent';
  subtitle?: string;
  target?: number;
  achieved?: number;
}

export interface InsightData {
  type: 'positive' | 'warning' | 'info';
  icon: string;
  title: string;
  description: string;
}
