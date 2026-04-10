import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Parada, Motorista, Produto, ConfigRota } from '@/types/rotafacil';
import { nearestNeighborOrder, totalDistance, haversine } from '@/utils/routeOptimization';

interface OptimizationResult {
  distanceBefore: number;
  distanceAfter: number;
  savings: number;
}

interface CapacityWarning {
  motoristaId: string;
  pesoUsado: number;
  volumeUsado: number;
  pesoMax: number;
  volumeMax: number;
  excedePeso: boolean;
  excedeVolume: boolean;
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

  addParada: (p: Omit<Parada, 'id' | 'status' | 'produtos'> & { produtos: Omit<Produto, 'id' | 'entregue'>[] }) => void;
  updateParada: (id: string, data: Partial<Parada>) => void;
  removeParada: (id: string) => void;
  reorderParadas: (fromIndex: number, toIndex: number) => void;
  importParadas: (list: Omit<Parada, 'id' | 'status' | 'produtos'>[]) => void;

  addMotorista: (m: Omit<Motorista, 'id' | 'ativo' | 'cor'>) => void;
  updateMotorista: (id: string, data: Partial<Motorista>) => void;
  removeMotorista: (id: string) => void;

  roteirizar: () => void;
  otimizarRota: () => void;
  resetarRota: () => void;
  setConfig: (c: Partial<ConfigRota>) => void;

  iniciarRota: () => void;
  pararRota: () => void;
  marcarEntregue: (id: string) => void;
  marcarFalha: (id: string) => void;
  reagendarParada: (id: string) => void;

  distribuirAutomaticamente: () => void;
  atribuirParada: (paradaId: string, motoristaId: string | undefined) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const LS_PARADAS = 'rotafacil_paradas';
const LS_MOTORISTAS = 'rotafacil_motoristas';
const LS_CONFIG = 'rotafacil_config';

const genId = () => crypto.randomUUID();

const DRIVER_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const defaultConfig: ConfigRota = { velocidadeMedia: 40 };

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function calcETAs(paradas: Parada[], velocidade: number): Parada[] {
  let cumulativeMin = 0;
  const result: Parada[] = [];
  for (let i = 0; i < paradas.length; i++) {
    if (i > 0 && paradas[i - 1].lat != null && paradas[i].lat != null) {
      const dist = haversine(paradas[i - 1].lat!, paradas[i - 1].lng!, paradas[i].lat!, paradas[i].lng!);
      cumulativeMin += (dist / velocidade) * 60;
    }
    result.push({ ...paradas[i], etaMinutos: Math.round(cumulativeMin) });
  }
  return result;
}

function getCapacityWarnings(paradas: Parada[], motoristas: Motorista[]): CapacityWarning[] {
  const warnings: CapacityWarning[] = [];
  motoristas.forEach(m => {
    const assigned = paradas.filter(p => p.motoristaId === m.id);
    const pesoUsado = assigned.reduce((s, p) => s + (p.peso || 0), 0);
    const volumeUsado = assigned.reduce((s, p) => s + (p.volume || 0), 0);
    const pesoMax = m.capacidadePeso || Infinity;
    const volumeMax = m.capacidadeVolume || Infinity;
    if (pesoUsado > pesoMax || volumeUsado > volumeMax) {
      warnings.push({ motoristaId: m.id, pesoUsado, volumeUsado, pesoMax, volumeMax, excedePeso: pesoUsado > pesoMax, excedeVolume: volumeUsado > volumeMax });
    }
  });
  return warnings;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [paradas, setParadas] = useState<Parada[]>(() => loadFromLS(LS_PARADAS, []));
  const [motoristas, setMotoristas] = useState<Motorista[]>(() => loadFromLS(LS_MOTORISTAS, []));
  const [config, setConfigState] = useState<ConfigRota>(() => loadFromLS(LS_CONFIG, defaultConfig));
  const [lastOptimization, setLastOptimization] = useState<OptimizationResult | null>(null);
  const [executionMode, setExecutionMode] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [historyActions, setHistoryActions] = useState<{ time: string; text: string }[]>([]);

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<Parada[][]>([]);
  const [redoStack, setRedoStack] = useState<Parada[][]>([]);

  const pushUndo = useCallback((prev: Parada[]) => {
    setUndoStack(s => [...s.slice(-19), prev]);
    setRedoStack([]);
  }, []);

  useEffect(() => { localStorage.setItem(LS_PARADAS, JSON.stringify(paradas)); }, [paradas]);
  useEffect(() => { localStorage.setItem(LS_MOTORISTAS, JSON.stringify(motoristas)); }, [motoristas]);
  useEffect(() => { localStorage.setItem(LS_CONFIG, JSON.stringify(config)); }, [config]);

  const capacityWarnings = getCapacityWarnings(paradas, motoristas);

  const addAction = useCallback((text: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistoryActions(prev => [...prev, { time, text }]);
  }, []);

  const addParada: AppContextType['addParada'] = (p) => {
    pushUndo(paradas);
    const newParada: Parada = {
      ...p,
      id: genId(),
      status: 'pendente',
      produtos: p.produtos.map(pr => ({ ...pr, id: genId(), entregue: false })),
    };
    setParadas(prev => calcETAs([...prev, newParada], config.velocidadeMedia));
    addAction(`Parada "${p.nome}" adicionada`);
  };

  const updateParada = (id: string, data: Partial<Parada>) => {
    pushUndo(paradas);
    setParadas(prev => calcETAs(prev.map(p => p.id === id ? { ...p, ...data } : p), config.velocidadeMedia));
  };

  const removeParada = (id: string) => {
    pushUndo(paradas);
    setParadas(prev => calcETAs(prev.filter(p => p.id !== id), config.velocidadeMedia));
    addAction('Parada removida');
  };

  const reorderParadas = (fromIndex: number, toIndex: number) => {
    pushUndo(paradas);
    setParadas(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return calcETAs(arr, config.velocidadeMedia);
    });
  };

  const importParadas: AppContextType['importParadas'] = (list) => {
    pushUndo(paradas);
    const newParadas = list.map(p => ({
      ...p,
      id: genId(),
      status: 'pendente' as const,
      produtos: [] as Produto[],
    }));
    setParadas(prev => calcETAs([...prev, ...newParadas], config.velocidadeMedia));
    addAction(`${list.length} paradas importadas`);
  };

  const addMotorista: AppContextType['addMotorista'] = (m) => {
    const cor = DRIVER_COLORS[motoristas.length % DRIVER_COLORS.length];
    setMotoristas(prev => [...prev, { ...m, id: genId(), ativo: false, cor }]);
    addAction(`Motorista "${m.nome}" cadastrado`);
  };

  const updateMotorista = (id: string, data: Partial<Motorista>) => {
    setMotoristas(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const removeMotorista = (id: string) => {
    setMotoristas(prev => prev.filter(m => m.id !== id));
    setParadas(prev => prev.map(p => p.motoristaId === id ? { ...p, motoristaId: undefined } : p));
    addAction('Motorista removido');
  };

  const roteirizar = () => {
    pushUndo(paradas);
    setParadas(prev => {
      const comHorario = prev.filter(p => p.horario).sort((a, b) => (a.horario! > b.horario! ? 1 : -1));
      const semHorario = prev.filter(p => !p.horario);
      return calcETAs([...comHorario, ...semHorario], config.velocidadeMedia);
    });
  };

  const otimizarRota = () => {
    pushUndo(paradas);
    setParadas(prev => {
      const withCoords = prev.filter(p => p.lat != null && p.lng != null);
      const withoutCoords = prev.filter(p => p.lat == null || p.lng == null);
      if (withCoords.length < 2) return prev;
      const coords = withCoords.map(p => ({ lat: p.lat!, lng: p.lng! }));
      const distBefore = totalDistance(coords);
      const order = nearestNeighborOrder(coords);
      const optimized = order.map(i => withCoords[i]);
      const distAfter = totalDistance(order.map(i => coords[i]));
      setLastOptimization({ distanceBefore: distBefore, distanceAfter: distAfter, savings: distBefore - distAfter });
      addAction(`Rota otimizada: economia de ${(distBefore - distAfter).toFixed(1)} km`);
      return calcETAs([...optimized, ...withoutCoords], config.velocidadeMedia);
    });
  };

  const resetarRota = () => {
    pushUndo(paradas);
    setParadas([]);
    setMotoristas([]);
    setLastOptimization(null);
    setExecutionMode(false);
    setHistoryActions([]);
    localStorage.removeItem(LS_PARADAS);
    localStorage.removeItem(LS_MOTORISTAS);
  };

  const setConfig = (c: Partial<ConfigRota>) => {
    setConfigState(prev => {
      const next = { ...prev, ...c };
      setParradas_recalc(next.velocidadeMedia);
      return next;
    });
  };

  // Workaround: recalc ETAs when speed changes
  const setParradas_recalc = (vel: number) => {
    setParadas(prev => calcETAs(prev, vel));
  };

  // Execution mode
  const iniciarRota = () => {
    setExecutionMode(true);
    const firstPending = paradas.findIndex(p => p.status === 'pendente');
    setCurrentStopIndex(firstPending >= 0 ? firstPending : 0);
    addAction('Rota iniciada');
  };

  const pararRota = () => {
    setExecutionMode(false);
    addAction('Rota pausada');
  };

  const marcarEntregue = (id: string) => {
    pushUndo(paradas);
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setParadas(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, status: 'entregue' as const, checkoutTime: now, produtos: p.produtos.map(pr => ({ ...pr, entregue: true })) } : p
      );
      const nextPending = updated.findIndex(p => p.status === 'pendente' || p.status === 'em_entrega');
      if (nextPending >= 0) setCurrentStopIndex(nextPending);
      return updated;
    });
    const nome = paradas.find(p => p.id === id)?.nome || '';
    addAction(`Entregue: ${nome}`);
  };

  const marcarFalha = (id: string) => {
    pushUndo(paradas);
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setParadas(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: 'falhou' as const, checkoutTime: now } : p);
      const nextPending = updated.findIndex(p => p.status === 'pendente' || p.status === 'em_entrega');
      if (nextPending >= 0) setCurrentStopIndex(nextPending);
      return updated;
    });
    const nome = paradas.find(p => p.id === id)?.nome || '';
    addAction(`Falha: ${nome}`);
  };

  const reagendarParada = (id: string) => {
    pushUndo(paradas);
    setParadas(prev => prev.map(p => p.id === id ? { ...p, status: 'pendente' as const, checkinTime: undefined, checkoutTime: undefined } : p));
    const nome = paradas.find(p => p.id === id)?.nome || '';
    addAction(`Reagendada: ${nome}`);
  };

  const distribuirAutomaticamente = () => {
    pushUndo(paradas);
    const available = motoristas.filter(m => m.ativo || motoristas.length > 0);
    if (available.length === 0) return;
    const unassigned = paradas.filter(p => !p.motoristaId && p.status === 'pendente');
    const updated = [...paradas];
    unassigned.forEach((p, i) => {
      const m = available[i % available.length];
      const idx = updated.findIndex(x => x.id === p.id);
      if (idx >= 0) updated[idx] = { ...updated[idx], motoristaId: m.id };
    });
    setParadas(calcETAs(updated, config.velocidadeMedia));
    addAction(`Paradas distribuídas entre ${available.length} motoristas`);
  };

  const atribuirParada = (paradaId: string, motoristaId: string | undefined) => {
    pushUndo(paradas);
    setParadas(prev => prev.map(p => p.id === paradaId ? { ...p, motoristaId } : p));
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => [...s, paradas]);
    setParadas(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
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
      roteirizar, otimizarRota, resetarRota, setConfig,
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
