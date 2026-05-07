import type { Parada, Motorista } from '@/types/rotafacil';

/** Sanitiza telefone para wa.me (somente dígitos, prefixo 55 se ausente). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

/** Gera link Google Maps com waypoints para a sequência de paradas. */
export function buildRouteLink(paradas: Parada[]): string {
  const pontos = paradas
    .filter(p => p.lat != null && p.lng != null)
    .map(p => `${p.lat},${p.lng}`);
  if (pontos.length === 0) {
    // fallback por endereço
    const enderecos = paradas.map(p => encodeURIComponent(p.endereco)).filter(Boolean);
    if (enderecos.length === 0) return 'https://www.google.com/maps';
    const destino = enderecos[enderecos.length - 1];
    const waypoints = enderecos.slice(0, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1&destination=${destino}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
  }
  const destino = pontos[pontos.length - 1];
  const waypoints = pontos.slice(0, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=driving`;
}

/** Monta a mensagem com lista de paradas + link da rota. */
export function buildRouteMessage(motorista: Motorista, paradas: Parada[]): string {
  const link = buildRouteLink(paradas);
  const lista = paradas
    .map((p, i) => `${i + 1}. ${p.nome} — ${p.endereco}`)
    .join('\n');
  return `Olá ${motorista.nome}! Sua rota de hoje (${paradas.length} parada(s)):\n\n${lista}\n\nAbrir rota no mapa:\n${link}`;
}

/** Abre o WhatsApp com a mensagem da rota. Retorna false se sem telefone. */
export function sendRouteViaWhatsApp(motorista: Motorista, paradas: Parada[]): boolean {
  if (!motorista.telefone) return false;
  const phone = normalizePhone(motorista.telefone);
  if (!phone) return false;
  const text = encodeURIComponent(buildRouteMessage(motorista, paradas));
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
  return true;
}
