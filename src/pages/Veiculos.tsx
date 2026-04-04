import { Truck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Veiculos() {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Veículos</h1>
          <p className="text-muted-foreground text-sm">Cadastro e gestão da frota</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Novo Veículo
        </Button>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum veículo cadastrado</h3>
          <p className="text-muted-foreground text-sm mt-1">Cadastre veículos para associar às rotas.</p>
        </CardContent>
      </Card>
    </div>
  );
}
