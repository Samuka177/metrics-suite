import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Motoristas() {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>
          <p className="text-muted-foreground text-sm">Cadastro e gestão de motoristas</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Novo Motorista
        </Button>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum motorista cadastrado</h3>
          <p className="text-muted-foreground text-sm mt-1">Cadastre motoristas para atribuí-los às rotas.</p>
        </CardContent>
      </Card>
    </div>
  );
}
