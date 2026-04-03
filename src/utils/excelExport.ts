import * as XLSX from 'xlsx';
import { SaleRecord } from '@/types/sales';

function fuzzyMatch(header: string, patterns: string[]): boolean {
  const h = header.toLowerCase().trim();
  return patterns.some(p => h.includes(p));
}

function findColumn(headers: string[], patterns: string[]): number {
  return headers.findIndex(h => fuzzyMatch(h, patterns));
}

export function parseExcelData(data: ArrayBuffer | string, isCSV = false): SaleRecord[] {
  let workbook: XLSX.WorkBook;
  if (isCSV) {
    workbook = XLSX.read(data, { type: 'string' });
  } else {
    workbook = XLSX.read(data, { type: 'array' });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rows.length < 2) throw new Error('Arquivo vazio ou sem dados suficientes.');

  const headers = rows[0].map((h: any) => String(h || ''));
  
  const dateCol = findColumn(headers, ['data', 'date', 'dt']);
  const sellerCol = findColumn(headers, ['vend', 'seller', 'rep', 'vendedor']);
  const productCol = findColumn(headers, ['prod', 'product', 'item']);
  const channelCol = findColumn(headers, ['canal', 'channel', 'tipo']);
  const regionCol = findColumn(headers, ['regi', 'region', 'uf', 'estado']);
  const qtyCol = findColumn(headers, ['quant', 'qty', 'units', 'un']);
  const unitPriceCol = findColumn(headers, ['unit', 'preco', 'preço', 'price']);
  const totalCol = findColumn(headers, ['val', 'value', 'total', 'receit', 'revenue']);
  const targetCol = findColumn(headers, ['meta', 'target', 'goal']);

  if (dateCol === -1 || totalCol === -1) {
    throw new Error('Colunas obrigatórias não encontradas. Verifique se há colunas de Data e Valor/Total.');
  }

  const records: SaleRecord[] = [];
  let id = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    let date: Date;
    const rawDate = row[dateCol];
    if (typeof rawDate === 'number') {
      date = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    } else {
      date = new Date(rawDate);
    }
    if (isNaN(date.getTime())) continue;

    const total = parseFloat(String(row[totalCol] || 0));
    if (isNaN(total) || total === 0) continue;

    const qty = qtyCol >= 0 ? parseInt(String(row[qtyCol] || 1)) : 1;
    const unitPrice = unitPriceCol >= 0 ? parseFloat(String(row[unitPriceCol] || total / qty)) : total / qty;

    records.push({
      id: `imp_${++id}`,
      date,
      seller: sellerCol >= 0 ? String(row[sellerCol] || 'Desconhecido') : 'Desconhecido',
      product: productCol >= 0 ? String(row[productCol] || 'Produto') : 'Produto',
      channel: channelCol >= 0 ? String(row[channelCol] || 'Direto') : 'Direto',
      region: regionCol >= 0 ? String(row[regionCol] || 'N/A') : 'N/A',
      quantity: isNaN(qty) ? 1 : qty,
      unitPrice: isNaN(unitPrice) ? total : Math.round(unitPrice * 100) / 100,
      total: Math.round(total * 100) / 100,
      sellerTarget: targetCol >= 0 ? parseFloat(String(row[targetCol] || 0)) || undefined : undefined,
    });
  }

  return records.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function generateTemplate(): void {
  const wb = XLSX.utils.book_new();
  
  const sampleData = [
    ['Data', 'Vendedor', 'Produto', 'Canal', 'Região', 'Quantidade', 'Valor_Unitario', 'Total', 'Meta_Vendedor'],
  ];
  const sellers = ['Carlos Silva', 'Ana Oliveira', 'Pedro Santos'];
  const products = ['Pilsen Premium', 'IPA Tropical', 'Chopp Claro 30L'];
  const channels = ['On-Trade', 'Delivery', 'E-commerce', 'Atacado'];
  const regions = ['Sudeste', 'Nordeste', 'Sul'];
  
  for (let i = 0; i < 50; i++) {
    const day = Math.floor(Math.random() * 28) + 1;
    const month = Math.floor(Math.random() * 12) + 1;
    const seller = sellers[i % 3];
    const product = products[i % 3];
    const qty = Math.floor(Math.random() * 10) + 1;
    const price = [12.9, 18.5, 280][i % 3];
    sampleData.push([
      `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/2025`,
      seller, product, channels[i % 4], regions[i % 3],
      qty.toString(), price.toString(), (qty * price).toFixed(2), '80000'
    ]);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
  
  const instructions = [
    ['Coluna', 'Descrição', 'Obrigatório'],
    ['Data', 'Data da venda (DD/MM/YYYY)', 'Sim'],
    ['Vendedor', 'Nome do vendedor', 'Não'],
    ['Produto', 'Nome do produto', 'Não'],
    ['Canal', 'Canal de venda (On-Trade, Delivery, etc.)', 'Não'],
    ['Região', 'Região geográfica', 'Não'],
    ['Quantidade', 'Quantidade vendida', 'Não'],
    ['Valor_Unitario', 'Preço unitário em R$', 'Não'],
    ['Total', 'Valor total da venda em R$', 'Sim'],
    ['Meta_Vendedor', 'Meta mensal do vendedor em R$', 'Não'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, ws2, 'Instruções');
  
  XLSX.writeFile(wb, 'template_vendas_turatti.xlsx');
}

export function exportToExcel(records: SaleRecord[], filename: string): void {
  const data = records.map(r => ({
    Data: r.date.toLocaleDateString('pt-BR'),
    Vendedor: r.seller,
    Produto: r.product,
    Canal: r.channel,
    Região: r.region,
    Quantidade: r.quantity,
    'Valor Unitário': r.unitPrice,
    Total: r.total,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, filename);
}

export function exportToCSV(records: SaleRecord[], filename: string): void {
  const data = records.map(r => ({
    Data: r.date.toLocaleDateString('pt-BR'),
    Vendedor: r.seller,
    Produto: r.product,
    Canal: r.channel,
    Região: r.region,
    Quantidade: r.quantity,
    'Valor Unitário': r.unitPrice,
    Total: r.total,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
