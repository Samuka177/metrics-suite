import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  BarChart3, TrendingUp, Package, Truck, Users, Clock,
  CheckCircle2, AlertTriangle, Timer, MapPin, Download, FileSpreadsheet, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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

type Periodo = 'hoje' | 'semana' | 'mes' | 'todos';

function isToday(dateStr?: string): boolean {
  return true; // All current data is "today" since it's in-memory
}

export default function RelatoriosTab() {
  const { paradas, motoristas } = useApp();
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const [motoristaFiltro, setMotoristaFiltro] = useState<string>('todos');

  // Filter paradas — currently all data is "today" since localStorage
  const paradasFiltradas = useMemo(() => {
    let filtered = paradas;
    // Motorista filter would apply if paradas had motorista assignment
    // For now just return all paradas since data is session-based
    return filtered;
  }, [paradas, periodo, motoristaFiltro]);

  const stats = useMemo(() => {
    const p = paradasFiltradas;
    const total = p.length;
    const entregues = p.filter(x => x.status === 'entregue').length;
    const emEntrega = p.filter(x => x.status === 'em_entrega').length;
    const pendentes = p.filter(x => x.status === 'pendente').length;
    const taxaSucesso = total > 0 ? Math.round((entregues / total) * 100) : 0;

    const totalProdutos = p.reduce((s, x) => s + x.produtos.length, 0);
    const produtosEntregues = p.filter(x => x.status === 'entregue').reduce((s, x) => s + x.produtos.length, 0);

    const pontoFixo = p.filter(x => x.tipo === 'Ponto fixo').length;
    const delivery = p.filter(x => x.tipo === 'Delivery').length;
    const comHorario = p.filter(x => x.horario).length;
    const semHorario = p.filter(x => !x.horario).length;

    const motoristasAtivos = motoristas.filter(m => m.ativo).length;
    const motoristasTotal = motoristas.length;

    const temposEntrega: number[] = [];
    p.forEach(x => {
      if (x.checkinTime && x.checkoutTime) {
        const [hIn, mIn] = x.checkinTime.split(':').map(Number);
        const [hOut, mOut] = x.checkoutTime.split(':').map(Number);
        const diffMin = (hOut * 60 + mOut) - (hIn * 60 + mIn);
        if (diffMin > 0) temposEntrega.push(diffMin);
      }
    });
    const tempoMedio = temposEntrega.length > 0
      ? Math.round(temposEntrega.reduce((a, b) => a + b, 0) / temposEntrega.length)
      : 0;

    return { total, entregues, emEntrega, pendentes, taxaSucesso, totalProdutos, produtosEntregues, pontoFixo, delivery, comHorario, semHorario, motoristasAtivos, motoristasTotal, tempoMedio };
  }, [paradasFiltradas, motoristas]);

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
    return paradasFiltradas.map((p) => ({
      name: p.nome.length > 12 ? p.nome.slice(0, 12) + '…' : p.nome,
      produtos: p.produtos.length,
    }));
  }, [paradasFiltradas]);

  const timeline = useMemo(() => {
    const events: { hora: string; texto: string; tipo: 'checkin' | 'checkout' | 'motorista' }[] = [];
    paradasFiltradas.forEach(p => {
      if (p.checkinTime) events.push({ hora: p.checkinTime, texto: `Check-in: ${p.nome}`, tipo: 'checkin' });
      if (p.checkoutTime) events.push({ hora: p.checkoutTime, texto: `Entregue: ${p.nome}`, tipo: 'checkout' });
    });
    motoristas.forEach(m => {
      if (m.checkinTime) events.push({ hora: m.checkinTime, texto: `${m.nome} iniciou rota`, tipo: 'motorista' });
      if (m.checkoutTime) events.push({ hora: m.checkoutTime, texto: `${m.nome} encerrou rota`, tipo: 'motorista' });
    });
    return events.sort((a, b) => a.hora.localeCompare(b.hora));
  }, [paradasFiltradas, motoristas]);

  const exportExcel = () => {
    const data = paradasFiltradas.map((p, i) => ({
      '#': i + 1,
      'Cliente': p.nome,
      'Endereço': p.endereco,
      'Tipo': p.tipo,
      'Horário': p.horario || '—',
      'Status': p.status === 'entregue' ? 'Entregue' : p.status === 'em_entrega' ? 'Em entrega' : 'Pendente',
      'Check-in': p.checkinTime || '—',
      'Check-out': p.checkoutTime || '—',
      'Produtos': p.produtos.map(pr => `${pr.nome} (${pr.quantidade} ${pr.unidade})`).join('; '),
    }));

    const motoristasData = motoristas.map(m => ({
      'Nome': m.nome,
      'Placa': m.placa,
      'Status': m.ativo ? 'Em rota' : 'Disponível',
      'Check-in': m.checkinTime || '—',
      'Check-out': m.checkoutTime || '—',
    }));

    const resumo = [
      { 'Métrica': 'Total de Paradas', 'Valor': stats.total },
      { 'Métrica': 'Entregues', 'Valor': stats.entregues },
      { 'Métrica': 'Em Entrega', 'Valor': stats.emEntrega },
      { 'Métrica': 'Pendentes', 'Valor': stats.pendentes },
      { 'Métrica': 'Taxa de Sucesso', 'Valor': `${stats.taxaSucesso}%` },
      { 'Métrica': 'Tempo Médio (min)', 'Valor': stats.tempoMedio || '—' },
      { 'Métrica': 'Motoristas Ativos', 'Valor': stats.motoristasAtivos },
      { 'Métrica': 'Total Produtos', 'Valor': stats.totalProdutos },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Paradas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motoristasData), 'Motoristas');

    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    XLSX.writeFile(wb, `relatorio_rotafacil_${hoje}.xlsx`);
    toast.success('Relatório Excel exportado!');
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const hoje = new Date().toLocaleDateString('pt-BR');

    doc.setFontSize(18);
    doc.text('Rota Fácil — Relatório do Dia', 14, 22);
    doc.setFontSize(10);
    doc.text(hoje, 14, 30);

    // KPIs
    doc.setFontSize(12);
    doc.text('Resumo', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Paradas', String(stats.total)],
        ['Entregues', String(stats.entregues)],
        ['Em Entrega', String(stats.emEntrega)],
        ['Pendentes', String(stats.pendentes)],
        ['Taxa de Sucesso', `${stats.taxaSucesso}%`],
        ['Tempo Médio', stats.tempoMedio > 0 ? `${stats.tempoMedio} min` : '—'],
        ['Motoristas Ativos', `${stats.motoristasAtivos}/${stats.motoristasTotal}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [186, 117, 23] },
    });

    // Paradas
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text('Paradas', 14, finalY + 10);
    autoTable(doc, {
      startY: finalY + 14,
      head: [['#', 'Cliente', 'Endereço', 'Tipo', 'Status', 'Check-in', 'Check-out']],
      body: paradasFiltradas.map((p, i) => [
        i + 1,
        p.nome,
        p.endereco.slice(0, 30),
        p.tipo,
        p.status === 'entregue' ? 'Entregue' : p.status === 'em_entrega' ? 'Em entrega' : 'Pendente',
        p.checkinTime || '—',
        p.checkoutTime || '—',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [186, 117, 23] },
      styles: { fontSize: 8 },
    });

    doc.save(`relatorio_rotafacil_${hoje.replace(/\//g, '-')}.pdf`);
    toast.success('Relatório PDF exportado!');
  };

  return (
    <div className="space-y-2 fade-in pb-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes">Este Mês</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={motoristaFiltro} onValueChange={setMotoristaFiltro}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos motoristas</SelectItem>
            {motoristas.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1 ml-auto">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportExcel}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportPDF}>
            <FileText className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
        </div>
      </div>

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
        {paradasFiltradas.map((p, i) => (
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
