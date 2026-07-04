import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MapPin, LogOut, CheckCircle2, XCircle, PenLine, Navigation, Phone, Clock, FileText, MessageSquare, Play, Package } from 'lucide-react';
import { toast } from 'sonner';
import SignaturePad from '@/components/motorista/SignaturePad';
import { useGpsTracker } from '@/hooks/useGpsTracker';

interface Parada {
  id: string;
  nome: string;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  ordem: number | null;
  horario: string | null;
  telefone: string | null;
  observacoes: string | null;
  assinatura_url: string | null;
  motivo_falha: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  company_id: string;
}

export default function MotoristaApp() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [motoristaNome, setMotoristaNome] = useState<string>('');
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSig, setActiveSig] = useState<Parada | null>(null);
  const [activeFail, setActiveFail] = useState<Parada | null>(null);
  const [failMotivo, setFailMotivo] = useState('cliente_ausente');
  const [failObs, setFailObs] = useState('');
  const [notifs, setNotifs] = useState<{ id: string; tipo: string; titulo: string; mensagem: string; lida: boolean; created_at: string }[]>([]);


  const MOTIVOS_FALHA = [
    { v: 'cliente_recusou', l: 'Cliente recusou' },
    { v: 'avaria', l: 'Avaria no produto' },
    { v: 'cliente_ausente', l: 'Cliente ausente' },
    { v: 'endereco_incorreto', l: 'Endereço incorreto' },
    { v: 'outros', l: 'Outros' },
  ];

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Encontrar motorista vinculado por user_id ou email
      let { data: mot } = await supabase.from('motoristas').select('*').eq('user_id', user.id).maybeSingle();
      if (!mot && profile?.email) {
        const { data: byEmail } = await supabase.from('motoristas').select('*').eq('email', profile.email).maybeSingle();
        if (byEmail) {
          await supabase.from('motoristas').update({ user_id: user.id }).eq('id', byEmail.id);
          mot = { ...byEmail, user_id: user.id };
        }
      }
      if (!mot) { setLoading(false); return; }
      setMotoristaId(mot.id);
      setMotoristaNome(mot.nome);

      const { data: ps } = await supabase.from('paradas')
        .select('*')
        .eq('motorista_id', mot.id)
        .eq('data_rota', today)
        .order('ordem', { ascending: true });
      setParadas((ps || []) as Parada[]);
      setLoading(false);
    })();
  }, [user, profile?.email, today]);

  // Rastreamento GPS ao vivo: ativo enquanto houver paradas pendentes/em andamento hoje
  const hasActiveStops = paradas.some(p => p.status === 'pendente' || p.status === 'em_andamento');
  useGpsTracker({
    active: hasActiveStops,
    motoristaId,
    companyId: paradas[0]?.company_id || null,
    intervalMs: 30000,
  });

  // Notificações para o motorista (reagendamentos/falhas)
  useEffect(() => {
    if (!motoristaId) return;
    const load = async () => {
      const { data } = await supabase.from('notificacoes_motorista')
        .select('id, tipo, titulo, mensagem, lida, created_at')
        .eq('motorista_id', motoristaId)
        .order('created_at', { ascending: false })
        .limit(20);
      const list = (data || []) as any[];
      setNotifs(list);
      list.filter(n => !n.lida).forEach(n => toast.message(n.titulo, { description: n.mensagem }));
      const unreadIds = list.filter(n => !n.lida).map(n => n.id);
      if (unreadIds.length) await supabase.from('notificacoes_motorista').update({ lida: true }).in('id', unreadIds);
    };
    load();
    const ch = supabase.channel(`notif-${motoristaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes_motorista', filter: `motorista_id=eq.${motoristaId}` },
        (payload: any) => {
          const n = payload.new;
          setNotifs(prev => [n, ...prev]);
          toast.message(n.titulo, { description: n.mensagem });
          supabase.from('notificacoes_motorista').update({ lida: true }).eq('id', n.id);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [motoristaId]);


  const reload = async () => {
    if (!motoristaId) return;
    const { data: ps } = await supabase.from('paradas')
      .select('*').eq('motorista_id', motoristaId).eq('data_rota', today)
      .order('ordem', { ascending: true });
    setParadas((ps || []) as Parada[]);
  };

  const doCheckin = async (p: Parada) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }
    const { error } = await supabase.from('paradas')
      .update({ status: 'em_andamento', checkin_time: time })
      .eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success(`Check-in às ${time}`);
    reload();
  };

  const doEntregue = async (p: Parada) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const { error } = await supabase.from('paradas')
      .update({ status: 'entregue', checkout_time: time })
      .eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('Entrega confirmada');
    reload();
  };

  const submitFalha = async () => {
    if (!activeFail) return;
    const label = MOTIVOS_FALHA.find(m => m.v === failMotivo)?.l || failMotivo;
    const motivo = failObs.trim() ? `${label}: ${failObs.trim()}` : label;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const { error } = await supabase.from('paradas')
      .update({ status: 'nao_realizada', motivo_falha: motivo, checkout_time: time })
      .eq('id', activeFail.id);
    if (error) return toast.error(error.message);
    toast.success('Registrado como não realizada');
    setActiveFail(null); setFailMotivo('cliente_ausente'); setFailObs('');
    reload();
  };

  const openSignedPdf = async (path: string) => {
    const { data } = await supabase.storage.from('assinaturas').createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const addressOf = (p: Parada) =>
    p.lat && p.lng
      ? `${p.lat},${p.lng}`
      : [p.endereco, p.municipio, p.uf].filter(Boolean).join(', ');

  // Rota completa: apenas paradas ainda pendentes/em andamento, na ordem
  const remainingStops = paradas.filter(p => p.status === 'pendente' || p.status === 'em_andamento');

  const startFullRouteGoogle = () => {
    if (remainingStops.length === 0) {
      toast.info('Nenhuma parada pendente para navegar');
      return;
    }
    const stops = remainingStops.map(addressOf).map(encodeURIComponent);
    const destination = stops[stops.length - 1];
    const waypoints = stops.slice(0, -1).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${destination}` +
      (waypoints ? `&waypoints=${waypoints}` : '');
    window.open(url, '_blank');
  };

  const startFullRouteWaze = () => {
    // Waze não suporta múltiplos waypoints — abre a próxima parada pendente
    const next = remainingStops[0];
    if (!next) { toast.info('Nenhuma parada pendente'); return; }
    const q = next.lat && next.lng
      ? `ll=${next.lat},${next.lng}`
      : `q=${encodeURIComponent(addressOf(next))}`;
    window.open(`https://waze.com/ul?${q}&navigate=yes`, '_blank');
    if (remainingStops.length > 1) {
      toast.message('Waze aberto para a próxima parada', {
        description: 'Waze não permite múltiplos destinos — repita ao concluir cada entrega.',
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando rota...</div>;
  }

  if (!motoristaId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-foreground font-medium">Seu usuário não está vinculado a um motorista.</p>
        <p className="text-sm text-muted-foreground text-center">Peça ao administrador para cadastrar você na aba Motoristas usando o mesmo e-mail.</p>
        <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4 mr-1" /> Sair</Button>
      </div>
    );
  }

  const pendentes = paradas.filter(p => p.status === 'pendente' || p.status === 'em_andamento').length;
  const concluidas = paradas.filter(p => p.status === 'entregue').length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">Olá, {motoristaNome.split(' ')[0]}</h1>
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} · {concluidas}/{paradas.length} entregas
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
      </header>

      <main className="flex-1 overflow-y-auto p-3 space-y-3 pb-6">
        {/* Boas-vindas + resumo + iniciar rota completa */}
        <Card className="bg-gradient-to-br from-primary/15 to-secondary/10 border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-lg font-bold text-foreground">Bem-vindo, {motoristaNome.split(' ')[0]}! 👋</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-card/60 border border-border p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                  <Package className="h-4 w-4 text-primary" /> {paradas.length}
                </p>
              </div>
              <div className="flex-1 rounded-lg bg-card/60 border border-border p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-primary">{pendentes}</p>
              </div>
              <div className="flex-1 rounded-lg bg-card/60 border border-border p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Entregues</p>
                <p className="text-xl font-bold text-success">{concluidas}</p>
              </div>
            </div>
            {remainingStops.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg" className="w-full h-11 text-base font-semibold">
                    <Play className="h-4 w-4 mr-2" /> Iniciar rota ({remainingStops.length} paradas)
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  <DropdownMenuItem onClick={startFullRouteGoogle}>
                    <Navigation className="h-4 w-4 mr-2" /> Google Maps (rota completa)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={startFullRouteWaze}>
                    <Navigation className="h-4 w-4 mr-2" /> Waze (próxima parada)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardContent>
        </Card>

        {paradas.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma parada atribuída hoje.
          </CardContent></Card>
        ) : (
          <>

            {paradas.map((p, idx) => {
              const isDone = p.status === 'entregue';
              const isFail = p.status === 'nao_realizada';
              const inProgress = p.status === 'em_andamento';
              return (
                <Card key={p.id} className={`fade-in ${isDone ? 'opacity-70' : ''} ${isFail ? 'border-destructive/50' : ''}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{p.nome}</p>
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{[p.endereco, p.municipio, p.uf].filter(Boolean).join(', ')}</span>
                        </p>
                        {p.horario && <p className="text-[11px] text-muted-foreground"><Clock className="h-3 w-3 inline" /> {p.horario}</p>}
                        {p.observacoes && (
                          <div className="mt-1.5 flex items-start gap-1.5 bg-warning/15 border border-warning/40 rounded px-2 py-1">
                            <Badge className="bg-warning text-warning-foreground text-[9px] shrink-0 h-4">OBS</Badge>
                            <p className="text-[11px] text-foreground font-semibold leading-tight"><MessageSquare className="h-3 w-3 inline mr-0.5" />{p.observacoes}</p>
                          </div>
                        )}
                      </div>
                      {isDone && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
                      {isFail && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openInMaps(p)}>
                        <Navigation className="h-3 w-3 mr-1" /> Mapa
                      </Button>
                      {p.telefone && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                          <a href={`tel:${p.telefone}`}><Phone className="h-3 w-3 mr-1" /> Ligar</a>
                        </Button>
                      )}
                      {!isDone && !isFail && !inProgress && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => doCheckin(p)}>Check-in</Button>
                      )}
                      {!isDone && !isFail && (
                        <Button size="sm" className="h-7 text-xs bg-success hover:bg-success/90 text-success-foreground" onClick={() => doEntregue(p)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Entregue
                        </Button>
                      )}
                      {!isDone && !isFail && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/50" onClick={() => { setActiveFail(p); setFailMotivo(''); }}>
                          <XCircle className="h-3 w-3 mr-1" /> Não realizada
                        </Button>
                      )}
                      {!isFail && (
                        <Button size="sm" variant={p.assinatura_url ? 'outline' : 'default'} className="h-7 text-xs" onClick={() => setActiveSig(p)}>
                          <PenLine className="h-3 w-3 mr-1" /> {p.assinatura_url ? 'Nova assinatura' : 'Coletar assinatura'}
                        </Button>
                      )}
                      {p.assinatura_url && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openSignedPdf(p.assinatura_url!)}>
                          <FileText className="h-3 w-3 mr-1" /> Ver PDF
                        </Button>
                      )}
                    </div>

                    {(p.checkin_time || p.checkout_time) && (
                      <div className="text-[10px] text-muted-foreground border-t pt-1">
                        {p.checkin_time && <>Check-in: {p.checkin_time}</>}
                        {p.checkout_time && <> · Finalizado: {p.checkout_time}</>}
                      </div>
                    )}
                    {isFail && p.motivo_falha && (
                      <p className="text-[11px] text-destructive">Motivo: {p.motivo_falha}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </main>

      {activeSig && (
        <SignaturePad
          open={!!activeSig}
          onOpenChange={(o) => { if (!o) setActiveSig(null); }}
          paradaId={activeSig.id}
          paradaNome={activeSig.nome}
          paradaEndereco={[activeSig.endereco, activeSig.municipio, activeSig.uf].filter(Boolean).join(', ')}
          companyId={activeSig.company_id}
          onSaved={() => reload()}
        />
      )}

      <Dialog open={!!activeFail} onOpenChange={(o) => { if (!o) { setActiveFail(null); setFailMotivo('cliente_ausente'); setFailObs(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Entrega não realizada</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{activeFail?.nome}</p>
            <label className="text-xs font-medium">Motivo *</label>
            <Select value={failMotivo} onValueChange={setFailMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOTIVOS_FALHA.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="text-xs font-medium">Observações</label>
            <Textarea value={failObs} onChange={e => setFailObs(e.target.value)} placeholder="Detalhes adicionais (opcional)" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActiveFail(null); setFailMotivo('cliente_ausente'); setFailObs(''); }}>Cancelar</Button>
            <Button onClick={submitFalha}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
