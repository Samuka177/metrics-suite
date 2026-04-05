import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, TrendingUp, Package, Truck, Users, Clock,
  CheckCircle2, XCircle, MapPin, AlertTriangle, Timer
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = {
  primary: 'hsl(36, 78%, 41%)',
  success: 'hsl(100, 72%, 25%)',
  warning: 'hsl(36, 78%, 41%)',
  destructive: 'hsl(0, 84%, 60%)',
  muted: 'hsl(30, 10%, 65%)',
  blue: 'hsl(210, 60%, 50%)',
};

function KPICard({ icon: Icon, label, value, subtitle, color }: {
  icon: typeof BarChart3; label: string; value: string | number; subtitle?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BarChart3; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
  );
}

export default function RelatoriosTab() {
  const { paradas, motoristas } = useApp();

  const stats = useMemo(() => {
    const total = paradas.length;
    const entregues = paradas.filter(p => p.status === 'entregue').length;
    const emEntrega = paradas.filter(p => p.status === 'em_entrega').length;
    const pendentes = paradas.filter(p => p.status === 'pendente').length;
    const taxaSucesso = total > 0 ? Math.round((entregues / total) * 100) : 0;

    const totalProdutos = paradas.reduce((sum, p) => sum + p.produtos.length, 0);
    const produtosEntregues = paradas
      .filter(p => p.status === 'entregue')
      .reduce((sum, p) => sum + p.produtos.length, 0);

    const pontoFixo = paradas.filter(p => p.tipo === 'Ponto fixo').length;
    const delivery = paradas.filter(p => p.tipo === 'Delivery').length;

    const comHorario = paradas.filter(p => p.horario).length;
    const semHorario = paradas.filter(p => !p.horario).length;

    const motoristasAtivos = motoristas.filter(m => m.ativo).length;
    const motoristasTotal = motoristas.length;

    // Tempo médio de entrega (check-in → check-out)
    const temposEntrega: number[] = [];
    paradas.forEach(p => {
      if (p.checkinTime && p.checkoutTime) {
        const [hIn, mIn] = p.checkinTime.split(':').map(Number);
        const [hOut, mOut] = p.checkoutTime.split(':').map(Number);
        const diffMin = (hOut * 60 + mOut) - (hIn * 60 + mIn);
        if (diffMin > 0) temposEntrega.push(diffMin);
      }
    });
    const tempoMedio = temposEntrega.length > 0
      ? Math.round(temposEntrega.reduce((a, b) => a + b, 0) / temposEntrega.length)
      : 0;

    return {
      total, entregues, emEntrega, pendentes, taxaSucesso,
      totalProdutos, produtosEntregues,
      pontoFixo, delivery,
      comHorario, semHorario,
      motoristasAtivos, motoristasTotal,
      tempoMedio,
    };
  }, [paradas, motoristas]);

  const statusChartData = useMemo(() => [
    { name: 'Entregues', value: stats.entregues, color: COLORS.success },
    { name: 'Em entrega', value: stats.emEntrega, color: COLORS.warning },
    { name: 'Pendentes', value: stats.pendentes, color: COLORS.muted },
  ].filter(d => d.value > 0), [stats]);

  const tipoChartData = useMemo(() => [
    { name: 'Ponto fixo', value: stats.pontoFixo, color: COLORS.primary },
    { name: 'Delivery', value: stats.delivery, color: COLORS.blue },
  ].filter(d => d.value > 0), [stats]);

  const paradaBarData = useMemo(() => {
    return paradas.map((p, i) => ({
      name: p.nome.length > 12 ? p.nome.slice(0, 12) + '…' : p.nome,
      produtos: p.produtos.length,
      status: p.status,
    }));
  }, [paradas]);

  const motoristasData = useMemo(() => {
    return motoristas.map(m => ({
      nome: m.nome.split(' ')[0],
      status: m.ativo ? 'Em rota' : 'Disponível',
      ativo: m.ativo,
    }));
  }, [motoristas]);

  // Timeline data
  const timeline = useMemo(() => {
    const events: { hora: string; texto: string; tipo: 'checkin' | 'checkout' | 'motorista' }[] = [];
    paradas.forEach(p => {
      if (p.checkinTime) events.push({ hora: p.checkinTime, texto: `Check-in: ${p.nome}`, tipo: 'checkin' });
      if (p.checkoutTime) events.push({ hora: p.checkoutTime, texto: `Entregue: ${p.nome}`, tipo: 'checkout' });
    });
    motoristas.forEach(m => {
      if (m.checkinTime) events.push({ hora: m.checkinTime, texto: `${m.nome} iniciou rota`, tipo: 'motorista' });
      if (m.checkoutTime) events.push({ hora: m.checkoutTime, texto: `${m.nome} encerrou rota`, tipo: 'motorista' });
    });
    return events.sort((a, b) => a.hora.localeCompare(b.hora));
  }, [paradas, motoristas]);

  return (
    <div className="space-y-2 fade-in pb-4">
      {/* KPI Grid */}
      <SectionTitle icon={TrendingUp} title="Resumo do Dia" />
      <div className="grid grid-cols-2 gap-3">
        <KPICard icon={MapPin} label="Total de Paradas" value={stats.total} color="text-primary" />
        <KPICard icon={CheckCircle2} label="Entregues" value={stats.entregues} subtitle={`${stats.taxaSucesso}% concluído`} color="text-success" />
        <KPICard icon={Clock} label="Em Entrega" value={stats.emEntrega} color="text-warning" />
        <KPICard icon={AlertTriangle} label="Pendentes" value={stats.pendentes} color="text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KPICard icon={Package} label="Produtos" value={`${stats.produtosEntregues}/${stats.totalProdutos}`} subtitle="entregues / total" color="text-foreground" />
        <KPICard icon={Timer} label="Tempo Médio" value={stats.tempoMedio > 0 ? `${stats.tempoMedio} min` : '—'} subtitle="por entrega" color="text-primary" />
        <KPICard icon={Users} label="Motoristas Ativos" value={`${stats.motoristasAtivos}/${stats.motoristasTotal}`} color="text-foreground" />
        <KPICard icon={Truck} label="Em Rota" value={stats.motoristasAtivos} color="text-success" />
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Progresso de Entregas</p>
            <span className="text-sm font-bold text-primary">{stats.taxaSucesso}%</span>
          </div>
          <Progress value={stats.taxaSucesso} className="h-3" />
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{stats.entregues} entregues</span>
            <span>{stats.emEntrega} em andamento</span>
            <span>{stats.pendentes} pendentes</span>
          </div>
        </CardContent>
      </Card>

      {/* Status Pie Chart */}
      <SectionTitle icon={BarChart3} title="Distribuição por Status" />
      {statusChartData.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} paradas`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sem dados para exibir</CardContent></Card>
      )}

      {/* Type Distribution */}
      <SectionTitle icon={Package} title="Tipo de Entrega" />
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center justify-center">
            {tipoChartData.map(t => (
              <div key={t.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm text-foreground font-medium">{t.name}</span>
                <Badge variant="secondary" className="text-xs">{t.value}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {tipoChartData.map(t => (
              <div
                key={t.name}
                className="h-6 rounded-full transition-all"
                style={{
                  backgroundColor: t.color,
                  width: `${stats.total > 0 ? (t.value / stats.total) * 100 : 50}%`,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products per Stop Bar Chart */}
      {paradaBarData.length > 0 && (
        <>
          <SectionTitle icon={Package} title="Produtos por Parada" />
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={paradaBarData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 15%, 90%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [`${value} produtos`, 'Qtd']} />
                  <Bar dataKey="produtos" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Horário Distribution */}
      <SectionTitle icon={Clock} title="Agendamento" />
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-primary">{stats.comHorario}</p>
              <p className="text-[10px] text-muted-foreground">Com horário definido</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
              <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold text-muted-foreground">{stats.semHorario}</p>
              <p className="text-[10px] text-muted-foreground">Sem horário (flexível)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motoristas Status */}
      <SectionTitle icon={Users} title="Status dos Motoristas" />
      <Card>
        <CardContent className="p-4 space-y-3">
          {motoristas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">Nenhum motorista cadastrado</p>
          ) : (
            motoristas.map(m => {
              const initials = m.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{m.placa}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${m.ativo ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                    <span className="text-xs text-muted-foreground">{m.ativo ? 'Em rota' : 'Disponível'}</span>
                  </div>
                  {m.checkinTime && (
                    <Badge variant="secondary" className="text-[10px]">{m.checkinTime}</Badge>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <SectionTitle icon={Clock} title="Linha do Tempo" />
      <Card>
        <CardContent className="p-4">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado ainda hoje.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((ev, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full shrink-0 mt-0.5 ${
                      ev.tipo === 'checkout' ? 'bg-success' : ev.tipo === 'checkin' ? 'bg-warning' : 'bg-blue-500'
                    }`} />
                    {i < timeline.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{ev.texto}</p>
                    <p className="text-[10px] text-muted-foreground">{ev.hora}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Stop List */}
      <SectionTitle icon={MapPin} title="Detalhamento das Paradas" />
      <div className="space-y-2">
        {paradas.map((p, i) => (
          <Card key={p.id} className="fade-in">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-primary">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.endereco}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {p.checkinTime && <Badge variant="secondary" className="text-[10px]">In: {p.checkinTime}</Badge>}
                  {p.checkoutTime && <Badge variant="secondary" className="text-[10px]">Out: {p.checkoutTime}</Badge>}
                  <Badge className={
                    p.status === 'entregue' ? 'bg-success text-success-foreground' :
                    p.status === 'em_entrega' ? 'bg-warning text-warning-foreground' :
                    'bg-muted text-muted-foreground'
                  }>
                    {p.status === 'entregue' ? 'Entregue' : p.status === 'em_entrega' ? 'Em entrega' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
