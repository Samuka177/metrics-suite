export type TipoEntrega = "Ponto fixo" | "Delivery";

export type StatusParada = "pendente" | "em_entrega" | "entregue";

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
  produtos: Produto[];
  status: StatusParada;
  checkinTime?: string;
  checkoutTime?: string;
  lat?: number;
  lng?: number;
};

export type Motorista = {
  id: string;
  nome: string;
  placa: string;
  ativo: boolean;
  checkinTime?: string;
  checkoutTime?: string;
};
