import { Route, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Rotas() {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rotas</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas rotas de entrega</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nova Rota
        </Button>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Nenhuma rota cadastrada</h3>
          <p className="text-muted-foreground text-sm mt-1">Crie sua primeira rota de entrega para começar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
