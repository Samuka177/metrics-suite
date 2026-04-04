import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotasFiscais() {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notas Fiscais</h1>
          <p className="text-muted-foreground text-sm">Importação e gestão de NF-e</p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" /> Importar XML
        </Button>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Nenhuma nota fiscal importada</h3>
          <p className="text-muted-foreground text-sm mt-1">Importe arquivos XML de NF-e para criar rotas de entrega.</p>
        </CardContent>
      </Card>
    </div>
  );
}
