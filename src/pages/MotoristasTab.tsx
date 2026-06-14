import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Users, Weight, Box, Trash2, AlertTriangle, MapPin, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function MotoristasTab() {
  const { motoristas, addMotorista, updateMotorista, removeMotorista, paradas, capacityWarnings } = useApp();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [placa, setPlaca] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [capPeso, setCapPeso] = useState('');
  const [capVolume, setCapVolume] = useState('');
  const [pwdReset, setPwdReset] = useState<{ id: string; email: string } | null>(null);
  const [novaSenha, setNovaSenha] = useState('');

  const emRota = motoristas.filter(m => m.ativo).length;

  const resetForm = () => {
    setNome(''); setPlaca(''); setTelefone(''); setEmail(''); setSenha('');
    setCapPeso(''); setCapVolume('');
  };

  const handleSave = async () => {
    // Validações
    if (!nome.trim()) return toast.error('Nome é obrigatório');
    if (nome.trim().length < 3) return toast.error('Nome muito curto');
    if (!placa.trim()) return toast.error('Placa é obrigatória');
    if (!email.trim()) return toast.error('E-mail é obrigatório (será o login do motorista)');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) return toast.error('E-mail inválido');
    if (!senha) return toast.error('Crie uma senha para o motorista');
    if (senha.length < 6) return toast.error('Senha precisa ter ao menos 6 caracteres');
    if (telefone && telefone.replace(/\D/g, '').length < 10) return toast.error('Telefone inválido');

    setSaving(true);
    try {
      const novo = await addMotorista({
        nome: nome.trim(), placa: placa.trim().toUpperCase(),
        telefone: telefone.trim() || undefined,
        email: email.trim().toLowerCase(),
        capacidadePeso: capPeso ? Number(capPeso) : undefined,
        capacidadeVolume: capVolume ? Number(capVolume) : undefined,
      });
      // Criar usuário de login para o motorista
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'create_motorista_user',
          company_id: profile?.company_id,
          motorista_id: novo.id,
          email: email.trim().toLowerCase(),
          password: senha,
          full_name: nome.trim(),
        },
      });
      if (error || (data as any)?.error) {
        toast.error(`Motorista criado, mas falhou criar login: ${(data as any)?.error || error?.message}`);
      } else {
        toast.success(`Motorista "${nome}" cadastrado e login criado!`);
      }
      resetForm();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao cadastrar motorista');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!pwdReset) return;
    if (novaSenha.length < 6) return toast.error('Senha precisa ter ao menos 6 caracteres');
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'reset_motorista_password', company_id: profile?.company_id, email: pwdReset.email, password: novaSenha },
    });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message);
    toast.success('Senha atualizada');
    setPwdReset(null); setNovaSenha('');
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Motorista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome completo *</label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João Silva" maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium">Placa do veículo *</label>
              <Input value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-1234" maxLength={10} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">WhatsApp</label>
                <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-0000" maxLength={20} />
              </div>
              <div>
                <label className="text-xs font-medium"><Mail className="inline h-3 w-3" /> E-mail (login) *</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="motorista@email.com" maxLength={255} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium"><KeyRound className="inline h-3 w-3" /> Senha do app *</label>
              <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
              <p className="text-[10px] text-muted-foreground mt-0.5">O motorista usará este e-mail e senha para entrar no aplicativo.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium"><Weight className="inline h-3 w-3 mr-0.5" />Capacidade (kg)</label>
                <Input type="number" value={capPeso} onChange={e => setCapPeso(e.target.value)} placeholder="Ex: 100" min={0} />
              </div>
              <div>
                <label className="text-xs font-medium"><Box className="inline h-3 w-3 mr-0.5" />Capacidade (m³)</label>
                <Input type="number" value={capVolume} onChange={e => setCapVolume(e.target.value)} placeholder="Ex: 2.0" step="0.1" min={0} />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwdReset} onOpenChange={(o) => { if (!o) { setPwdReset(null); setNovaSenha(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redefinir senha do motorista</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">E-mail: <strong>{pwdReset?.email}</strong></p>
          <Input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwdReset(null); setNovaSenha(''); }}>Cancelar</Button>
            <Button onClick={handleResetPassword}>Atualizar senha</Button>
          </DialogFooter>
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
                      <p className="text-xs text-muted-foreground">{m.placa}{m.email ? ` · ${m.email}` : ''}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`h-2 w-2 rounded-full ${m.ativo ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                        <span className="text-xs text-muted-foreground">{m.ativo ? 'Em rota' : 'Disponível'}</span>
                        {m.ativo && m.checkinTime && <span className="text-xs text-muted-foreground">· desde {m.checkinTime}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.email && (
                        <Button variant="ghost" size="sm" className="h-7 px-1" title="Redefinir senha"
                          onClick={() => setPwdReset({ id: m.id, email: m.email! })}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
