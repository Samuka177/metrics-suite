import { Maximize2, Minimize2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoRotiflow from '@/assets/logo-rotiflow.webp';

interface HeaderProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onPrint: () => void;
  hasData: boolean;
}

export default function Header({ isFullscreen, onToggleFullscreen, onPrint, hasData }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 card-surface px-6 py-3 flex items-center justify-between no-print">
      <div className="flex items-center gap-3">
        <img src={logoRotiflow} alt="RotiFlow" className="h-10 w-auto" />
        <div>
          <h1 className="text-xl font-bold text-foreground">RotiFlow</h1>
          <p className="text-xs text-muted-foreground">Turatti Cervejaria — Gestão de Entregas</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:block">
          {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        {hasData && (
          <>
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
