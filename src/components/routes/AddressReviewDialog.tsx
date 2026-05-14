import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { needsAddressReview } from '@/utils/addressValidation';
import type { Parada } from '@/types/rotafacil';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAllConfirmed: () => void;
}

export default function AddressReviewDialog({ open, onOpenChange, onAllConfirmed }: Props) {
  const { paradas, updateParada } = useApp();
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ logradouro: '', numero: '', bairro: '', municipio: '', uf: '', cep: '' });

  useEffect(() => {
    if (open) {
      // pré-confirma os endereços que já estão OK
      const ok = new Set(paradas.filter(p => !needsAddressReview(p)).map(p => p.id));
      setConfirmed(ok);
    }
  }, [open, paradas]);

  const startEdit = (p: Parada) => {
    setEditingId(p.id);
    setForm({ logradouro: p.endereco || '', numero: '', bairro: '', municipio: '', uf: '', cep: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const partes = [
      form.logradouro && form.numero ? `${form.logradouro}, ${form.numero}` : form.logradouro,
      form.bairro,
      form.municipio,
      form.uf,
      form.cep,
    ].filter(Boolean);
    const novo = partes.join(' - ');
    await updateParada(editingId, { endereco: novo, lat: undefined, lng: undefined });
    setConfirmed(prev => new Set(prev).add(editingId));
    setEditingId(null);
    toast.success('Endereço atualizado');
  };

  const toggleConfirm = (id: string) => {
    setConfirmed(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const allConfirmed = paradas.length > 0 && paradas.every(p => confirmed.has(p.id));
  const pendentes = paradas.filter(p => !confirmed.has(p.id)).length;

  const proceed = () => {
    if (!allConfirmed) {
      toast.error(`${pendentes} endereço(s) ainda precisam ser confirmados`);
      return;
    }
    onAllConfirmed();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar endereços antes de roteirizar</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Confirme cada endereço. Itens com <Badge variant="destructive" className="text-[10px] mx-1">⚠ Verificar</Badge>
            estão sem CEP ou número e devem ser corrigidos manualmente.
          </p>

          {paradas.map(p => {
            const isConfirmed = confirmed.has(p.id);
            const needs = needsAddressReview(p);
            const isEditing = editingId === p.id;
            return (
              <Card key={p.id} className={isConfirmed ? 'border-success/40' : needs ? 'border-destructive/40' : ''}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground break-words">{p.endereco || '(sem endereço)'}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {needs && !isConfirmed && (
                        <Badge variant="destructive" className="text-[10px]">⚠ Verificar</Badge>
                      )}
                      {isConfirmed && (
                        <Badge className="bg-success text-success-foreground text-[10px]">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> OK
                        </Badge>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <Input placeholder="Logradouro" value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))} className="col-span-2 h-8 text-xs" />
                      <Input placeholder="Número" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} className="h-8 text-xs" />
                      <Input placeholder="Bairro" value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} className="h-8 text-xs" />
                      <Input placeholder="Município" value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} className="h-8 text-xs" />
                      <Input placeholder="UF" maxLength={2} value={form.uf} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} className="h-8 text-xs" />
                      <Input placeholder="CEP" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} className="col-span-2 h-8 text-xs" />
                      <div className="col-span-2 flex gap-1.5 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3.5 w-3.5 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => startEdit(p)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant={isConfirmed ? 'secondary' : 'default'}
                        className="h-7 text-[11px]"
                        onClick={() => toggleConfirm(p.id)}
                      >
                        {isConfirmed ? 'Desmarcar' : 'Confirmar'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <p className="text-xs text-muted-foreground mr-auto">
            {confirmed.size} de {paradas.length} confirmados
            {pendentes > 0 && <span className="text-destructive ml-1"><AlertTriangle className="inline h-3 w-3" /> {pendentes} pendente(s)</span>}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={proceed} disabled={!allConfirmed}>
            Roteirizar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
