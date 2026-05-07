import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, FileText, BarChart3, Menu, LogOut, UserPlus, Building2, Shield, FileSearch } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import RotasTab from './RotasTab';
import MotoristasTab from './MotoristasTab';
import NFeTab from './NFeTab';
import RelatoriosTab from './RelatoriosTab';
import NotasFiscaisPage from './NotasFiscaisPage';

type Tab = 'rotas' | 'motoristas' | 'nfe' | 'notas' | 'relatorios';

const tabs: { key: Tab; label: string; icon: typeof MapPin }[] = [
  { key: 'rotas', label: 'Rotas', icon: MapPin },
  { key: 'motoristas', label: 'Motoristas', icon: Users },
  { key: 'nfe', label: 'Importar', icon: FileText },
  { key: 'notas', label: 'Notas', icon: FileSearch },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
];

export default function AppShell() {
  const [tab, setTab] = useState<Tab>('rotas');
  const [resetOpen, setResetOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const { resetarRota, carregarDemo } = useApp();
  const { company, profile, isAdmin, isSuperAdmin, signOut } = useAuth();

  const handleReset = async () => {
    await resetarRota();
    toast.success('Todos os dados foram apagados.');
    setResetOpen(false);
  };
  const handleDemo = async () => {
    await carregarDemo();
    toast.success('Base demo carregada!');
    setDemoOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">RotiFlow</h1>
          <p className="text-[10px] text-muted-foreground">
            {company?.name || '—'} · {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm"><Menu className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{profile?.email}</div>
            <DropdownMenuSeparator />
            {isSuperAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/admin/empresas"><Building2 className="h-4 w-4 mr-2" /> Empresas</Link>
                </DropdownMenuItem>
              </>
            )}
            {isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/admin/convites"><UserPlus className="h-4 w-4 mr-2" /> Convidar usuário</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/auditoria"><Shield className="h-4 w-4 mr-2" /> Auditoria</Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDemoOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Carregar dados demo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResetOpen(true)} className="text-destructive">
              <RotateCcw className="h-4 w-4 mr-2" /> Apagar tudo agora
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {tab === 'rotas' && <RotasTab />}
        {tab === 'motoristas' && <MotoristasTab />}
        {tab === 'nfe' && <NFeTab />}
        {tab === 'notas' && <NotasFiscaisPage />}
        {tab === 'relatorios' && <RelatoriosTab />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex justify-around items-center h-16 max-w-2xl mx-auto">
          {tabs.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-1 px-2 py-2 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <t.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apagar todos os dados?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todas as paradas, motoristas e notas fiscais da sua empresa serão removidos. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReset}>Apagar tudo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Carregar base demo?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isto irá <strong>apagar todos os dados atuais</strong> e carregar 6 paradas + 3 motoristas de exemplo (São Paulo) para testar a roteirização.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDemoOpen(false)}>Cancelar</Button>
            <Button onClick={handleDemo}>Apagar e carregar demo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
