import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Database, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelData, generateTemplate } from '@/utils/excelExport';
import { generateMockData } from '@/utils/mockData';
import { SaleRecord } from '@/types/sales';
import { toast } from 'sonner';

interface FileUploadProps {
  onDataLoaded: (data: SaleRecord[]) => void;
  setLoading: (v: boolean) => void;
}

export default function FileUpload({ onDataLoaded, setLoading }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const isCSV = file.name.endsWith('.csv');
      if (isCSV) {
        const text = await file.text();
        const records = parseExcelData(text, true);
        onDataLoaded(records);
        toast.success(`${records.length} registros carregados com sucesso!`);
      } else {
        const buffer = await file.arrayBuffer();
        const records = parseExcelData(buffer);
        onDataLoaded(records);
        toast.success(`${records.length} registros carregados com sucesso!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar arquivo.');
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded, setLoading]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const loadDemo = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const data = generateMockData();
      onDataLoaded(data);
      setLoading(false);
      toast.success(`${data.length} registros demo carregados!`);
    }, 800);
  }, [onDataLoaded, setLoading]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4 fade-in">
      <div className="text-center space-y-3">
        <FileSpreadsheet className="h-16 w-16 text-primary mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Turatti Cervejaria — LogiDash</h2>
        <p className="text-muted-foreground max-w-md">
          Carregue seu relatório Excel para começar a análise de vendas e logística.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`card-surface border-2 border-dashed p-12 rounded-xl text-center cursor-pointer transition-all max-w-lg w-full ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
        }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground font-medium">Arraste um arquivo .xlsx ou .csv aqui</p>
        <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
        <input id="file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleInput} className="hidden" />
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Button onClick={loadDemo} variant="default" size="lg">
          <Database className="h-4 w-4 mr-2" /> Carregar Dados Demo
        </Button>
        <Button onClick={generateTemplate} variant="outline" size="lg">
          <Download className="h-4 w-4 mr-2" /> Baixar Template
        </Button>
      </div>
    </div>
  );
}
