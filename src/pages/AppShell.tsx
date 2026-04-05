import { useState } from 'react';
import { MapPin, Users, FileText, Menu, RotateCcw, Beer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RotasTab from './RotasTab';
import MotoristasTab from './MotoristasTab';
import NFeTab from './NFeTab';

type Tab = 'rotas' | 'motoristas' | 'nfe';

const tabs: { key: Tab; label: string; icon: typeof MapPin }[] = [
  { key: 'rotas', label: 'Rotas', icon: MapPin },
  { key: 'motoristas', label: 'Motoristas', icon: Users },
  { key: 'nfe', label: 'NF-e', icon: FileText },
];

export default function AppShell() {
  const [tab, setTab] = useState<Tab>('rotas');
  const [resetOpen, setResetOpen] = useState(false);
  const { resetarRota } = useApp();

  const handleReset = () => {
    resetarRota();
    toast.success('Rota do dia resetada!');
    setResetOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beer className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Rota Fácil</h1>
            <p className="text-[10px] text-muted-foreground">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm"><Menu className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-4 w-4 mr-2" /> Resetar rota do dia
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {tab === 'rotas' && <RotasTab />}
        {tab === 'motoristas' && <MotoristasTab />}
        {tab === 'nfe' && <NFeTab />}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {tabs.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <t.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Reset confirmation */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetar rota do dia?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Todos os dados de paradas e motoristas serão restaurados aos valores iniciais.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReset}>Resetar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
