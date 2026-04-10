/**
 * Haversine distance between two lat/lng points in km.
 */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate total route distance in km for an ordered list of coordinates.
 */
export function totalDistance(coords: { lat: number; lng: number }[]): number {
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    dist += haversine(coords[i - 1].lat, coords[i - 1].lng, coords[i].lat, coords[i].lng);
  }
  return dist;
}

/**
 * Nearest-neighbor heuristic: returns indices in optimized order.
 */
export function nearestNeighborOrder(coords: { lat: number; lng: number }[]): number[] {
  if (coords.length <= 2) return coords.map((_, i) => i);

  const visited = new Set<number>();
  const order: number[] = [0]; // start from first stop
  visited.add(0);

  while (order.length < coords.length) {
    const last = coords[order[order.length - 1]];
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < coords.length; i++) {
      if (visited.has(i)) continue;
      const d = haversine(last.lat, last.lng, coords[i].lat, coords[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      order.push(bestIdx);
      visited.add(bestIdx);
    }
  }

  return order;
}

/** São Paulo mock addresses with real-ish coordinates */
export const MOCK_PARADAS_SP = [
  { nome: 'Bar do Zé', endereco: 'Rua Augusta, 500 - Consolação', lat: -23.5535, lng: -46.6544 },
  { nome: 'Restaurante Sabor Paulista', endereco: 'Av. Paulista, 1578 - Bela Vista', lat: -23.5629, lng: -46.6544 },
  { nome: 'Empório Central', endereco: 'Rua 25 de Março, 100 - Centro', lat: -23.5434, lng: -46.6320 },
  { nome: 'Padaria Pão de Ouro', endereco: 'Rua Oscar Freire, 300 - Jardins', lat: -23.5636, lng: -46.6726 },
  { nome: 'Mercado Municipal Norte', endereco: 'Av. Cruzeiro do Sul, 1100 - Santana', lat: -23.5100, lng: -46.6280 },
];
