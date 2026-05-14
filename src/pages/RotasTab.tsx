import { useState, lazy, Suspense, memo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, MapPin, Clock, Package, CheckCircle2, Truck, Trash2, Map, Zap,
  Upload, Play, Pause, XCircle, RotateCcw, Undo2, Redo2, Weight, Box, AlertTriangle,
  ArrowUp, Edit2, MessageSquare, Timer, History, Send, Copy, Bookmark, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import type { TipoEntrega, Parada } from '@/types/rotafacil';
import ImportModal from '@/components/import/ImportModal';
import { sendRouteViaWhatsApp, buildRouteLink } from '@/utils/whatsapp';
import RouteTemplatesDialog from '@/components/routes/RouteTemplatesDialog';
import AddressReviewDialog from '@/components/routes/AddressReviewDialog';
import { needsAddressReview } from '@/utils/addressValidation';

const RouteMap = lazy(() => import('@/components/map/RouteMap'));

// ── Metric Card ──
const MetricCard = memo(({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <Card>
    <CardContent className="p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </CardContent>
  </Card>
));
MetricCard.displayName = 'MetricCard';

// ── Time window badge ──
function TimeWindowBadge({ parada }: { parada: Parada }) {
  if (!parada.horarioMin && !parada.horarioMax) return null;
  const eta = parada.etaMinutos;
  let status: 'ok' | 'warning' | 'danger' = 'ok';

  if (eta != null && parada.horarioMax) {
    const [hMax, mMax] = parada.horarioMax.split(':').map(Number);
    const maxMin = hMax * 60 + mMax;
    // Assume start at 08:00
    const etaAbsolute = 8 * 60 + eta;
    if (etaAbsolute > maxMin) status = 'danger';
    else if (etaAbsolute > maxMin - 30) status = 'warning';
  }

  const color = status === 'danger' ? 'bg-destructive text-destructive-foreground' : status === 'warning' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground';

  return (
    <Badge className={`text-[10px] ${color}`}>
      <Clock className="h-2.5 w-2.5 mr-0.5" />
      {parada.horarioMin || '—'} - {parada.horarioMax || '—'}
    </Badge>
  );
}

// ── Add Parada Sheet ──
function AddParadaSheet() {
  const { addParada } = useApp();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipo, setTipo] = useState<TipoEntrega>('Ponto fixo');
  const [horario, setHorario] = useState('');
  const [horarioMin, setHorarioMin] = useState('');
  const [horarioMax, setHorarioMax] = useState('');
  const [peso, setPeso] = useState('');
  const [volume, setVolume] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [prodNome, setProdNome] = useState('');
  const [prodQtd, setProdQtd] = useState('');
  const [prodUn, setProdUn] = useState('un');
  const [produtos, setProdutos] = useState<{ nome: string; quantidade: string; unidade: string }[]>([]);

  const addProduto = () => {
    if (!prodNome || !prodQtd) return;
    setProdutos(prev => [...prev, { nome: prodNome, quantidade: prodQtd, unidade: prodUn }]);
    setProdNome(''); setProdQtd(''); setProdUn('un');
  };

  const handleSave = () => {
    if (!nome || !endereco) { toast.error('Preencha nome e endereço'); return; }
    addParada({
      nome, endereco, tipo,
      horario: horario || undefined,
      horarioMin: horarioMin || undefined,
      horarioMax: horarioMax || undefined,
      peso: peso ? Number(peso) : undefined,
      volume: volume ? Number(volume) : undefined,
      observacoes: observacoes || undefined,
      produtos,
    });
    toast.success(`Parada "${nome}" adicionada!`);
    setNome(''); setEndereco(''); setTipo('Ponto fixo'); setHorario(''); setHorarioMin(''); setHorarioMax('');
    setPeso(''); setVolume(''); setObservacoes(''); setProdutos([]);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Parada</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Nova Parada</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <div>
            <label className="text-sm font-medium">Nome *</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Bar do Zé" />
          </div>
          <div>
            <label className="text-sm font-medium">Endereço *</label>
            <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, nº - Bairro" />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <div className="flex gap-2 mt-1">
              {(['Ponto fixo', 'Delivery'] as TipoEntrega[]).map(t => (
                <Button key={t} variant={tipo === t ? 'default' : 'outline'} size="sm" onClick={() => setTipo(t)}>{t}</Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium">Horário</label>
              <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} className="text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium">Janela início</label>
              <Input type="time" value={horarioMin} onChange={e => setHorarioMin(e.target.value)} className="text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium">Janela fim</label>
              <Input type="time" value={horarioMax} onChange={e => setHorarioMax(e.target.value)} className="text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium"><Weight className="inline h-3 w-3 mr-0.5" />Peso (kg)</label>
              <Input type="number" value={peso} onChange={e => setPeso(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium"><Box className="inline h-3 w-3 mr-0.5" />Volume (m³)</label>
              <Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Observações</label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex: deixar com porteiro" rows={2} />
          </div>
          <div className="border-t pt-3">
            <label className="text-sm font-medium">Produtos</label>
            <div className="flex gap-2 mt-2">
              <Input placeholder="Nome" value={prodNome} onChange={e => setProdNome(e.target.value)} className="flex-1" />
              <Input placeholder="Qtd" value={prodQtd} onChange={e => setProdQtd(e.target.value)} className="w-16" />
              <Input placeholder="Un" value={prodUn} onChange={e => setProdUn(e.target.value)} className="w-16" />
              <Button size="sm" variant="outline" onClick={addProduto}><Plus className="h-4 w-4" /></Button>
            </div>
            {produtos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {produtos.map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" /> {p.nome} — {p.quantidade} {p.unidade}
                    <button onClick={() => setProdutos(prev => prev.filter((_, j) => j !== i))} className="ml-auto text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button onClick={handleSave} className="w-full">Salvar parada</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Stop Card (rich) ──
const StopCard = memo(({ parada, index, isActive, motoristas }: {
  parada: Parada; index: number; isActive: boolean;
  motoristas: { id: string; nome: string; cor: string }[];
}) => {
  const { updateParada, removeParada, reorderParadas, marcarEntregue, marcarFalha, reagendarParada, atribuirParada, executionMode, paradas } = useApp();
  const [editing, setEditing] = useState(false);
  const st = statusConfig[parada.status];
  const motorista = motoristas.find(m => m.id === parada.motoristaId);

  const capacityWarning = (parada.peso && parada.peso > 50) || (parada.volume && parada.volume > 1);

  return (
    <Card className={`transition-all ${isActive ? 'ring-2 ring-primary shadow-lg' : ''} ${parada.status === 'falhou' ? 'border-destructive/50' : ''} ${capacityWarning ? 'border-warning/50' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Number circle with driver color */}
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
            style={{ backgroundColor: motorista?.cor || 'hsl(var(--primary))' }}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{parada.nome}</p>
                <p className="text-xs text-muted-foreground truncate">{parada.endereco}</p>
              </div>
              <Badge className={`${st.className} text-[10px] shrink-0 ml-1`}>{st.label}</Badge>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {parada.horario && (
                <Badge variant="destructive" className="text-[10px]">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />{parada.horario}
                </Badge>
              )}
              <TimeWindowBadge parada={parada} />
              {parada.etaMinutos != null && parada.etaMinutos > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  <Timer className="h-2.5 w-2.5 mr-0.5" />ETA ~{parada.etaMinutos}min
                </Badge>
              )}
              {parada.peso && (
                <Badge variant="outline" className="text-[10px]">
                  <Weight className="h-2.5 w-2.5 mr-0.5" />{parada.peso}kg
                </Badge>
              )}
              {parada.volume && (
                <Badge variant="outline" className="text-[10px]">
                  <Box className="h-2.5 w-2.5 mr-0.5" />{parada.volume}m³
                </Badge>
              )}
              {parada.produtos.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  <Package className="h-2.5 w-2.5 mr-0.5" />{parada.produtos.length}
                </Badge>
              )}
              {motorista && (
                <Badge className="text-[10px]" style={{ backgroundColor: motorista.cor, color: 'white' }}>
                  <Truck className="h-2.5 w-2.5 mr-0.5" />{motorista.nome.split(' ')[0]}
                </Badge>
              )}
            </div>

            {parada.observacoes && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" /> {parada.observacoes}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-1 mt-2">
              {executionMode ? (
                <>
                  {(parada.status === 'pendente' || parada.status === 'em_entrega') && (
                    <>
                      <Button size="sm" className="h-6 text-[10px] bg-success hover:bg-success/90 text-success-foreground" onClick={() => marcarEntregue(parada.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Entregue
                      </Button>
                      <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => marcarFalha(parada.id)}>
                        <XCircle className="h-3 w-3 mr-0.5" /> Falhou
                      </Button>
                    </>
                  )}
                  {(parada.status === 'falhou' || parada.status === 'entregue') && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => reagendarParada(parada.id)}>
                      <RotateCcw className="h-3 w-3 mr-0.5" /> Reagendar
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {index > 0 && parada.status === 'pendente' && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1" onClick={() => reorderParadas(index, 0)}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1" onClick={() => setEditing(true)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1 text-destructive" onClick={() => removeParada(parada.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {/* Driver assignment */}
                  {motoristas.length > 0 && (
                    <Select value={parada.motoristaId || '_none'} onValueChange={v => atribuirParada(parada.id, v === '_none' ? undefined : v)}>
                      <SelectTrigger className="h-6 text-[10px] w-24 px-1">
                        <SelectValue placeholder="Motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sem motorista</SelectItem>
                        {motoristas.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: m.cor }} />
                              {m.nome.split(' ')[0]}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
StopCard.displayName = 'StopCard';

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  em_entrega: { label: 'Em entrega', className: 'bg-warning text-warning-foreground' },
  entregue: { label: 'Entregue', className: 'bg-success text-success-foreground' },
  falhou: { label: 'Falhou', className: 'bg-destructive text-destructive-foreground' },
};

export default function RotasTab() {
  const {
    paradas, motoristas, roteirizar, otimizarRota, reorderParadas, addParada,
    lastOptimization, executionMode, currentStopIndex, capacityWarnings,
    iniciarRota, pararRota, distribuirAutomaticamente, historyActions,
    undo, redo, canUndo, canRedo, config, setConfig,
  } = useApp();
  const [showMap, setShowMap] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const total = paradas.length;
  const entregues = paradas.filter(p => p.status === 'entregue').length;
  const pendentes = paradas.filter(p => p.status === 'pendente').length;
  const falhou = paradas.filter(p => p.status === 'falhou').length;
  const progressPct = total > 0 ? Math.round((entregues / total) * 100) : 0;

  const [showTemplates, setShowTemplates] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const handleRoteirizar = useCallback(() => {
    if (paradas.length === 0) { toast.error('Adicione paradas primeiro'); return; }
    setShowReview(true);
  }, [paradas.length]);

  const motoristasList = motoristas.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }));

  return (
    <div className="space-y-3 fade-in pb-4">
      {/* Execution progress bar */}
      {executionMode && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-primary">Rota em execução</span>
              <span className="text-sm font-bold text-primary">{entregues}/{total}</span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {entregues} entregues · {pendentes} pendentes {falhou > 0 ? `· ${falhou} falhas` : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="Total" value={total} color="text-primary" />
        <MetricCard label="Entregues" value={entregues} color="text-success" />
        <MetricCard label="Pendentes" value={pendentes} color="text-muted-foreground" />
        <MetricCard label="Falhas" value={falhou} color="text-destructive" />
      </div>

      {/* Capacity warnings */}
      {capacityWarnings.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-2 text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Capacidade excedida em {capacityWarnings.length} motorista(s)
          </CardContent>
        </Card>
      )}

      {/* Optimization banner */}
      {lastOptimization && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-2 text-sm flex items-center justify-between">
            <span><span className="font-semibold text-primary">Otimizada!</span> <span className="text-muted-foreground">{lastOptimization.distanceBefore.toFixed(1)} → {lastOptimization.distanceAfter.toFixed(1)} km</span></span>
            <Badge className="bg-success text-success-foreground">-{lastOptimization.savings.toFixed(1)} km</Badge>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      {showMap && paradas.length > 0 && (
        <Suspense fallback={<div className="h-[350px] rounded-xl bg-muted animate-pulse" />}>
          <RouteMap paradas={paradas} motoristas={motoristas} onReorder={reorderParadas} highlightIndex={executionMode ? currentStopIndex : undefined} />
        </Suspense>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 flex-wrap">
        <AddParadaSheet />
        {!executionMode ? (
          <>
            <Button size="sm" onClick={handleRoteirizar}>
              <Zap className="h-4 w-4 mr-1" /> Roteirizar
            </Button>
            {motoristas.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { distribuirAutomaticamente(); toast.success('Paradas distribuídas!'); }}>
                <Truck className="h-4 w-4 mr-1" /> Distribuir
              </Button>
            )}
            {paradas.length > 0 && (
              <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={iniciarRota}>
                <Play className="h-4 w-4 mr-1" /> Iniciar Rota
              </Button>
            )}
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={pararRota}>
            <Pause className="h-4 w-4 mr-1" /> Pausar
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
          <Upload className="h-4 w-4 mr-1" /> Importar
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
          <Bookmark className="h-4 w-4 mr-1" /> Templates
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowMap(v => !v)}>
          <Map className="h-4 w-4 mr-1" /> {showMap ? 'Ocultar' : 'Mapa'}
        </Button>
        {canUndo && <Button variant="ghost" size="sm" onClick={undo}><Undo2 className="h-4 w-4" /></Button>}
        {canRedo && <Button variant="ghost" size="sm" onClick={redo}><Redo2 className="h-4 w-4" /></Button>}
        {historyActions.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)}><History className="h-4 w-4" /></Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}><Timer className="h-4 w-4" /></Button>
      </div>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurações da Rota</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Velocidade média (km/h)</label>
              <Input type="number" value={config.velocidadeMedia} onChange={e => setConfig({ velocidadeMedia: Number(e.target.value) || 40 })} />
              <p className="text-xs text-muted-foreground mt-1">Usada para calcular ETA entre paradas</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de ações</DialogTitle></DialogHeader>
          <div className="space-y-1">
            {historyActions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded border">
                <span className="text-muted-foreground font-mono">{a.time}</span>
                <span className="text-foreground">{a.text}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ImportModal open={showImport} onOpenChange={setShowImport} />
      <RouteTemplatesDialog open={showTemplates} onOpenChange={setShowTemplates} />
      <AddressReviewDialog
        open={showReview}
        onOpenChange={setShowReview}
        onAllConfirmed={() => {
          otimizarRota();
          toast.success('Rota otimizada!');
        }}
      />

      {/* Aviso de endereços a verificar */}
      {paradas.length > 0 && paradas.some(p => needsAddressReview(p)) && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-2.5 flex items-center gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-warning shrink-0" />
            <span className="text-foreground">
              {paradas.filter(p => needsAddressReview(p)).length} endereço(s) sem CEP ou número.
            </span>
            <Button size="sm" variant="outline" className="h-6 text-[11px] ml-auto" onClick={() => setShowReview(true)}>
              Revisar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Enviar rota via WhatsApp + copiar link */}
      {motoristas.some(m => paradas.some(p => p.motoristaId === m.id)) && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Send className="h-3.5 w-3.5" /> Enviar rota por motorista
            </p>
            <div className="space-y-1.5">
              {motoristas.map(m => {
                const paradasMot = paradas.filter(p => p.motoristaId === m.id);
                if (paradasMot.length === 0) return null;
                return (
                  <div key={m.id} className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] flex items-center gap-1 mr-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.cor }} />
                      <strong>{m.nome.split(' ')[0]}</strong>
                      <span className="text-muted-foreground">({paradasMot.length})</span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        if (!m.telefone) { toast.error(`${m.nome} não possui WhatsApp`); return; }
                        if (sendRouteViaWhatsApp(m, paradasMot)) toast.success(`Rota enviada para ${m.nome}`);
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={async () => {
                        const link = buildRouteLink(paradasMot);
                        try {
                          await navigator.clipboard.writeText(link);
                          toast.success('Link do Google Maps copiado!');
                        } catch {
                          toast.error('Não foi possível copiar');
                        }
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copiar link
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stop list */}
      {paradas.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">Nenhuma parada cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione paradas, importe CSV/Excel ou carregue demo.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {paradas.map((p, i) => (
            <StopCard key={p.id} parada={p} index={i} isActive={executionMode && i === currentStopIndex} motoristas={motoristasList} />
          ))}
        </div>
      )}
    </div>
  );
}
