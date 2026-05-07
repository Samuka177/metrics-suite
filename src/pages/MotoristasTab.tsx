import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Users, Weight, Box, Trash2, AlertTriangle, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function MotoristasTab() {
  const { motoristas, addMotorista, updateMotorista, removeMotorista, paradas, capacityWarnings } = useApp();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [placa, setPlaca] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [capPeso, setCapPeso] = useState('');
  const [capVolume, setCapVolume] = useState('');

  const emRota = motoristas.filter(m => m.ativo).length;

  const handleSave = () => {
    if (!nome || !placa) { toast.error('Preencha nome e placa'); return; }
    addMotorista({
      nome, placa, telefone: telefone || undefined, email: email || undefined,
      capacidadePeso: capPeso ? Number(capPeso) : undefined,
      capacidadeVolume: capVolume ? Number(capVolume) : undefined,
    });
    toast.success(`Motorista "${nome}" cadastrado!`);
    setNome(''); setPlaca(''); setTelefone(''); setEmail(''); setCapPeso(''); setCapVolume(''); setOpen(false);
  };

  const checkin = (id: string) => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    updateMotorista(id, { ativo: true, checkinTime: now, checkoutTime: undefined });
    toast.success(`Check-in às ${now}`);
  };

  const checkout = (id: string) => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    updateMotorista(id, { ativo: false, checkoutTime: now });
    toast.success(`Check-out às ${now}`);
  };

  return (
    <div className="space-y-4 fade-in pb-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          <span className="text-foreground font-bold text-lg">{emRota}</span> em rota
        </p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Motorista</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Motorista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome completo</label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João Silva" />
            </div>
            <div>
              <label className="text-sm font-medium">Placa do veículo</label>
              <Input value={placa} onChange={e => setPlaca(e.target.value)} placeholder="ABC-1234" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium"><Weight className="inline h-3 w-3 mr-0.5" />Capacidade (kg)</label>
                <Input type="number" value={capPeso} onChange={e => setCapPeso(e.target.value)} placeholder="Ex: 100" />
              </div>
              <div>
                <label className="text-xs font-medium"><Box className="inline h-3 w-3 mr-0.5" />Capacidade (m³)</label>
                <Input type="number" value={capVolume} onChange={e => setCapVolume(e.target.value)} placeholder="Ex: 2.0" step="0.1" />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {motoristas.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">Nenhum motorista cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Cadastre motoristas com capacidade para distribuir paradas.</p>
          <Button size="sm" className="mt-3" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Cadastrar</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {motoristas.map(m => {
            const initials = m.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const assigned = paradas.filter(p => p.motoristaId === m.id);
            const pesoUsado = assigned.reduce((s, p) => s + (p.peso || 0), 0);
            const volumeUsado = assigned.reduce((s, p) => s + (p.volume || 0), 0);
            const warning = capacityWarnings.find(w => w.motoristaId === m.id);
            const pesoMax = m.capacidadePeso || 0;
            const volumeMax = m.capacidadeVolume || 0;
            const pesoPct = pesoMax > 0 ? Math.min(100, (pesoUsado / pesoMax) * 100) : 0;
            const volumePct = volumeMax > 0 ? Math.min(100, (volumeUsado / volumeMax) * 100) : 0;

            return (
              <Card key={m.id} className={`fade-in ${warning ? 'border-destructive/50' : ''}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white" style={{ backgroundColor: m.cor }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">{m.placa}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`h-2 w-2 rounded-full ${m.ativo ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                        <span className="text-xs text-muted-foreground">{m.ativo ? 'Em rota' : 'Disponível'}</span>
                        {m.ativo && m.checkinTime && <span className="text-xs text-muted-foreground">· desde {m.checkinTime}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.ativo ? (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive h-7 text-xs" onClick={() => checkout(m.id)}>Check-out</Button>
                      ) : (
                        <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground h-7 text-xs" onClick={() => checkin(m.id)}>Check-in</Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-1 text-destructive" onClick={() => { removeMotorista(m.id); toast.success('Motorista removido'); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Capacity indicators */}
                  {(pesoMax > 0 || volumeMax > 0) && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {pesoMax > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground"><Weight className="inline h-2.5 w-2.5" /> Peso</span>
                            <span className={warning?.excedePeso ? 'text-destructive font-bold' : 'text-foreground'}>{pesoUsado}/{pesoMax} kg</span>
                          </div>
                          <Progress value={pesoPct} className={`h-1.5 ${warning?.excedePeso ? '[&>div]:bg-destructive' : ''}`} />
                        </div>
                      )}
                      {volumeMax > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground"><Box className="inline h-2.5 w-2.5" /> Volume</span>
                            <span className={warning?.excedeVolume ? 'text-destructive font-bold' : 'text-foreground'}>{volumeUsado.toFixed(1)}/{volumeMax} m³</span>
                          </div>
                          <Progress value={volumePct} className={`h-1.5 ${warning?.excedeVolume ? '[&>div]:bg-destructive' : ''}`} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assigned stops summary */}
                  {assigned.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground border-t pt-1.5">
                      <MapPin className="h-3 w-3" />
                      {assigned.length} parada(s) atribuída(s)
                      {warning && <AlertTriangle className="h-3 w-3 text-destructive ml-auto" />}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
