export type TipoEntrega = "Ponto fixo" | "Delivery";

export type StatusParada = "pendente" | "em_entrega" | "entregue" | "falhou";

export type Produto = {
  id: string;
  nome: string;
  quantidade: string;
  unidade: string;
  entregue: boolean;
};

export type Parada = {
  id: string;
  nome: string;
  endereco: string;
  tipo: TipoEntrega;
  horario?: string;
  horarioMin?: string;
  horarioMax?: string;
  produtos: Produto[];
  status: StatusParada;
  checkinTime?: string;
  checkoutTime?: string;
  lat?: number;
  lng?: number;
  peso?: number;       // kg
  volume?: number;     // m³
  observacoes?: string;
  motoristaId?: string;
  etaMinutos?: number; // ETA calculado
  telefone?: string;
};

export type Motorista = {
  id: string;
  nome: string;
  placa: string;
  ativo: boolean;
  checkinTime?: string;
  checkoutTime?: string;
  capacidadePeso?: number;  // kg máximo
  capacidadeVolume?: number; // m³ máximo
  cor: string; // hex color for map
};

export type ConfigRota = {
  velocidadeMedia: number; // km/h, default 40
};
