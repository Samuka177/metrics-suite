import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Parada, Motorista, Produto } from '@/types/rotafacil';

interface AppContextType {
  paradas: Parada[];
  motoristas: Motorista[];
  addParada: (p: Omit<Parada, 'id' | 'status' | 'produtos'> & { produtos: Omit<Produto, 'id' | 'entregue'>[] }) => void;
  updateParada: (id: string, data: Partial<Parada>) => void;
  removeParada: (id: string) => void;
  addMotorista: (m: Omit<Motorista, 'id' | 'ativo'>) => void;
  updateMotorista: (id: string, data: Partial<Motorista>) => void;
  removeMotorista: (id: string) => void;
  roteirizar: () => void;
  resetarRota: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const LS_PARADAS = 'rotafacil_paradas';
const LS_MOTORISTAS = 'rotafacil_motoristas';

const genId = () => crypto.randomUUID();

const defaultParadas: Parada[] = [];

const defaultMotoristas: Motorista[] = [];

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [paradas, setParadas] = useState<Parada[]>(() => loadFromLS(LS_PARADAS, defaultParadas));
  const [motoristas, setMotoristas] = useState<Motorista[]>(() => loadFromLS(LS_MOTORISTAS, defaultMotoristas));

  useEffect(() => { localStorage.setItem(LS_PARADAS, JSON.stringify(paradas)); }, [paradas]);
  useEffect(() => { localStorage.setItem(LS_MOTORISTAS, JSON.stringify(motoristas)); }, [motoristas]);

  const addParada: AppContextType['addParada'] = (p) => {
    const newParada: Parada = {
      ...p,
      id: genId(),
      status: 'pendente',
      produtos: p.produtos.map(pr => ({ ...pr, id: genId(), entregue: false })),
    };
    setParadas(prev => [...prev, newParada]);
  };

  const updateParada = (id: string, data: Partial<Parada>) => {
    setParadas(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const removeParada = (id: string) => {
    setParadas(prev => prev.filter(p => p.id !== id));
  };

  const addMotorista: AppContextType['addMotorista'] = (m) => {
    setMotoristas(prev => [...prev, { ...m, id: genId(), ativo: false }]);
  };

  const updateMotorista = (id: string, data: Partial<Motorista>) => {
    setMotoristas(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const removeMotorista = (id: string) => {
    setMotoristas(prev => prev.filter(m => m.id !== id));
  };

  const roteirizar = () => {
    setParadas(prev => {
      const comHorario = prev.filter(p => p.horario).sort((a, b) => (a.horario! > b.horario! ? 1 : -1));
      const semHorario = prev.filter(p => !p.horario);
      return [...comHorario, ...semHorario];
    });
  };

  const resetarRota = () => {
    setParadas(defaultParadas.map(p => ({ ...p, id: genId(), produtos: p.produtos.map(pr => ({ ...pr, id: genId() })) })));
    setMotoristas(defaultMotoristas.map(m => ({ ...m, id: genId() })));
  };

  return (
    <AppContext.Provider value={{ paradas, motoristas, addParada, updateParada, removeParada, addMotorista, updateMotorista, removeMotorista, roteirizar, resetarRota }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
