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

/** Total route distance in km for an ordered list of coordinates. */
export function totalDistance(coords: { lat: number; lng: number }[]): number {
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    dist += haversine(coords[i - 1].lat, coords[i - 1].lng, coords[i].lat, coords[i].lng);
  }
  return dist;
}

/** Nearest-neighbor heuristic: returns indices in optimized order. */
export function nearestNeighborOrder(coords: { lat: number; lng: number }[]): number[] {
  if (coords.length <= 2) return coords.map((_, i) => i);
  const visited = new Set<number>();
  const order: number[] = [0];
  visited.add(0);
  while (order.length < coords.length) {
    const last = coords[order[order.length - 1]];
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      if (visited.has(i)) continue;
      const d = haversine(last.lat, last.lng, coords[i].lat, coords[i].lng);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx >= 0) { order.push(bestIdx); visited.add(bestIdx); }
  }
  return order;
}

/**
 * 2-opt improvement: reverses segments to remove path crossings.
 * Runs until no improving swap is found, or up to maxIter passes.
 */
export function twoOptImprove(
  coords: { lat: number; lng: number }[],
  order: number[],
  maxIter = 30,
): number[] {
  if (order.length < 4) return order;
  let best = [...order];
  let improved = true;
  let iter = 0;
  while (improved && iter++ < maxIter) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const a = coords[best[i - 1]];
        const b = coords[best[i]];
        const c = coords[best[k]];
        const d = coords[best[k + 1]];
        const before = haversine(a.lat, a.lng, b.lat, b.lng) + haversine(c.lat, c.lng, d.lat, d.lng);
        const after = haversine(a.lat, a.lng, c.lat, c.lng) + haversine(b.lat, b.lng, d.lat, d.lng);
        if (after + 1e-9 < before) {
          best = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
          improved = true;
        }
      }
    }
  }
  return best;
}

/**
 * Optimize order with nearest-neighbor + 2-opt, then sort by horario_min (window start) groups.
 * Stops with horario_min are anchored chronologically; others fill in around them by proximity.
 */
export interface OptimizeStop { lat: number; lng: number; horarioMin?: string; }
export function optimizeWithWindows(stops: OptimizeStop[]): number[] {
  if (stops.length <= 2) return stops.map((_, i) => i);
  const withWin: number[] = [];
  const without: number[] = [];
  stops.forEach((s, i) => (s.horarioMin ? withWin : without).push(i));
  withWin.sort((a, b) => (stops[a].horarioMin! < stops[b].horarioMin! ? -1 : 1));

  // Optimize the "without window" set by distance, anchored to first window stop (or 0)
  const anchorIdx = withWin[0] ?? without[0];
  const pool = [anchorIdx, ...without.filter(i => i !== anchorIdx)];
  const poolCoords = pool.map(i => ({ lat: stops[i].lat, lng: stops[i].lng }));
  const nn = nearestNeighborOrder(poolCoords);
  const optimized = twoOptImprove(poolCoords, nn).map(i => pool[i]);
  const optimizedNoAnchor = optimized.filter(i => i !== anchorIdx);

  // Merge: windowed stops in chrono order, others interleaved by proximity to closest windowed stop
  const result: number[] = [];
  const remaining = new Set(optimizedNoAnchor);
  for (const w of withWin) {
    result.push(w);
    // Drain stops that are closer to this w than to the next windowed stop
    while (remaining.size > 0) {
      let bestI = -1, bestD = Infinity;
      for (const i of remaining) {
        const d = haversine(stops[w].lat, stops[w].lng, stops[i].lat, stops[i].lng);
        if (d < bestD) { bestD = d; bestI = i; }
      }
      if (bestI < 0 || bestD > 5) break; // 5km threshold
      result.push(bestI); remaining.delete(bestI);
    }
  }
  // Any leftover
  for (const i of optimizedNoAnchor) if (remaining.has(i)) { result.push(i); remaining.delete(i); }
  if (withWin.length === 0) return optimized;
  return result;
}

/**
 * Distribute stops across drivers respecting weight and volume capacity.
 * Uses a greedy fit-decreasing: largest stop goes to driver with most remaining capacity.
 */
export interface DistributeStop { id: string; peso?: number; volume?: number; }
export interface DistributeDriver { id: string; capacidadePeso?: number; capacidadeVolume?: number; }
export function distributeWithCapacity(
  stops: DistributeStop[],
  drivers: DistributeDriver[],
): Record<string, string | undefined> {
  const assignments: Record<string, string | undefined> = {};
  if (drivers.length === 0) return assignments;
  const load = new Map(drivers.map(d => [d.id, { peso: 0, volume: 0 }]));
  // Largest first by weighted score
  const sorted = [...stops].sort((a, b) => (b.peso || 0) + (b.volume || 0) * 100 - ((a.peso || 0) + (a.volume || 0) * 100));
  for (const s of sorted) {
    let best: { id: string; slack: number } | null = null;
    for (const d of drivers) {
      const cur = load.get(d.id)!;
      const pesoMax = d.capacidadePeso ?? Infinity;
      const volMax = d.capacidadeVolume ?? Infinity;
      const newPeso = cur.peso + (s.peso || 0);
      const newVol = cur.volume + (s.volume || 0);
      if (newPeso > pesoMax || newVol > volMax) continue;
      const slack = (pesoMax - newPeso) + (volMax - newVol) * 100;
      if (!best || slack > best.slack) best = { id: d.id, slack };
    }
    // Fallback: assign anyway to least-loaded driver (capacity overflow flagged elsewhere)
    if (!best) {
      let leastId = drivers[0].id, leastLoad = Infinity;
      for (const d of drivers) {
        const cur = load.get(d.id)!;
        const score = cur.peso + cur.volume * 100;
        if (score < leastLoad) { leastLoad = score; leastId = d.id; }
      }
      best = { id: leastId, slack: 0 };
    }
    assignments[s.id] = best.id;
    const cur = load.get(best.id)!;
    cur.peso += s.peso || 0;
    cur.volume += s.volume || 0;
  }
  return assignments;
}

/** São Paulo mock addresses with real-ish coordinates */
export const MOCK_PARADAS_SP = [
  { nome: 'Bar do Zé', endereco: 'Rua Augusta, 500 - Consolação', lat: -23.5535, lng: -46.6544 },
  { nome: 'Restaurante Sabor Paulista', endereco: 'Av. Paulista, 1578 - Bela Vista', lat: -23.5629, lng: -46.6544 },
  { nome: 'Empório Central', endereco: 'Rua 25 de Março, 100 - Centro', lat: -23.5434, lng: -46.6320 },
  { nome: 'Padaria Pão de Ouro', endereco: 'Rua Oscar Freire, 300 - Jardins', lat: -23.5636, lng: -46.6726 },
  { nome: 'Mercado Municipal Norte', endereco: 'Av. Cruzeiro do Sul, 1100 - Santana', lat: -23.5100, lng: -46.6280 },
];
