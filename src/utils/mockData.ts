import { SaleRecord } from '@/types/sales';
import { v4Gen } from './idGen';

const SELLERS = [
  'Carlos Silva', 'Ana Oliveira', 'Pedro Santos', 'Maria Costa',
  'João Ferreira', 'Juliana Souza', 'Rafael Lima', 'Fernanda Almeida'
];

const PRODUCTS: { name: string; category: string; price: number }[] = [
  { name: 'Pilsen Premium', category: 'Cervejas', price: 12.90 },
  { name: 'IPA Tropical', category: 'Cervejas', price: 18.50 },
  { name: 'Weiss Clássica', category: 'Cervejas', price: 16.00 },
  { name: 'Stout Imperial', category: 'Cervejas', price: 22.00 },
  { name: 'Lager Gold', category: 'Cervejas', price: 11.50 },
  { name: 'APA Citrus', category: 'Cervejas', price: 17.00 },
  { name: 'Red Ale', category: 'Cervejas', price: 15.50 },
  { name: 'Chopp Claro 30L', category: 'Chopp', price: 280.00 },
  { name: 'Chopp Escuro 30L', category: 'Chopp', price: 310.00 },
  { name: 'Chopp Weiss 30L', category: 'Chopp', price: 320.00 },
  { name: 'Kit Degustação 6un', category: 'Kits', price: 89.90 },
  { name: 'Kit Premium 4un', category: 'Kits', price: 72.00 },
  { name: 'Copo Turatti 300ml', category: 'Acessórios', price: 25.00 },
  { name: 'Growler 1L', category: 'Acessórios', price: 45.00 },
  { name: 'Pack 12 Pilsen', category: 'Kits', price: 139.90 },
];

const CHANNELS = ['On-Trade', 'Delivery', 'E-commerce', 'Atacado'];
const REGIONS = ['Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste', 'Norte'];

const SELLER_TARGETS: Record<string, number> = {
  'Carlos Silva': 85000,
  'Ana Oliveira': 92000,
  'Pedro Santos': 78000,
  'Maria Costa': 80000,
  'João Ferreira': 75000,
  'Juliana Souza': 88000,
  'Rafael Lima': 70000,
  'Fernanda Almeida': 82000,
};

const SELLER_STRENGTH: Record<string, number> = {
  'Carlos Silva': 1.15,
  'Ana Oliveira': 1.25,
  'Pedro Santos': 0.95,
  'Maria Costa': 1.05,
  'João Ferreira': 0.85,
  'Juliana Souza': 1.10,
  'Rafael Lima': 0.80,
  'Fernanda Almeida': 1.00,
};

const SEASONALITY: Record<number, number> = {
  0: 0.75, 1: 0.80, 2: 0.90, 3: 0.95, 4: 1.00, 5: 0.95,
  6: 0.90, 7: 0.95, 8: 1.00, 9: 1.10, 10: 1.25, 11: 1.35,
};

let idCounter = 0;

function genId(): string {
  return `rec_${++idCounter}`;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockData(): SaleRecord[] {
  const records: SaleRecord[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  for (let year = currentYear - 1; year <= currentYear; year++) {
    const yoyGrowth = year === currentYear ? 1.12 : 1.0;

    for (let month = 0; month < 12; month++) {
      if (year === currentYear && month > now.getMonth()) break;

      const seasonFactor = SEASONALITY[month];
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const maxDay = year === currentYear && month === now.getMonth() ? now.getDate() : daysInMonth;

      for (const seller of SELLERS) {
        const strength = SELLER_STRENGTH[seller];
        const ordersThisMonth = Math.floor(rand(15, 35) * seasonFactor * strength);

        for (let o = 0; o < ordersThisMonth; o++) {
          const day = Math.floor(rand(1, maxDay + 1));
          const hour = Math.floor(rand(8, 22));
          const date = new Date(year, month, day, hour, Math.floor(rand(0, 60)));

          const product = pick(PRODUCTS);
          const qty = product.category === 'Chopp' ? Math.floor(rand(1, 4)) : Math.floor(rand(1, 12));
          const unitPrice = product.price * rand(0.95, 1.05) * yoyGrowth;
          const total = qty * unitPrice;

          records.push({
            id: genId(),
            date,
            seller,
            product: product.name,
            channel: pick(CHANNELS),
            region: pick(REGIONS),
            quantity: qty,
            unitPrice: Math.round(unitPrice * 100) / 100,
            total: Math.round(total * 100) / 100,
            sellerTarget: SELLER_TARGETS[seller],
          });
        }
      }
    }
  }

  return records.sort((a, b) => a.date.getTime() - b.date.getTime());
}
