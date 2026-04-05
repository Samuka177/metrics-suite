import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus, MapPin, Clock, Package, ArrowDownUp, CheckCircle2, Truck, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TipoEntrega, Parada } from '@/types/rotafacil';

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function AddParadaSheet() {
  const { addParada } = useApp();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipo, setTipo] = useState<TipoEntrega>('Ponto fixo');
  const [horario, setHorario] = useState('');
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
    addParada({ nome, endereco, tipo, horario: horario || undefined, produtos });
    toast.success(`Parada "${nome}" adicionada!`);
    setNome(''); setEndereco(''); setTipo('Ponto fixo'); setHorario(''); setProdutos([]);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar parada</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Nova Parada</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Nome do cliente *</label>
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
          <div>
            <label className="text-sm font-medium">Horário (opcional — define prioridade)</label>
            <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} />
          </div>
          <div className="border-t pt-4">
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

function CheckinDialog({ parada }: { parada: Parada }) {
  const { updateParada } = useApp();
  const [open, setOpen] = useState(false);

  const confirmar = () => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    updateParada(parada.id, { status: 'em_entrega', checkinTime: now });
    toast.success(`Check-in em "${parada.nome}" às ${now}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Check-in</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Check-in — {parada.nome}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <p><MapPin className="inline h-4 w-4 mr-1" />{parada.endereco}</p>
          <div className="flex gap-2">
            <Badge variant={parada.tipo === 'Ponto fixo' ? 'default' : 'secondary'}>{parada.tipo}</Badge>
            {parada.horario && <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />{parada.horario}</Badge>}
          </div>
          <div className="border-t pt-2 mt-2">
            <p className="font-medium mb-1">Produtos:</p>
            {parada.produtos.map(p => (
              <p key={p.id} className="text-muted-foreground">• {p.nome} — {p.quantidade} {p.unidade}</p>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={confirmar} className="w-full"><CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar chegada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutDialog({ parada }: { parada: Parada }) {
  const { updateParada } = useApp();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const total = parada.produtos.length;
  const done = Object.values(checked).filter(Boolean).length;
  const allDone = done === total && total > 0;

  const finalizar = () => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    updateParada(parada.id, {
      status: 'entregue',
      checkoutTime: now,
      produtos: parada.produtos.map(p => ({ ...p, entregue: true })),
    });
    toast.success(`Entrega em "${parada.nome}" concluída às ${now}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setChecked({}); }}>
      <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => setOpen(true)}>
        <Truck className="h-4 w-4 mr-1" /> Confirmar entrega
      </Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Confirmar produtos entregues</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Progress value={total > 0 ? (done / total) * 100 : 0} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{done}/{total} itens confirmados</p>
          {parada.produtos.map(p => (
            <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
              <Checkbox checked={!!checked[p.id]} onCheckedChange={(v) => setChecked(prev => ({ ...prev, [p.id]: !!v }))} />
              <span className="text-sm">{p.nome} — {p.quantidade} {p.unidade}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={finalizar} disabled={!allDone} className="w-full bg-success hover:bg-success/90">
            Finalizar entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalhesDialog({ parada }: { parada: Parada }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Eye className="h-4 w-4 mr-1" /> Detalhes</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>{parada.nome}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <p><MapPin className="inline h-4 w-4 mr-1" />{parada.endereco}</p>
          <p>Check-in: <strong>{parada.checkinTime || '—'}</strong></p>
          <p>Check-out: <strong>{parada.checkoutTime || '—'}</strong></p>
          <div className="border-t pt-2">
            {parada.produtos.map(p => (
              <p key={p.id} className="text-muted-foreground">✓ {p.nome} — {p.quantidade} {p.unidade}</p>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  em_entrega: { label: 'Em entrega', className: 'bg-warning text-warning-foreground' },
  entregue: { label: 'Entregue', className: 'bg-success text-success-foreground' },
};

export default function RotasTab() {
  const { paradas, roteirizar } = useApp();
  const total = paradas.length;
  const entregues = paradas.filter(p => p.status === 'entregue').length;
  const pendentes = paradas.filter(p => p.status === 'pendente').length;

  return (
    <div className="space-y-4 fade-in pb-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total" value={total} color="text-primary" />
        <MetricCard label="Entregues" value={entregues} color="text-success" />
        <MetricCard label="Pendentes" value={pendentes} color="text-muted-foreground" />
      </div>

      <div className="flex gap-2">
        <AddParadaSheet />
        <Button variant="outline" size="sm" onClick={() => { roteirizar(); toast.success('Rota otimizada com sucesso!'); }}>
          <ArrowDownUp className="h-4 w-4 mr-1" /> Roteirizar
        </Button>
      </div>

      {paradas.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">Nenhuma parada cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione paradas ou importe NF-e para começar.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {paradas.map((p, i) => {
            const st = statusConfig[p.status];
            return (
              <Card key={p.id} className="fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.endereco}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant={p.tipo === 'Ponto fixo' ? 'default' : 'secondary'} className={p.tipo === 'Ponto fixo' ? 'bg-warning text-warning-foreground' : 'bg-blue-100 text-blue-700'}>
                            {p.tipo}
                          </Badge>
                          {p.horario && (
                            <Badge variant="destructive" className="text-xs">
                              <Clock className="h-3 w-3 mr-0.5" />{p.horario}
                            </Badge>
                          )}
                          <Badge className={st.className}>{st.label}</Badge>
                        </div>
                        {p.produtos.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            <Package className="inline h-3 w-3 mr-0.5" />
                            {p.produtos.length} {p.produtos.length === 1 ? 'produto' : 'produtos'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {p.status === 'pendente' && <CheckinDialog parada={p} />}
                      {p.status === 'em_entrega' && <CheckoutDialog parada={p} />}
                      {p.status === 'entregue' && <DetalhesDialog parada={p} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
