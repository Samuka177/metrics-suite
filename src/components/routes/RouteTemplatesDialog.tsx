import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Bookmark, Trash2, Save, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Parada } from '@/types/rotafacil';

interface Template {
  id: string;
  name: string;
  paradas: any[];
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function RouteTemplatesDialog({ open, onOpenChange }: Props) {
  const { paradas, importParadas } = useApp();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!companyId) return;
    const { data } = await supabase.from('rota_templates')
      .select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    setTemplates((data || []) as any);
  };

  useEffect(() => { if (open) load(); }, [open, companyId]);

  const save = async () => {
    if (!companyId || !name.trim() || paradas.length === 0) {
      toast.error('Informe um nome e tenha paradas na rota');
      return;
    }
    setBusy(true);
    const snapshot = paradas.map(p => ({
      nome: p.nome, endereco: p.endereco, tipo: p.tipo,
      lat: p.lat, lng: p.lng, peso: p.peso, volume: p.volume,
      horario: p.horario, horarioMin: p.horarioMin, horarioMax: p.horarioMax,
      observacoes: p.observacoes, telefone: p.telefone,
      produtos: p.produtos.map(({ id, entregue, ...r }) => r),
    }));
    const { error } = await supabase.from('rota_templates').insert({
      company_id: companyId, name: name.trim(), paradas: snapshot, created_by: profile?.user_id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Template salvo!');
    setName('');
    load();
  };

  const apply = async (t: Template) => {
    setBusy(true);
    const list = (t.paradas as any[]).map(p => ({
      nome: p.nome, endereco: p.endereco, tipo: p.tipo || 'Delivery',
      lat: p.lat, lng: p.lng, peso: p.peso, volume: p.volume,
      horario: p.horario, horarioMin: p.horarioMin, horarioMax: p.horarioMax,
      observacoes: p.observacoes, telefone: p.telefone,
    }));
    await importParadas(list as any);
    setBusy(false);
    toast.success(`${list.length} paradas carregadas de "${t.name}"`);
    onOpenChange(false);
  };

  const del = async (id: string) => {
    await supabase.from('rota_templates').delete().eq('id', id);
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Bookmark className="h-4 w-4" /> Rotas pré-definidas</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-md p-3 space-y-2">
            <p className="text-xs font-medium">Salvar rota atual como template</p>
            <div className="flex gap-2">
              <Input placeholder="Ex: Rota segunda zona sul" value={name} onChange={e => setName(e.target.value)} />
              <Button onClick={save} disabled={busy || !name.trim() || paradas.length === 0}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{paradas.length} parada(s) na rota atual</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium">Templates salvos ({templates.length})</p>
            {templates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum template ainda.</p>
            ) : templates.map(t => (
              <Card key={t.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{(t.paradas as any[]).length} paradas · {new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => apply(t)} disabled={busy}>
                      <Download className="h-4 w-4 mr-1" /> Carregar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
