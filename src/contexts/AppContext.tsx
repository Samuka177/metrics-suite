import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Parada, Motorista, Produto, ConfigRota } from '@/types/rotafacil';
import { nearestNeighborOrder, totalDistance, haversine } from '@/utils/routeOptimization';
import { geocodeAddress } from '@/utils/geocode';
import { logAction } from '@/utils/audit';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OptimizationResult { distanceBefore: number; distanceAfter: number; savings: number; }
interface CapacityWarning {
  motoristaId: string; pesoUsado: number; volumeUsado: number;
  pesoMax: number; volumeMax: number; excedePeso: boolean; excedeVolume: boolean;
}

interface AppContextType {
  paradas: Parada[];
  motoristas: Motorista[];
  config: ConfigRota;
  lastOptimization: OptimizationResult | null;
  executionMode: boolean;
  currentStopIndex: number;
  capacityWarnings: CapacityWarning[];
  historyActions: { time: string; text: string }[];

  addParada: (p: Omit<Parada, 'id' | 'status' | 'produtos'> & { produtos: Omit<Produto, 'id' | 'entregue'>[] }) => Promise<void>;
  updateParada: (id: string, data: Partial<Parada>) => Promise<void>;
  removeParada: (id: string) => Promise<void>;
  reorderParadas: (fromIndex: number, toIndex: number) => void;
  importParadas: (list: Omit<Parada, 'id' | 'status' | 'produtos'>[]) => Promise<void>;

  addMotorista: (m: Omit<Motorista, 'id' | 'ativo' | 'cor'>) => Promise<void>;
  updateMotorista: (id: string, data: Partial<Motorista>) => Promise<void>;
  removeMotorista: (id: string) => Promise<void>;

  roteirizar: () => void;
  otimizarRota: () => void;
  resetarRota: () => Promise<void>;
  carregarDemo: () => Promise<void>;
  setConfig: (c: Partial<ConfigRota>) => void;

  iniciarRota: () => void;
  pararRota: () => void;
  marcarEntregue: (id: string) => Promise<void>;
  marcarFalha: (id: string) => Promise<void>;
  reagendarParada: (id: string) => Promise<void>;

  distribuirAutomaticamente: () => Promise<void>;
  atribuirParada: (paradaId: string, motoristaId: string | undefined) => Promise<void>;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const DRIVER_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
const defaultConfig: ConfigRota = { velocidadeMedia: 40 };

function rowToParada(r: any): Parada {
  return {
    id: r.id, nome: r.nome, endereco: r.endereco || '',
    tipo: (r.tipo || 'Delivery') as any, status: r.status,
    horario: r.horario || undefined, horarioMin: r.horario_min || undefined, horarioMax: r.horario_max || undefined,
    lat: r.lat ?? undefined, lng: r.lng ?? undefined,
    peso: r.peso ?? undefined, volume: r.volume ?? undefined,
    motoristaId: r.motorista_id ?? undefined,
    etaMinutos: r.eta_minutos ?? undefined,
    checkinTime: r.checkin_time ?? undefined, checkoutTime: r.checkout_time ?? undefined,
    observacoes: r.observacoes ?? undefined, telefone: r.telefone ?? undefined,
    produtos: (r.produtos || []) as Produto[],
  };
}

function rowToMotorista(r: any): Motorista {
  return {
    id: r.id, nome: r.nome, placa: r.placa || '', ativo: r.ativo,
    capacidadePeso: r.capacidade_peso ?? undefined, capacidadeVolume: r.capacidade_volume ?? undefined,
    cor: r.cor || DRIVER_COLORS[0],
    checkinTime: r.checkin_time ?? undefined, checkoutTime: r.checkout_time ?? undefined,
    telefone: r.telefone ?? undefined, email: r.email ?? undefined,
  };
}

function calcETAs(paradas: Parada[], velocidade: number): Parada[] {
  let cum = 0; const r: Parada[] = [];
  for (let i = 0; i < paradas.length; i++) {
    if (i > 0 && paradas[i - 1].lat != null && paradas[i].lat != null) {
      const d = haversine(paradas[i - 1].lat!, paradas[i - 1].lng!, paradas[i].lat!, paradas[i].lng!);
      cum += (d / velocidade) * 60;
    }
    r.push({ ...paradas[i], etaMinutos: Math.round(cum) });
  }
  return r;
}

function getCapacityWarnings(paradas: Parada[], motoristas: Motorista[]): CapacityWarning[] {
  const w: CapacityWarning[] = [];
  motoristas.forEach(m => {
    const a = paradas.filter(p => p.motoristaId === m.id);
    const pesoUsado = a.reduce((s, p) => s + (p.peso || 0), 0);
    const volumeUsado = a.reduce((s, p) => s + (p.volume || 0), 0);
    const pesoMax = m.capacidadePeso || Infinity;
    const volumeMax = m.capacidadeVolume || Infinity;
    if (pesoUsado > pesoMax || volumeUsado > volumeMax) {
      w.push({ motoristaId: m.id, pesoUsado, volumeUsado, pesoMax, volumeMax,
        excedePeso: pesoUsado > pesoMax, excedeVolume: volumeUsado > volumeMax });
    }
  });
  return w;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile, company } = useAuth();
  const companyId = profile?.company_id;

  const [paradas, setParadas] = useState<Parada[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [config, setConfigState] = useState<ConfigRota>(defaultConfig);
  const [lastOptimization, setLastOptimization] = useState<OptimizationResult | null>(null);
  const [executionMode, setExecutionMode] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [historyActions, setHistoryActions] = useState<{ time: string; text: string }[]>([]);
  const [undoStack, setUndoStack] = useState<Parada[][]>([]);
  const [redoStack, setRedoStack] = useState<Parada[][]>([]);

  const pushUndo = useCallback((prev: Parada[]) => {
    setUndoStack(s => [...s.slice(-19), prev]); setRedoStack([]);
  }, []);

  const addAction = useCallback((text: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistoryActions(prev => [...prev, { time, text }]);
  }, []);

  // Load initial data when company changes
  useEffect(() => {
    if (!companyId) { setParadas([]); setMotoristas([]); return; }
    (async () => {
      const [{ data: pData }, { data: mData }] = await Promise.all([
        supabase.from('paradas').select('*').eq('company_id', companyId).order('ordem', { ascending: true, nullsFirst: false }).order('created_at'),
        supabase.from('motoristas').select('*').eq('company_id', companyId).order('created_at'),
      ]);
      setParadas(calcETAs((pData || []).map(rowToParada), config.velocidadeMedia));
      setMotoristas((mData || []).map(rowToMotorista));
    })();
  }, [companyId]);

  const capacityWarnings = getCapacityWarnings(paradas, motoristas);

  const addParada: AppContextType['addParada'] = async (p) => {
    if (!companyId) return;
    pushUndo(paradas);
    const produtos = p.produtos.map(pr => ({ ...pr, id: crypto.randomUUID(), entregue: false }));
    const { data, error } = await supabase.from('paradas').insert({
      company_id: companyId, nome: p.nome, endereco: p.endereco, tipo: p.tipo,
      lat: p.lat, lng: p.lng, peso: p.peso, volume: p.volume,
      horario: p.horario, horario_min: p.horarioMin, horario_max: p.horarioMax,
      observacoes: p.observacoes, telefone: p.telefone,
      produtos, status: 'pendente',
    }).select().single();
    if (error || !data) return;
    const novo = rowToParada(data);
    setParadas(prev => calcETAs([...prev, novo], config.velocidadeMedia));
    addAction(`Parada "${p.nome}" adicionada`);

    if (novo.lat == null && novo.endereco) {
      const coords = await geocodeAddress(novo.endereco);
      if (coords) {
        await supabase.from('paradas').update({ lat: coords.lat, lng: coords.lng }).eq('id', novo.id);
        setParadas(prev => calcETAs(prev.map(x => x.id === novo.id ? { ...x, ...coords } : x), config.velocidadeMedia));
      }
    }
  };

  const updateParada: AppContextType['updateParada'] = async (id, data) => {
    pushUndo(paradas);
    const dbData: any = {};
    if (data.nome !== undefined) dbData.nome = data.nome;
    if (data.endereco !== undefined) dbData.endereco = data.endereco;
    if (data.tipo !== undefined) dbData.tipo = data.tipo;
    if (data.lat !== undefined) dbData.lat = data.lat;
    if (data.lng !== undefined) dbData.lng = data.lng;
    if (data.peso !== undefined) dbData.peso = data.peso;
    if (data.volume !== undefined) dbData.volume = data.volume;
    if (data.horario !== undefined) dbData.horario = data.horario;
    if (data.observacoes !== undefined) dbData.observacoes = data.observacoes;
    if (data.telefone !== undefined) dbData.telefone = data.telefone;
    if (data.motoristaId !== undefined) dbData.motorista_id = data.motoristaId;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.produtos !== undefined) dbData.produtos = data.produtos;
    await supabase.from('paradas').update(dbData).eq('id', id);
    setParadas(prev => calcETAs(prev.map(p => p.id === id ? { ...p, ...data } : p), config.velocidadeMedia));
  };

  const removeParada: AppContextType['removeParada'] = async (id) => {
    pushUndo(paradas);
    await supabase.from('paradas').delete().eq('id', id);
    setParadas(prev => calcETAs(prev.filter(p => p.id !== id), config.velocidadeMedia));
    addAction('Parada removida');
  };

  const reorderParadas = (fromIndex: number, toIndex: number) => {
    pushUndo(paradas);
    setParadas(prev => {
      const arr = [...prev];
      const [m] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, m);
      return calcETAs(arr, config.velocidadeMedia);
    });
  };

  const importParadas: AppContextType['importParadas'] = async (list) => {
    if (!companyId) return;
    pushUndo(paradas);
    const rows = list.map(p => ({
      company_id: companyId, nome: p.nome, endereco: p.endereco, tipo: p.tipo,
      lat: p.lat, lng: p.lng, peso: p.peso, volume: p.volume, horario: p.horario,
      observacoes: p.observacoes, telefone: p.telefone, status: 'pendente', produtos: [],
    }));
    const { data } = await supabase.from('paradas').insert(rows).select();
    const novos = (data || []).map(rowToParada);
    setParadas(prev => calcETAs([...prev, ...novos], config.velocidadeMedia));
    addAction(`${list.length} paradas importadas`);

    for (const p of novos) {
      if (p.lat == null && p.endereco) {
        const coords = await geocodeAddress(p.endereco);
        if (coords) {
          await supabase.from('paradas').update({ lat: coords.lat, lng: coords.lng }).eq('id', p.id);
          setParadas(prev => calcETAs(prev.map(x => x.id === p.id ? { ...x, ...coords } : x), config.velocidadeMedia));
        }
        await new Promise(r => setTimeout(r, 1100));
      }
    }
  };

  const addMotorista: AppContextType['addMotorista'] = async (m) => {
    if (!companyId) return;
    const cor = DRIVER_COLORS[motoristas.length % DRIVER_COLORS.length];
    const { data } = await supabase.from('motoristas').insert({
      company_id: companyId, nome: m.nome, placa: m.placa,
      capacidade_peso: m.capacidadePeso, capacidade_volume: m.capacidadeVolume,
      telefone: m.telefone, email: m.email,
      cor, ativo: false,
    }).select().single();
    if (data) setMotoristas(prev => [...prev, rowToMotorista(data)]);
    addAction(`Motorista "${m.nome}" cadastrado`);
  };

  const updateMotorista: AppContextType['updateMotorista'] = async (id, data) => {
    const dbData: any = {};
    if (data.nome !== undefined) dbData.nome = data.nome;
    if (data.placa !== undefined) dbData.placa = data.placa;
    if (data.ativo !== undefined) dbData.ativo = data.ativo;
    if (data.capacidadePeso !== undefined) dbData.capacidade_peso = data.capacidadePeso;
    if (data.capacidadeVolume !== undefined) dbData.capacidade_volume = data.capacidadeVolume;
    if (data.checkinTime !== undefined) dbData.checkin_time = data.checkinTime;
    if (data.checkoutTime !== undefined) dbData.checkout_time = data.checkoutTime;
    if (data.telefone !== undefined) dbData.telefone = data.telefone;
    if (data.email !== undefined) dbData.email = data.email;
    await supabase.from('motoristas').update(dbData).eq('id', id);
    setMotoristas(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const removeMotorista: AppContextType['removeMotorista'] = async (id) => {
    await supabase.from('motoristas').delete().eq('id', id);
    setMotoristas(prev => prev.filter(m => m.id !== id));
    setParadas(prev => prev.map(p => p.motoristaId === id ? { ...p, motoristaId: undefined } : p));
    addAction('Motorista removido');
  };

  const roteirizar = () => {
    pushUndo(paradas);
    setParadas(prev => {
      const com = prev.filter(p => p.horario).sort((a, b) => (a.horario! > b.horario! ? 1 : -1));
      const sem = prev.filter(p => !p.horario);
      return calcETAs([...com, ...sem], config.velocidadeMedia);
    });
  };

  const otimizarRota = () => {
    pushUndo(paradas);
    setParadas(prev => {
      const wc = prev.filter(p => p.lat != null && p.lng != null);
      const woc = prev.filter(p => p.lat == null || p.lng == null);
      if (wc.length < 2) return prev;
      const coords = wc.map(p => ({ lat: p.lat!, lng: p.lng! }));
      const distBefore = totalDistance(coords);
      const order = nearestNeighborOrder(coords);
      const optimized = order.map(i => wc[i]);
      const distAfter = totalDistance(order.map(i => coords[i]));
      setLastOptimization({ distanceBefore: distBefore, distanceAfter: distAfter, savings: distBefore - distAfter });
      addAction(`Rota otimizada: economia de ${(distBefore - distAfter).toFixed(1)} km`);
      return calcETAs([...optimized, ...woc], config.velocidadeMedia);
    });
  };

  const resetarRota = async () => {
    if (!companyId) return;
    pushUndo(paradas);
    await Promise.all([
      supabase.from('paradas').delete().eq('company_id', companyId),
      supabase.from('motoristas').delete().eq('company_id', companyId),
      supabase.from('fiscal_notes').delete().eq('company_id', companyId),
    ]);
    setParadas([]); setMotoristas([]); setLastOptimization(null);
    setExecutionMode(false); setHistoryActions([]);
    await logAction(companyId, 'resetar_dados');
  };

  const carregarDemo = async () => {
    if (!companyId) return;
    await resetarRota();
    const demoMotoristas = [
      { nome: 'João Silva', placa: 'ABC-1234', capacidade_peso: 800, capacidade_volume: 5 },
      { nome: 'Maria Santos', placa: 'DEF-5678', capacidade_peso: 1200, capacidade_volume: 8 },
      { nome: 'Pedro Lima', placa: 'GHI-9012', capacidade_peso: 600, capacidade_volume: 4 },
    ];
    const { data: mData } = await supabase.from('motoristas').insert(
      demoMotoristas.map((m, i) => ({
        company_id: companyId, ...m, cor: DRIVER_COLORS[i], ativo: true,
      })),
    ).select();
    setMotoristas((mData || []).map(rowToMotorista));

    const demoParadas = [
      { nome: 'Padaria Central', endereco: 'Av. Paulista, 1000, São Paulo, SP', lat: -23.5614, lng: -46.6559, peso: 50, volume: 0.3 },
      { nome: 'Mercado Vila', endereco: 'R. Augusta, 500, São Paulo, SP', lat: -23.5530, lng: -46.6555, peso: 120, volume: 0.8 },
      { nome: 'Restaurante Sul', endereco: 'Av. Brigadeiro Faria Lima, 2000, São Paulo, SP', lat: -23.5765, lng: -46.6890, peso: 80, volume: 0.5 },
      { nome: 'Bar do Zé', endereco: 'R. dos Pinheiros, 300, São Paulo, SP', lat: -23.5651, lng: -46.6900, peso: 200, volume: 1.2 },
      { nome: 'Lanchonete Express', endereco: 'Av. Rebouças, 1500, São Paulo, SP', lat: -23.5670, lng: -46.6770, peso: 60, volume: 0.4 },
      { nome: 'Empório Gourmet', endereco: 'R. Oscar Freire, 800, São Paulo, SP', lat: -23.5621, lng: -46.6700, peso: 90, volume: 0.6 },
    ];
    const { data: pData } = await supabase.from('paradas').insert(
      demoParadas.map(p => ({ company_id: companyId, ...p, tipo: 'Delivery', status: 'pendente', produtos: [] })),
    ).select();
    setParadas(calcETAs((pData || []).map(rowToParada), config.velocidadeMedia));
    await logAction(companyId, 'carregar_demo', undefined, { paradas: demoParadas.length, motoristas: demoMotoristas.length });
  };


  const setConfig = (c: Partial<ConfigRota>) => {
    setConfigState(prev => {
      const next = { ...prev, ...c };
      setParadas(p => calcETAs(p, next.velocidadeMedia));
      return next;
    });
  };

  const iniciarRota = () => {
    setExecutionMode(true);
    const i = paradas.findIndex(p => p.status === 'pendente');
    setCurrentStopIndex(i >= 0 ? i : 0);
    addAction('Rota iniciada');
  };
  const pararRota = () => { setExecutionMode(false); addAction('Rota pausada'); };

  const marcarEntregue = async (id: string) => {
    pushUndo(paradas);
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const parada = paradas.find(p => p.id === id);
    const produtos = parada?.produtos.map(pr => ({ ...pr, entregue: true })) || [];
    await supabase.from('paradas').update({ status: 'entregue', checkout_time: now, produtos }).eq('id', id);
    setParadas(prev => {
      const u = prev.map(p => p.id === id ? { ...p, status: 'entregue' as const, checkoutTime: now, produtos } : p);
      const n = u.findIndex(p => p.status === 'pendente' || p.status === 'em_entrega');
      if (n >= 0) setCurrentStopIndex(n);
      return u;
    });
    addAction(`Entregue: ${parada?.nome || ''}`);
  };

  const marcarFalha = async (id: string) => {
    pushUndo(paradas);
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    await supabase.from('paradas').update({ status: 'falhou', checkout_time: now }).eq('id', id);
    setParadas(prev => {
      const u = prev.map(p => p.id === id ? { ...p, status: 'falhou' as const, checkoutTime: now } : p);
      const n = u.findIndex(p => p.status === 'pendente' || p.status === 'em_entrega');
      if (n >= 0) setCurrentStopIndex(n);
      return u;
    });
    addAction(`Falha: ${paradas.find(p => p.id === id)?.nome || ''}`);
  };

  const reagendarParada = async (id: string) => {
    pushUndo(paradas);
    await supabase.from('paradas').update({ status: 'pendente', checkin_time: null, checkout_time: null }).eq('id', id);
    setParadas(prev => prev.map(p => p.id === id ? { ...p, status: 'pendente' as const, checkinTime: undefined, checkoutTime: undefined } : p));
    addAction(`Reagendada: ${paradas.find(p => p.id === id)?.nome || ''}`);
  };

  const distribuirAutomaticamente = async () => {
    pushUndo(paradas);
    const av = motoristas.filter(m => m.ativo || motoristas.length > 0);
    if (av.length === 0) return;
    const un = paradas.filter(p => !p.motoristaId && p.status === 'pendente');
    const updates = un.map((p, i) => ({ id: p.id, motoristaId: av[i % av.length].id }));
    await Promise.all(updates.map(u => supabase.from('paradas').update({ motorista_id: u.motoristaId }).eq('id', u.id)));
    setParadas(prev => {
      const u = [...prev];
      updates.forEach(up => {
        const idx = u.findIndex(x => x.id === up.id);
        if (idx >= 0) u[idx] = { ...u[idx], motoristaId: up.motoristaId };
      });
      return calcETAs(u, config.velocidadeMedia);
    });
    addAction(`Paradas distribuídas entre ${av.length} motoristas`);
  };

  const atribuirParada = async (paradaId: string, motoristaId: string | undefined) => {
    pushUndo(paradas);
    await supabase.from('paradas').update({ motorista_id: motoristaId || null }).eq('id', paradaId);
    setParadas(prev => prev.map(p => p.id === paradaId ? { ...p, motoristaId } : p));
  };

  const undo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => [...s, paradas]);
    setParadas(prev);
  };
  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    setUndoStack(s => [...s, paradas]);
    setParadas(next);
  };

  return (
    <AppContext.Provider value={{
      paradas, motoristas, config, lastOptimization, executionMode, currentStopIndex, capacityWarnings, historyActions,
      addParada, updateParada, removeParada, reorderParadas, importParadas,
      addMotorista, updateMotorista, removeMotorista,
      roteirizar, otimizarRota, resetarRota, carregarDemo, setConfig,
      iniciarRota, pararRota, marcarEntregue, marcarFalha, reagendarParada,
      distribuirAutomaticamente, atribuirParada,
      undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
