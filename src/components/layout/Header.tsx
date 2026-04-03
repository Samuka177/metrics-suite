import { Beer, Calendar, Maximize2, Minimize2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        <Beer className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Turatti Cervejaria</h1>
          <p className="text-xs text-muted-foreground">LogiDash — Painel Executivo</p>
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
