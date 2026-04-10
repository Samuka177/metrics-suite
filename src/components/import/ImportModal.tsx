import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ParsedRow {
  nome: string;
  endereco: string;
  telefone?: string;
  peso?: number;
  volume?: number;
  observacoes?: string;
  valid: boolean;
  error?: string;
}

function autoMapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const lower = headers.map(h => (h || '').toLowerCase().trim());
  const find = (keys: string[]) => lower.findIndex(h => keys.some(k => h.includes(k)));

  const nomeIdx = find(['nome', 'cliente', 'destinatario', 'razao', 'name']);
  const endIdx = find(['endereco', 'endereço', 'address', 'logradouro']);
  const telIdx = find(['telefone', 'tel', 'phone', 'celular']);
  const pesoIdx = find(['peso', 'weight', 'kg']);
  const volIdx = find(['volume', 'vol', 'm³', 'm3']);
  const obsIdx = find(['obs', 'observ', 'nota', 'note']);

  if (nomeIdx >= 0) map.nome = nomeIdx;
  if (endIdx >= 0) map.endereco = endIdx;
  if (telIdx >= 0) map.telefone = telIdx;
  if (pesoIdx >= 0) map.peso = pesoIdx;
  if (volIdx >= 0) map.volume = volIdx;
  if (obsIdx >= 0) map.observacoes = obsIdx;

  return map;
}

function parseRows(data: any[][], colMap: Record<string, number>): ParsedRow[] {
  return data.slice(1).map(row => {
    const nome = String(row[colMap.nome] || '').trim();
    const endereco = String(row[colMap.endereco ?? -1] || '').trim();
    const telefone = colMap.telefone != null ? String(row[colMap.telefone] || '').trim() : undefined;
    const peso = colMap.peso != null ? Number(row[colMap.peso]) || undefined : undefined;
    const volume = colMap.volume != null ? Number(row[colMap.volume]) || undefined : undefined;
    const observacoes = colMap.observacoes != null ? String(row[colMap.observacoes] || '').trim() || undefined : undefined;

    const valid = nome.length > 0 && endereco.length > 0;
    return { nome, endereco, telefone, peso, volume, observacoes, valid, error: !valid ? 'Nome ou endereço vazio' : undefined };
  }).filter(r => r.nome || r.endereco); // skip fully empty rows
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nome', 'Endereço', 'Telefone', 'Peso (kg)', 'Volume (m³)', 'Observações'],
    ['Bar do Zé', 'Rua Augusta, 500 - Consolação, SP', '(11) 99999-0001', 15, 0.3, 'Deixar com porteiro'],
    ['Restaurante Sabor', 'Av. Paulista, 1578 - Bela Vista, SP', '(11) 99999-0002', 25, 0.5, ''],
  ]);
  ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Paradas');
  XLSX.writeFile(wb, 'template_importacao_rotafacil.xlsx');
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const { importParadas } = useApp();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    try {
      const isCSV = file.name.endsWith('.csv');
      let data: any[][];
      if (isCSV) {
        const text = await file.text();
        const wb = XLSX.read(text, { type: 'string' });
        data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
      } else {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer);
        data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
      }
      if (data.length < 2) { toast.error('Arquivo vazio ou sem dados'); return; }
      const colMap = autoMapColumns(data[0].map(String));
      if (colMap.nome == null || colMap.endereco == null) {
        toast.error('Colunas "Nome" e "Endereço" não encontradas automaticamente.');
        return;
      }
      const parsed = parseRows(data, colMap);
      setRows(parsed);
      setFileName(file.name);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ler arquivo');
    }
  }, []);

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const confirmar = () => {
    importParadas(validRows.map(r => ({
      nome: r.nome,
      endereco: r.endereco,
      tipo: 'Delivery' as const,
      telefone: r.telefone,
      peso: r.peso,
      volume: r.volume,
      observacoes: r.observacoes,
    })));
    toast.success(`${validRows.length} paradas importadas!`);
    setRows([]);
    setFileName('');
    onOpenChange(false);
  };

  const limpar = () => { setRows([]); setFileName(''); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar Paradas</DialogTitle></DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); if (fileRef.current) fileRef.current.value = ''; }} />
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">Selecione um arquivo .csv ou .xlsx</p>
              <p className="text-xs text-muted-foreground mt-1">As colunas serão mapeadas automaticamente</p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Baixar template de exemplo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                <FileSpreadsheet className="inline h-4 w-4 mr-1" />{fileName}
              </p>
              <Button variant="ghost" size="sm" onClick={limpar}>Limpar</Button>
            </div>

            <div className="flex gap-2">
              <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />{validRows.length} válidas</Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{invalidRows.length} inválidas</Badge>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {rows.slice(0, 50).map((r, i) => (
                <Card key={i} className={!r.valid ? 'border-destructive' : ''}>
                  <CardContent className="p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{r.nome || '(vazio)'}</p>
                        <p className="text-muted-foreground truncate">{r.endereco || '(vazio)'}</p>
                        {r.peso && <span className="text-muted-foreground">{r.peso}kg</span>}
                        {r.volume && <span className="text-muted-foreground ml-2">{r.volume}m³</span>}
                      </div>
                      {!r.valid && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rows.length > 50 && <p className="text-xs text-muted-foreground text-center">... e mais {rows.length - 50}</p>}
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <DialogFooter>
            <Button onClick={confirmar} disabled={validRows.length === 0} className="w-full">
              Importar {validRows.length} paradas
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
