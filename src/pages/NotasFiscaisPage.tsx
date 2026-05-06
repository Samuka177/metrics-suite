import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, RefreshCw, Eye, AlertCircle, CheckCircle2, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';

interface FiscalNote {
  id: string;
  numero: string | null;
  destinatario_nome: string | null;
  destinatario_municipio: string | null;
  destinatario_uf: string | null;
  destinatario_endereco: string | null;
  source_format: string;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
  status: string;
  error_message: string | null;
  valor_total: number | null;
  peso_kg: number | null;
  created_at: string;
  raw_extracted: any;
  itens: any;
}

const STATUS_LABEL: Record<string, { label: string; color: string; icon: any }> = {
  parsed: { label: 'Processada', color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30', icon: CheckCircle2 },
  erro: { label: 'Erro', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30', icon: AlertCircle },
  pendente: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30', icon: Clock },
};

export default function NotasFiscaisPage() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FiscalNote | null>(null);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data } = await supabase.from('fiscal_notes')
      .select('*').eq('company_id', profile.company_id)
      .order('created_at', { ascending: false }).limit(500);
    setNotes((data || []) as FiscalNote[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile?.company_id]);

  const filtered = notes.filter(n => {
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return [n.destinatario_nome, n.numero, n.destinatario_municipio, n.arquivo_nome]
        .some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });

  const reprocess = async (note: FiscalNote) => {
    if (!note.raw_extracted) {
      toast.error('Sem dados originais para reprocessar. Reenvie o arquivo.');
      return;
    }
    setReprocessing(note.id);
    try {
      // Reaproveita os dados extraídos como base e atualiza status
      const { error } = await supabase.from('fiscal_notes').update({
        status: 'parsed', error_message: null,
        ...note.raw_extracted,
      }).eq('id', note.id);
      if (error) throw error;
      await logAction(profile!.company_id, 'reprocessar_nota', { type: 'fiscal_note', id: note.id });
      toast.success('Nota reprocessada.');
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReprocessing(null);
    }
  };

  return (
    <div className="space-y-4 fade-in pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Minhas Notas Fiscais</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} de {notes.length} notas</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Atualizar</Button>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por destinatário, número, cidade..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="parsed">Processadas</SelectItem>
              <SelectItem value="erro">Com erro</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma nota encontrada.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const s = STATUS_LABEL[n.status] || STATUS_LABEL.parsed;
            const Icon = s.icon;
            return (
              <Card key={n.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{n.destinatario_nome || n.arquivo_nome || 'Sem destinatário'}</p>
                      <Badge variant="outline" className={s.color}>
                        <Icon className="h-3 w-3 mr-1" />{s.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{n.source_format?.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      NF {n.numero || '—'} · {[n.destinatario_municipio, n.destinatario_uf].filter(Boolean).join('/') || '—'}
                      {n.valor_total ? ` · R$ ${Number(n.valor_total).toFixed(2)}` : ''}
                    </p>
                    {n.status === 'erro' && n.error_message && (
                      <p className="text-xs text-destructive mt-1 truncate">⚠ {n.error_message}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {n.status === 'erro' && (
                      <Button size="sm" variant="outline" disabled={reprocessing === n.id}
                        onClick={() => reprocess(n)}>
                        <RefreshCw className={`h-3 w-3 ${reprocessing === n.id ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setSelected(n)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da nota</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-muted-foreground">Número</p><p>{selected.numero || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><p>{STATUS_LABEL[selected.status]?.label}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Destinatário</p><p>{selected.destinatario_nome || '—'}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Endereço</p><p>{selected.destinatario_endereco || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Cidade/UF</p><p>{[selected.destinatario_municipio, selected.destinatario_uf].filter(Boolean).join('/')}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor</p><p>R$ {Number(selected.valor_total || 0).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Peso</p><p>{selected.peso_kg ? `${selected.peso_kg} kg` : '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Arquivo</p><p className="truncate">{selected.arquivo_nome || '—'}</p></div>
              </div>
              {selected.error_message && (
                <Card className="border-destructive">
                  <CardContent className="p-3 text-xs text-destructive">{selected.error_message}</CardContent>
                </Card>
              )}
              {Array.isArray(selected.itens) && selected.itens.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Itens ({selected.itens.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {selected.itens.map((it: any, i: number) => (
                      <div key={i} className="text-xs p-2 rounded border">
                        {it.nome} — {it.quantidade ?? ''} {it.unidade || ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
