import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Upload, Plus, X, AlertCircle, AlertTriangle, Loader2, Sparkles, Edit2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logAction } from '@/utils/audit';

interface ParsedNote {
  numero?: string; serie?: string; chave?: string;
  emitente_nome?: string; emitente_cnpj?: string;
  destinatario_nome?: string; destinatario_cnpj?: string;
  destinatario_logradouro?: string; destinatario_numero?: string; destinatario_bairro?: string;
  destinatario_endereco?: string; destinatario_municipio?: string;
  destinatario_uf?: string; destinatario_cep?: string;
  valor_total?: number; peso_kg?: number; volume_m3?: number;
  itens?: { nome: string; quantidade?: number; unidade?: string; valor?: number }[];
}

const FIELD_LABELS: Record<string, string> = {
  logradouro: 'Logradouro (rua/avenida)',
  numero: 'Número',
  municipio: 'Município',
  uf: 'UF',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NFeTab() {
  const { addParada } = useApp();
  const { profile } = useAuth();
  const [nfe, setNfe] = useState<ParsedNote | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ logradouro: '', numero: '', bairro: '', municipio: '', uf: '', cep: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [sourceFormat, setSourceFormat] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!profile?.company_id) return;
    setError(''); setNfe(null); setMissing([]); setWarnings([]); setEditing(false); setLoading(true);
    setProgress(10); setProgressLabel('Lendo arquivo...');
    try {
      const base64 = await fileToBase64(file);
      setProgress(40); setProgressLabel('Enviando para a IA...');
      const { data, error: fnErr } = await supabase.functions.invoke('parse-fiscal-note', {
        body: { filename: file.name, mimeType: file.type, base64 },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setProgress(80); setProgressLabel('Salvando nota...');
      const parsed: ParsedNote = data.parsed;
      const missingFields: string[] = data.missing_fields || [];
      const warns: string[] = data.warnings || [];
      setNfe(parsed);
      setMissing(missingFields);
      setWarnings(warns);
      setSourceFormat(data.source_format);
      setEdit({
        logradouro: parsed.destinatario_logradouro || '',
        numero: parsed.destinatario_numero || '',
        bairro: parsed.destinatario_bairro || '',
        municipio: parsed.destinatario_municipio || '',
        uf: parsed.destinatario_uf || '',
        cep: parsed.destinatario_cep || '',
      });

      const status = missingFields.length > 0 ? 'incompleto' : 'parsed';
      const errMsg = missingFields.length > 0
        ? `Campos não lidos pela IA: ${missingFields.map(f => FIELD_LABELS[f] || f).join(', ')}`
        : warns.length > 0 ? warns.join(' · ') : null;

      // Remove campos auxiliares (logradouro/numero/bairro) que não existem na tabela
      const { destinatario_logradouro, destinatario_numero, destinatario_bairro, ...parsedDb } = parsed;
      const { data: saved } = await supabase.from('fiscal_notes').insert({
        company_id: profile.company_id,
        source_format: data.source_format,
        arquivo_nome: file.name,
        arquivo_tipo: file.type,
        status,
        error_message: errMsg,
        ...parsedDb,
        raw_extracted: parsed as any,
      }).select().single();
      await logAction(profile.company_id, 'upload_nota', { type: 'fiscal_note', id: saved?.id }, {
        arquivo: file.name, formato: data.source_format,
        missing_fields: missingFields, warnings: warns,
      });
      setProgress(100);
      if (missingFields.length > 0) {
        toast.warning(`Nota lida, mas ${missingFields.length} campo(s) faltando. Corrija manualmente.`);
        setEditing(true);
      } else if (warns.length > 0) {
        toast.warning('Nota lida com avisos. Verifique antes de roteirizar.');
      } else {
        toast.success('Nota lida com sucesso!');
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao processar arquivo';
      setError(msg);
      // registrar nota em status erro
      if (profile?.company_id) {
        const { data: saved } = await supabase.from('fiscal_notes').insert({
          company_id: profile.company_id,
          source_format: 'unknown',
          arquivo_nome: file.name, arquivo_tipo: file.type,
          status: 'erro', error_message: msg,
        }).select().single();
        await logAction(profile.company_id, 'erro_parse', { type: 'fiscal_note', id: saved?.id }, {
          arquivo: file.name, erro: msg,
        });
      }
    } finally {
      setLoading(false);
      setTimeout(() => { setProgress(0); setProgressLabel(''); }, 800);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const applyEdit = () => {
    if (!nfe) return;
    const enderecoTxt = [
      edit.logradouro && edit.numero ? `${edit.logradouro}, ${edit.numero}` : edit.logradouro,
      edit.bairro,
    ].filter(Boolean).join(', ');
    const updated: ParsedNote = {
      ...nfe,
      destinatario_logradouro: edit.logradouro || undefined,
      destinatario_numero: edit.numero || undefined,
      destinatario_bairro: edit.bairro || undefined,
      destinatario_endereco: enderecoTxt || nfe.destinatario_endereco,
      destinatario_municipio: edit.municipio || undefined,
      destinatario_uf: edit.uf.toUpperCase() || undefined,
      destinatario_cep: edit.cep || undefined,
    };
    setNfe(updated);
    // Recalcula missing
    const stillMissing: string[] = [];
    if (!edit.logradouro.trim()) stillMissing.push('logradouro');
    if (!edit.numero.trim()) stillMissing.push('numero');
    if (!edit.municipio.trim()) stillMissing.push('municipio');
    if (!edit.uf.trim()) stillMissing.push('uf');
    setMissing(stillMissing);
    if (stillMissing.length === 0) {
      setEditing(false);
      toast.success('Endereço corrigido');
    } else {
      toast.error(`Ainda faltam: ${stillMissing.map(f => FIELD_LABELS[f]).join(', ')}`);
    }
  };

  const addToRoute = async () => {
    if (!nfe) return;
    if (missing.length > 0) {
      toast.error(`Corrija os campos faltantes antes de adicionar à rota: ${missing.map(f => FIELD_LABELS[f]).join(', ')}`);
      setEditing(true);
      return;
    }
    const enderecoCompleto = [
      nfe.destinatario_endereco, nfe.destinatario_municipio,
      nfe.destinatario_uf, nfe.destinatario_cep,
    ].filter(Boolean).join(', ');

    await addParada({
      nome: nfe.destinatario_nome || `NF ${nfe.numero || ''}`,
      endereco: enderecoCompleto,
      tipo: 'Delivery',
      peso: nfe.peso_kg, volume: nfe.volume_m3,
      produtos: (nfe.itens || []).map(p => ({
        nome: p.nome, quantidade: String(p.quantidade ?? ''), unidade: p.unidade || '',
      })),
    });
    toast.success('Adicionada à rota!');
    setNfe(null); setMissing([]); setWarnings([]);
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
            <p className="font-medium">{progressLabel || 'Processando com IA...'}</p>
            <Progress value={progress} className="w-full mt-3 max-w-xs" />
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
          <CardContent className="p-4 flex items-start gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Falha no parsing</p>
              <p className="text-xs">{error}</p>
              <p className="text-xs mt-2 text-muted-foreground">
                Veja em <strong>Notas Fiscais</strong> para reprocessar.
              </p>
            </div>
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
              <button onClick={() => setNfe(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 space-y-1">
                <p className="text-sm font-medium text-primary">{nfe.destinatario_endereco}</p>
                <p className="text-xs text-muted-foreground">
                  {[nfe.destinatario_municipio, nfe.destinatario_uf, nfe.destinatario_cep].filter(Boolean).join(' · ')}
                </p>
              </CardContent>
            </Card>

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
