import { BarChart3, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
  { title: 'Relatório de Entregas', description: 'Entregas por período, taxa de sucesso e motivos de falha' },
  { title: 'Relatório de Motoristas', description: 'Ranking de desempenho, total de entregas e comparativos' },
  { title: 'Relatório de Veículos', description: 'Uso da frota, quilometragem e status dos veículos' },
  { title: 'Relatório de NFs', description: 'Notas entregues, pendentes e valor total do período' },
];

export default function Relatorios() {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Análises e exportações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <Card key={report.title} className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {report.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{report.description}</p>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <FileDown className="h-3 w-3" /> Disponível em breve
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
