import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function MotoristasTab() {
  const { motoristas, addMotorista, updateMotorista } = useApp();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [placa, setPlaca] = useState('');

  const emRota = motoristas.filter(m => m.ativo).length;

  const handleSave = () => {
    if (!nome || !placa) { toast.error('Preencha nome e placa'); return; }
    addMotorista({ nome, placa });
    toast.success(`Motorista "${nome}" cadastrado!`);
    setNome(''); setPlaca(''); setOpen(false);
  };

  const checkin = (id: string) => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    updateMotorista(id, { ativo: true, checkinTime: now, checkoutTime: undefined });
    toast.success(`Check-in registrado às ${now}`);
  };

  const checkout = (id: string) => {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    updateMotorista(id, { ativo: false, checkoutTime: now });
    toast.success(`Check-out registrado às ${now}`);
  };

  return (
    <div className="space-y-4 fade-in pb-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          <span className="text-foreground font-bold text-lg">{emRota}</span> {emRota === 1 ? 'motorista' : 'motoristas'} em rota hoje
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
          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {motoristas.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">Nenhum motorista cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Cadastre motoristas para atribuí-los às rotas.</p>
          <Button size="sm" className="mt-3" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Cadastrar</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {motoristas.map(m => {
            const initials = m.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <Card key={m.id} className="fade-in">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.placa}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`h-2 w-2 rounded-full ${m.ativo ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                      <span className="text-xs text-muted-foreground">{m.ativo ? 'Em rota' : 'Disponível'}</span>
                      {m.ativo && m.checkinTime && <span className="text-xs text-muted-foreground">· desde {m.checkinTime}</span>}
                    </div>
                  </div>
                  {m.ativo ? (
                    <Button variant="outline" size="sm" className="text-destructive border-destructive" onClick={() => checkout(m.id)}>
                      Check-out
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => checkin(m.id)}>
                      Check-in
                    </Button>
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
