import { useEffect, useState } from 'react';
import { Route, Truck, Users, Package, AlertTriangle, CheckCircle2, TrendingUp, MapPin, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { haversine } from '@/utils/routeOptimization';

interface KPIs {
  rotasHoje: number;
  entregasDia: number;
  motoristasAtivos: number;
  veiculosEmRota: number;
  otif: number;            // % entregue no prazo
  taxaInsucesso: number;   // % falhou
  kmTotais: number;
  tempoMedioMin: number;
  paradasPendentes: number;
  paradasEmAndamento: number;
  paradasEntregues: number;
  paradasFalhas: number;
}

const empty: KPIs = {
  rotasHoje: 0, entregasDia: 0, motoristasAtivos: 0, veiculosEmRota: 0,
  otif: 0, taxaInsucesso: 0, kmTotais: 0, tempoMedioMin: 0,
  paradasPendentes: 0, paradasEmAndamento: 0, paradasEntregues: 0, paradasFalhas: 0,
};

export default function Dashboard() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [kpis, setKpis] = useState<KPIs>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: paradasHoje }, { data: motoristas }] = await Promise.all([
        supabase.from('paradas').select('*').eq('company_id', companyId).eq('data_rota', today),
        supabase.from('motoristas').select('*').eq('company_id', companyId),
      ]);

      const ps = paradasHoje || [];
      const motoristasComRota = new Set(ps.map((p: any) => p.motorista_id).filter(Boolean));
      const entregues = ps.filter((p: any) => p.status === 'entregue');
      const falhas = ps.filter((p: any) => p.status === 'nao_realizada' || p.status === 'falhou');
      const pendentes = ps.filter((p: any) => p.status === 'pendente');
      const emAndamento = ps.filter((p: any) => p.status === 'em_andamento' || p.status === 'em_entrega');

      // OTIF: entregues dentro do horario_max (se definido) / total entregues
      let onTime = 0, withWindow = 0;
      for (const p of entregues) {
        if (p.horario_max && p.checkout_time) {
          withWindow++;
          if (p.checkout_time <= p.horario_max) onTime++;
        }
      }
      const otif = withWindow > 0 ? (onTime / withWindow) * 100 : (entregues.length > 0 ? 100 : 0);

      // Total fechado (entregue + falha)
      const finalizadas = entregues.length + falhas.length;
      const taxaInsucesso = finalizadas > 0 ? (falhas.length / finalizadas) * 100 : 0;

      // Km totais: soma de haversine entre paradas com lat/lng por motorista
      let kmTotais = 0;
      const porMotorista = new Map<string, any[]>();
      ps.forEach((p: any) => {
        if (!p.motorista_id || p.lat == null || p.lng == null) return;
        const arr = porMotorista.get(p.motorista_id) || [];
        arr.push(p);
        porMotorista.set(p.motorista_id, arr);
      });
      for (const arr of porMotorista.values()) {
        arr.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        for (let i = 1; i < arr.length; i++) {
          kmTotais += haversine(arr[i - 1].lat, arr[i - 1].lng, arr[i].lat, arr[i].lng);
        }
      }

      // Tempo médio: checkout - checkin em minutos
      let totalMin = 0, withTimes = 0;
      for (const p of ps) {
        if (p.checkin_time && p.checkout_time) {
          const [hi, mi] = p.checkin_time.split(':').map(Number);
          const [ho, mo] = p.checkout_time.split(':').map(Number);
          const diff = (ho * 60 + mo) - (hi * 60 + mi);
          if (diff > 0 && diff < 12 * 60) { totalMin += diff; withTimes++; }
        }
      }
      const tempoMedioMin = withTimes > 0 ? Math.round(totalMin / withTimes) : 0;

      setKpis({
        rotasHoje: motoristasComRota.size,
        entregasDia: entregues.length,
        motoristasAtivos: (motoristas || []).filter((m: any) => m.ativo).length,
        veiculosEmRota: motoristasComRota.size,
        otif: Math.round(otif),
        taxaInsucesso: Math.round(taxaInsucesso),
        kmTotais: Math.round(kmTotais * 10) / 10,
        tempoMedioMin,
        paradasPendentes: pendentes.length,
        paradasEmAndamento: emAndamento.length,
        paradasEntregues: entregues.length,
        paradasFalhas: falhas.length,
      });
      setLoading(false);
    })();
  }, [companyId]);

  const totalParadas = kpis.paradasPendentes + kpis.paradasEmAndamento + kpis.paradasEntregues + kpis.paradasFalhas;
  const progresso = totalParadas > 0 ? Math.round(((kpis.paradasEntregues + kpis.paradasFalhas) / totalParadas) * 100) : 0;

  const stats = [
    { label: 'Rotas Hoje', value: kpis.rotasHoje, icon: Route, color: 'text-primary' },
    { label: 'Entregas do Dia', value: kpis.entregasDia, icon: Package, color: 'text-chart-2' },
    { label: 'Motoristas Ativos', value: kpis.motoristasAtivos, icon: Users, color: 'text-chart-3' },
    { label: 'Veículos em Rota', value: kpis.veiculosEmRota, icon: Truck, color: 'text-chart-1' },
  ];

  const operacionais = [
    { label: 'OTIF (no prazo)', value: `${kpis.otif}%`, icon: CheckCircle2, color: kpis.otif >= 90 ? 'text-success' : kpis.otif >= 70 ? 'text-warning' : 'text-destructive' },
    { label: 'Taxa de insucesso', value: `${kpis.taxaInsucesso}%`, icon: XCircle, color: kpis.taxaInsucesso <= 5 ? 'text-success' : kpis.taxaInsucesso <= 15 ? 'text-warning' : 'text-destructive' },
    { label: 'Km percorridos', value: `${kpis.kmTotais.toLocaleString('pt-BR')} km`, icon: MapPin, color: 'text-primary' },
    { label: 'Tempo médio/parada', value: kpis.tempoMedioMin > 0 ? `${kpis.tempoMedioMin} min` : '—', icon: Clock, color: 'text-chart-2' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do dia · {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{loading ? '—' : stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" /> KPIs Operacionais
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {operacionais.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{loading ? '—' : stat.value}</p>
                  </div>
                  <stat.icon className={`h-7 w-7 ${stat.color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4" />
              Progresso do dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalParadas === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma parada programada para hoje.</p>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{kpis.paradasEntregues + kpis.paradasFalhas} de {totalParadas} concluídas</span>
                  <span className="font-bold text-foreground">{progresso}%</span>
                </div>
                <Progress value={progresso} />
                <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2">
                  <div><p className="text-muted-foreground">Pendentes</p><p className="font-bold text-foreground">{kpis.paradasPendentes}</p></div>
                  <div><p className="text-muted-foreground">Em andamento</p><p className="font-bold text-warning">{kpis.paradasEmAndamento}</p></div>
                  <div><p className="text-muted-foreground">Entregues</p><p className="font-bold text-success">{kpis.paradasEntregues}</p></div>
                  <div><p className="text-muted-foreground">Falhas</p><p className="font-bold text-destructive">{kpis.paradasFalhas}</p></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.taxaInsucesso > 15 && (
              <p className="text-sm text-destructive flex items-center gap-1"><XCircle className="h-4 w-4" /> Taxa de insucesso elevada: {kpis.taxaInsucesso}%</p>
            )}
            {kpis.otif > 0 && kpis.otif < 70 && (
              <p className="text-sm text-warning flex items-center gap-1"><Clock className="h-4 w-4" /> OTIF abaixo do alvo (70%): {kpis.otif}%</p>
            )}
            {kpis.taxaInsucesso <= 15 && (kpis.otif >= 70 || kpis.otif === 0) && (
              <p className="text-muted-foreground text-sm">Nenhum alerta no momento.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
