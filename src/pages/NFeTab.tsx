import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Plus, X, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ParsedNote {
  numero?: string; serie?: string; chave?: string;
  emitente_nome?: string; emitente_cnpj?: string;
  destinatario_nome?: string; destinatario_cnpj?: string;
  destinatario_endereco?: string; destinatario_municipio?: string;
  destinatario_uf?: string; destinatario_cep?: string;
  valor_total?: number; peso_kg?: number; volume_m3?: number;
  itens?: { nome: string; quantidade?: number; unidade?: string; valor?: number }[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NFeTab() {
  const { addParada } = useApp();
  const { profile } = useAuth();
  const [nfe, setNfe] = useState<ParsedNote | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourceFormat, setSourceFormat] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setNfe(null); setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const { data, error: fnErr } = await supabase.functions.invoke('parse-fiscal-note', {
        body: { filename: file.name, mimeType: file.type, base64 },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setNfe(data.parsed);
      setSourceFormat(data.source_format);

      // Salva no banco
      if (profile?.company_id) {
        await supabase.from('fiscal_notes').insert({
          company_id: profile.company_id,
          source_format: data.source_format,
          ...data.parsed,
          raw_extracted: data.parsed,
        });
      }
      toast.success('Nota lida com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addToRoute = async () => {
    if (!nfe) return;
    const enderecoCompleto = [
      nfe.destinatario_endereco,
      nfe.destinatario_municipio,
      nfe.destinatario_uf,
      nfe.destinatario_cep,
    ].filter(Boolean).join(', ');

    await addParada({
      nome: nfe.destinatario_nome || `NF ${nfe.numero || ''}`,
      endereco: enderecoCompleto,
      tipo: 'Delivery',
      peso: nfe.peso_kg,
      volume: nfe.volume_m3,
      produtos: (nfe.itens || []).map(p => ({
        nome: p.nome, quantidade: String(p.quantidade ?? ''), unidade: p.unidade || '',
      })),
    });
    toast.success('Adicionada à rota com geocodificação automática!');
    setNfe(null);
  };

  return (
    <div className="space-y-4 fade-in pb-4">
      <input ref={fileRef} type="file"
        accept=".xml,.pdf,.csv,.txt,image/*"
        onChange={handleFile} className="hidden" id="nfe-upload" />
      <label htmlFor="nfe-upload"
        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
        {loading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary mb-3 animate-spin" />
            <p className="font-medium">Processando com IA...</p>
            <p className="text-xs text-muted-foreground mt-1">Extraindo dados da nota</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Importar nota fiscal</p>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              XML (NF-e), PDF (DANFE), CSV, foto da nota — IA extrai endereço, itens, peso
            </p>
          </>
        )}
      </label>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {nfe && (
        <Card className="fade-in">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{nfe.destinatario_nome}</p>
                <p className="text-xs text-muted-foreground">
                  NF {nfe.numero || '—'} · {nfe.destinatario_cnpj || '—'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Sparkles className="h-3 w-3" /> Extraído via {sourceFormat?.toUpperCase()}
                </p>
              </div>
              <button onClick={() => setNfe(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 space-y-1">
                <p className="text-sm font-medium text-primary">{nfe.destinatario_endereco}</p>
                <p className="text-xs text-muted-foreground">
                  {[nfe.destinatario_municipio, nfe.destinatario_uf, nfe.destinatario_cep].filter(Boolean).join(' · ')}
                </p>
              </CardContent>
            </Card>

            {(nfe.peso_kg || nfe.volume_m3 || nfe.valor_total) && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                {nfe.valor_total != null && <div className="p-2 bg-muted rounded">R$ {nfe.valor_total.toFixed(2)}</div>}
                {nfe.peso_kg != null && <div className="p-2 bg-muted rounded">{nfe.peso_kg} kg</div>}
                {nfe.volume_m3 != null && <div className="p-2 bg-muted rounded">{nfe.volume_m3} m³</div>}
              </div>
            )}

            {nfe.itens && nfe.itens.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Itens ({nfe.itens.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {nfe.itens.map((p, i) => (
                    <div key={i} className="text-xs p-2 rounded border">
                      {p.nome} — {p.quantidade ?? ''} {p.unidade || ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={addToRoute} className="flex-1">
                <Plus className="h-4 w-4 mr-1" /> Adicionar à rota
              </Button>
              <Button variant="outline" onClick={() => setNfe(null)}>Limpar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!nfe && !error && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">Nenhuma nota importada</p>
            <p className="text-sm text-muted-foreground mt-1">
              A IA lê o documento, extrai endereço/itens e geocodifica para roteirização.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
