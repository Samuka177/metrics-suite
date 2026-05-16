import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FileText, Upload, Plus, X, AlertCircle, AlertTriangle, Loader2, Sparkles, Edit2, Save,
  CheckCircle2, Copy as CopyIcon, Trash2,
} from 'lucide-react';
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

type ItemStatus = 'queued' | 'processing' | 'ok' | 'incomplete' | 'duplicate' | 'error';

interface NoteItem {
  id: string;
  filename: string;
  status: ItemStatus;
  parsed?: ParsedNote;
  missing: string[];
  warnings: string[];
  sourceFormat?: string;
  error?: string;
  fiscalNoteId?: string;
  duplicateOf?: string; // descrição
  includeAnyway?: boolean; // se usuário escolheu importar duplicata
  editing?: boolean;
  edit: { logradouro: string; numero: string; bairro: string; municipio: string; uf: string; cep: string };
}

const FIELD_LABELS: Record<string, string> = {
  logradouro: 'Logradouro', numero: 'Número', municipio: 'Município', uf: 'UF',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isDuplicate(p: ParsedNote, others: ParsedNote[]): string | null {
  for (const o of others) {
    if (p.chave && o.chave && p.chave === o.chave) return `Chave NF-e ${p.chave}`;
    if (p.numero && p.emitente_cnpj && o.numero === p.numero && o.emitente_cnpj === p.emitente_cnpj && (o.serie || '') === (p.serie || '')) {
      return `NF ${p.numero}/${p.serie || '—'} do mesmo emitente`;
    }
  }
  return null;
}

export default function NFeTab() {
  const { addParada } = useApp();
  const { profile } = useAuth();
  const [items, setItems] = useState<NoteItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const processOne = async (file: File, dbExisting: ParsedNote[], batchSoFar: ParsedNote[]): Promise<NoteItem> => {
    const id = crypto.randomUUID();
    const baseItem: NoteItem = {
      id, filename: file.name, status: 'processing', missing: [], warnings: [],
      edit: { logradouro: '', numero: '', bairro: '', municipio: '', uf: '', cep: '' },
    };
    setItems(prev => [...prev, baseItem]);

    try {
      const base64 = await fileToBase64(file);
      const { data, error: fnErr } = await supabase.functions.invoke('parse-fiscal-note', {
        body: { filename: file.name, mimeType: file.type, base64 },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);

      const parsed: ParsedNote = data.parsed;
      const missingFields: string[] = data.missing_fields || [];
      const warns: string[] = data.warnings || [];

      const dup = isDuplicate(parsed, [...dbExisting, ...batchSoFar]);

      const status: ItemStatus = dup ? 'duplicate' : missingFields.length > 0 ? 'incomplete' : 'ok';
      const errMsg = missingFields.length > 0
        ? `Campos não lidos: ${missingFields.map(f => FIELD_LABELS[f] || f).join(', ')}`
        : warns.length > 0 ? warns.join(' · ') : null;

      // Salva nota no banco
      const { destinatario_logradouro, destinatario_numero, destinatario_bairro, ...parsedDb } = parsed;
      const { data: saved } = await supabase.from('fiscal_notes').insert({
        company_id: profile!.company_id,
        source_format: data.source_format,
        arquivo_nome: file.name,
        arquivo_tipo: file.type,
        status: dup ? 'duplicada' : status === 'ok' ? 'parsed' : 'incompleto',
        error_message: dup ? `Duplicada: ${dup}` : errMsg,
        ...parsedDb,
        raw_extracted: parsed as any,
      }).select().single();

      await logAction(profile!.company_id, 'upload_nota', { type: 'fiscal_note', id: saved?.id }, {
        arquivo: file.name, formato: data.source_format,
        missing_fields: missingFields, warnings: warns, duplicate: dup,
      });

      const next: NoteItem = {
        ...baseItem,
        status,
        parsed,
        missing: missingFields,
        warnings: warns,
        sourceFormat: data.source_format,
        fiscalNoteId: saved?.id,
        duplicateOf: dup || undefined,
        edit: {
          logradouro: parsed.destinatario_logradouro || '',
          numero: parsed.destinatario_numero || '',
          bairro: parsed.destinatario_bairro || '',
          municipio: parsed.destinatario_municipio || '',
          uf: parsed.destinatario_uf || '',
          cep: parsed.destinatario_cep || '',
        },
        editing: missingFields.length > 0,
      };
      setItems(prev => prev.map(i => i.id === id ? next : i));
      return next;
    } catch (err: any) {
      const errored: NoteItem = { ...baseItem, status: 'error', error: err.message || 'Erro' };
      setItems(prev => prev.map(i => i.id === id ? errored : i));
      return errored;
    }
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.company_id) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessing(true);
    setTotal(files.length);
    setProcessed(0);

    // Busca notas existentes para deduplicação
    const { data: existing } = await supabase
      .from('fiscal_notes')
      .select('chave, numero, serie, emitente_cnpj')
      .eq('company_id', profile.company_id)
      .gte('created_at', new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString());
    const dbExisting = (existing || []) as ParsedNote[];

    const batch: ParsedNote[] = [];
    for (const f of files) {
      const result = await processOne(f, dbExisting, batch);
      if (result.parsed) batch.push(result.parsed);
      setProcessed(c => c + 1);
    }

    setProcessing(false);
    if (fileRef.current) fileRef.current.value = '';
    toast.success(`${files.length} arquivo(s) processado(s)`);
  };

  const applyEdit = (id: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id || !it.parsed) return it;
      const stillMissing: string[] = [];
      if (!it.edit.logradouro.trim()) stillMissing.push('logradouro');
      if (!it.edit.numero.trim()) stillMissing.push('numero');
      if (!it.edit.municipio.trim()) stillMissing.push('municipio');
      if (!it.edit.uf.trim()) stillMissing.push('uf');
      const enderecoTxt = [
        it.edit.logradouro && it.edit.numero ? `${it.edit.logradouro}, ${it.edit.numero}` : it.edit.logradouro,
        it.edit.bairro,
      ].filter(Boolean).join(', ');
      const updated: ParsedNote = {
        ...it.parsed,
        destinatario_logradouro: it.edit.logradouro || undefined,
        destinatario_numero: it.edit.numero || undefined,
        destinatario_bairro: it.edit.bairro || undefined,
        destinatario_endereco: enderecoTxt || it.parsed.destinatario_endereco,
        destinatario_municipio: it.edit.municipio || undefined,
        destinatario_uf: it.edit.uf.toUpperCase() || undefined,
        destinatario_cep: it.edit.cep || undefined,
      };
      return {
        ...it,
        parsed: updated,
        missing: stillMissing,
        status: stillMissing.length === 0 ? (it.duplicateOf && !it.includeAnyway ? 'duplicate' : 'ok') : 'incomplete',
        editing: stillMissing.length > 0,
      };
    }));
    toast.success('Endereço atualizado');
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const toggleIncludeDup = (id: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const include = !it.includeAnyway;
      return { ...it, includeAnyway: include, status: include && it.missing.length === 0 ? 'ok' : it.status };
    }));
  };

  // Itens que podem ir para rota
  const importableCount = items.filter(it =>
    (it.status === 'ok' || (it.status === 'duplicate' && it.includeAnyway)) && it.missing.length === 0
  ).length;
  const blockingCount = items.filter(it => it.status === 'incomplete' || it.status === 'error').length;
  const duplicateCount = items.filter(it => it.status === 'duplicate' && !it.includeAnyway).length;

  const addAllToRoute = async () => {
    const list = items.filter(it =>
      (it.status === 'ok' || (it.status === 'duplicate' && it.includeAnyway)) && it.missing.length === 0 && it.parsed
    );
    for (const it of list) {
      const p = it.parsed!;
      const enderecoCompleto = [
        p.destinatario_endereco, p.destinatario_municipio,
        p.destinatario_uf, p.destinatario_cep,
      ].filter(Boolean).join(', ');
      await addParada({
        nome: p.destinatario_nome || `NF ${p.numero || ''}`,
        endereco: enderecoCompleto,
        tipo: 'Delivery',
        peso: p.peso_kg, volume: p.volume_m3,
        produtos: (p.itens || []).map(pr => ({
          nome: pr.nome, quantidade: String(pr.quantidade ?? ''), unidade: pr.unidade || '',
        })),
      });
    }
    toast.success(`${list.length} parada(s) adicionada(s) à rota`);
    setItems([]);
  };

  const statusBadge = (it: NoteItem) => {
    if (it.status === 'processing') return <Badge variant="secondary" className="text-[10px]"><Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />Processando</Badge>;
    if (it.status === 'error') return <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Erro</Badge>;
    if (it.status === 'duplicate') return <Badge className="text-[10px] bg-warning text-warning-foreground"><CopyIcon className="h-2.5 w-2.5 mr-0.5" />Duplicada</Badge>;
    if (it.status === 'incomplete') return <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Incompleta</Badge>;
    return <Badge className="text-[10px] bg-success text-success-foreground"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />OK</Badge>;
  };

  return (
    <div className="space-y-4 fade-in pb-4">
      <input ref={fileRef} type="file" multiple
        accept=".xml,.pdf,.csv,.txt,image/*"
        onChange={handleFiles} className="hidden" id="nfe-upload" />
      <label htmlFor="nfe-upload"
        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl transition-colors ${processing ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-primary/50 hover:bg-muted/30'}`}>
        {processing ? (
          <>
            <Loader2 className="h-10 w-10 text-primary mb-3 animate-spin" />
            <p className="font-medium">Processando {processed} de {total}…</p>
            <Progress value={(processed / Math.max(total, 1)) * 100} className="w-full mt-3 max-w-xs" />
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Importar várias notas</p>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Selecione vários arquivos (XML, PDF, CSV, imagem). A IA processa um a um e detecta duplicatas.
            </p>
          </>
        )}
      </label>

      {/* Resumo + ação global */}
      {items.length > 0 && (
        <Card>
          <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
              <span><strong className="text-foreground">{items.length}</strong> arquivo(s)</span>
              <span className="text-success"><strong>{importableCount}</strong> ok</span>
              {blockingCount > 0 && <span className="text-destructive"><strong>{blockingCount}</strong> com erro/incompleta</span>}
              {duplicateCount > 0 && <span className="text-warning"><strong>{duplicateCount}</strong> duplicada(s)</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setItems([])} disabled={processing}>
                Limpar lista
              </Button>
              <Button
                size="sm"
                onClick={addAllToRoute}
                disabled={processing || importableCount === 0 || blockingCount > 0}
                title={blockingCount > 0 ? 'Corrija ou remova as notas com erro/incompletas' : ''}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {processing ? 'Aguarde processamento…' :
                  blockingCount > 0 ? `Corrija ${blockingCount} antes` :
                  `Adicionar ${importableCount} à rota`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {items.map(it => (
          <Card key={it.id} className={
            it.status === 'error' || it.status === 'incomplete' ? 'border-destructive/40' :
            it.status === 'duplicate' ? 'border-warning/40' :
            it.status === 'ok' ? 'border-success/30' : ''
          }>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(it)}
                    <p className="text-sm font-medium truncate">{it.filename}</p>
                  </div>
                  {it.parsed && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      <strong>{it.parsed.destinatario_nome || '(sem destinatário)'}</strong>
                      {' · '}NF {it.parsed.numero || '—'}
                    </p>
                  )}
                  {it.error && <p className="text-xs text-destructive mt-1">{it.error}</p>}
                  {it.duplicateOf && (
                    <p className="text-xs text-warning mt-1">
                      Possível duplicata: {it.duplicateOf}
                    </p>
                  )}
                </div>
                <button onClick={() => removeItem(it.id)} disabled={processing} title="Remover">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>

              {it.parsed && (
                <div className="text-xs bg-muted/40 rounded p-2 space-y-0.5">
                  <p className="font-medium">{it.parsed.destinatario_endereco || '(sem endereço)'}</p>
                  <p className="text-muted-foreground">
                    {[it.parsed.destinatario_municipio, it.parsed.destinatario_uf, it.parsed.destinatario_cep].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              )}

              {it.missing.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {it.missing.map(f => (
                    <Badge key={f} variant="destructive" className="text-[10px]">⚠ {FIELD_LABELS[f]}</Badge>
                  ))}
                </div>
              )}
              {it.warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-destructive/80">⚠ {w}</p>
              ))}

              {it.editing && it.parsed && (
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t">
                  <Input placeholder="Logradouro *" value={it.edit.logradouro}
                    onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, edit: { ...x.edit, logradouro: e.target.value } } : x))}
                    className={`col-span-2 h-8 text-xs ${it.missing.includes('logradouro') ? 'border-destructive' : ''}`} />
                  <Input placeholder="Número *" value={it.edit.numero}
                    onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, edit: { ...x.edit, numero: e.target.value } } : x))}
                    className={`h-8 text-xs ${it.missing.includes('numero') ? 'border-destructive' : ''}`} />
                  <Input placeholder="Bairro" value={it.edit.bairro}
                    onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, edit: { ...x.edit, bairro: e.target.value } } : x))}
                    className="h-8 text-xs" />
                  <Input placeholder="Município *" value={it.edit.municipio}
                    onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, edit: { ...x.edit, municipio: e.target.value } } : x))}
                    className={`h-8 text-xs ${it.missing.includes('municipio') ? 'border-destructive' : ''}`} />
                  <Input placeholder="UF *" maxLength={2} value={it.edit.uf}
                    onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, edit: { ...x.edit, uf: e.target.value.toUpperCase() } } : x))}
                    className={`h-8 text-xs ${it.missing.includes('uf') ? 'border-destructive' : ''}`} />
                  <Input placeholder="CEP" value={it.edit.cep}
                    onChange={e => setItems(prev => prev.map(x => x.id === it.id ? { ...x, edit: { ...x.edit, cep: e.target.value } } : x))}
                    className="col-span-2 h-8 text-xs" />
                  <div className="col-span-2 flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => setItems(prev => prev.map(x => x.id === it.id ? { ...x, editing: false } : x))}>Cancelar</Button>
                    <Button size="sm" onClick={() => applyEdit(it.id)}><Save className="h-3 w-3 mr-1" /> Aplicar</Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1 pt-1">
                {it.parsed && !it.editing && it.status !== 'processing' && (
                  <Button size="sm" variant="outline" className="h-7 text-[11px]"
                    onClick={() => setItems(prev => prev.map(x => x.id === it.id ? { ...x, editing: true } : x))}>
                    <Edit2 className="h-3 w-3 mr-1" /> Editar endereço
                  </Button>
                )}
                {it.status === 'duplicate' && (
                  <Button size="sm" variant={it.includeAnyway ? 'default' : 'outline'} className="h-7 text-[11px]"
                    onClick={() => toggleIncludeDup(it.id)}>
                    {it.includeAnyway ? '✓ Importar mesmo assim' : 'Importar mesmo assim'}
                  </Button>
                )}
                {it.parsed && (
                  <span className="text-[10px] text-muted-foreground self-center ml-auto flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> {it.sourceFormat?.toUpperCase()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && !processing && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">Nenhuma nota importada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione vários arquivos de uma vez. A IA lê cada nota e só permite roteirizar quando todas estiverem corretas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
