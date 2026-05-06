import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface Log {
  id: string;
  company_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  upload_nota: '📥 Upload de nota',
  erro_parse: '⚠️ Erro no parse',
  reprocessar_nota: '🔄 Reprocessar nota',
  criar_parada: '📍 Criar parada',
  remover_parada: '🗑️ Remover parada',
  criar_motorista: '🚚 Criar motorista',
  remover_motorista: '🗑️ Remover motorista',
  importar_paradas: '📦 Importar paradas',
  resetar_dados: '🧹 Reset de dados',
  carregar_demo: '🎬 Carregar demo',
  criar_convite: '✉️ Criar convite',
  create_company: '🏢 Criar empresa',
  create_user: '👤 Criar usuário',
};

export default function AuditoriaPage() {
  const { isAdmin, isSuperAdmin, profile } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');

  if (!isAdmin && !isSuperAdmin) return <Navigate to="/" replace />;

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('audit_logs')
      .select('*').order('created_at', { ascending: false }).limit(500);
    setLogs((data || []) as Log[]);
    if (isSuperAdmin) {
      const { data: c } = await supabase.from('companies').select('id, name');
      setCompanies(c || []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (companyFilter !== 'all' && l.company_id !== companyFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return [l.user_email, l.action, JSON.stringify(l.details)].some(v => v?.toLowerCase().includes(s));
    }
    return true;
  });

  const actions = Array.from(new Set(logs.map(l => l.action))).sort();

  return (
    <div className="space-y-4 fade-in pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Auditoria</h1>
          <p className="text-xs text-muted-foreground">
            {isSuperAdmin ? 'Logs de toda a plataforma' : `Logs de ${profile?.email ? 'sua empresa' : ''}`} · {filtered.length} de {logs.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Atualizar</Button>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar usuário, ação..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {actions.map(a => <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>)}
            </SelectContent>
          </Select>
          {isSuperAdmin && (
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum registro.</CardContent></Card>
      ) : (
        <div className="space-y-1">
          {filtered.map(l => (
            <Card key={l.id}>
              <CardContent className="p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{ACTION_LABELS[l.action] || l.action}</span>
                      {l.entity_type && <Badge variant="outline" className="text-[10px]">{l.entity_type}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {l.user_email || 'sistema'} · {format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss')}
                    </p>
                    {l.details && Object.keys(l.details).length > 0 && (
                      <pre className="text-[10px] text-muted-foreground bg-muted/40 rounded p-1.5 mt-1 overflow-x-auto">
                        {JSON.stringify(l.details, null, 0)}
                      </pre>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
