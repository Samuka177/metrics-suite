import { useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Parada, Motorista } from '@/types/rotafacil';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createNumberedIcon(num: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const STATUS_COLORS: Record<string, string> = {
  entregue: '#3B6D11',
  em_entrega: '#BA7517',
  falhou: '#DC2626',
  pendente: '#6b7280',
};

const DEFAULT_CENTER: [number, number] = [-23.55, -46.63];

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [30, 30], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

interface RouteMapProps {
  paradas: Parada[];
  motoristas?: Motorista[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
  highlightIndex?: number;
}

export default function RouteMap({ paradas, motoristas = [], onReorder, highlightIndex }: RouteMapProps) {
  const getPos = useCallback((p: Parada, i: number): [number, number] => {
    if (p.lat != null && p.lng != null) return [p.lat, p.lng];
    let hash = 0;
    for (let c = 0; c < p.nome.length; c++) hash = ((hash << 5) - hash + p.nome.charCodeAt(c)) | 0;
    const lat = DEFAULT_CENTER[0] + (((hash % 100) / 100) * 0.08 - 0.04) + (i * 0.005);
    const lng = DEFAULT_CENTER[1] + ((((hash >> 8) % 100) / 100) * 0.08 - 0.04) + (i * 0.003);
    return [lat, lng];
  }, []);

  const positions = paradas.map((p, i) => ({ parada: p, pos: getPos(p, i), index: i }));
  const allPos = positions.map(p => p.pos);

  // Group polylines by motorista
  const motoristaMap = useMemo(() => {
    const map = new Map<string, string>();
    motoristas.forEach(m => map.set(m.id, m.cor));
    return map;
  }, [motoristas]);

  const polylines = useMemo(() => {
    const groups = new Map<string, [number, number][]>();
    const noDriver: [number, number][] = [];
    positions.forEach(({ parada, pos }) => {
      if (parada.status === 'entregue') return;
      if (parada.motoristaId && motoristaMap.has(parada.motoristaId)) {
        const key = parada.motoristaId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(pos);
      } else {
        noDriver.push(pos);
      }
    });
    const result: { positions: [number, number][]; color: string }[] = [];
    groups.forEach((pts, mid) => {
      if (pts.length > 1) result.push({ positions: pts, color: motoristaMap.get(mid) || '#00D4AA' });
    });
    if (noDriver.length > 1) result.push({ positions: noDriver, color: '#00D4AA' });
    return result;
  }, [positions, motoristaMap]);

  const getMarkerColor = useCallback((p: Parada) => {
    if (p.motoristaId && motoristaMap.has(p.motoristaId)) {
      return motoristaMap.get(p.motoristaId)!;
    }
    return STATUS_COLORS[p.status] || STATUS_COLORS.pendente;
  }, [motoristaMap]);

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: 350 }}>
      <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {allPos.length > 0 && <FitBounds positions={allPos} />}

        {polylines.map((pl, i) => (
          <Polyline key={i} positions={pl.positions} pathOptions={{ color: pl.color, weight: 4, opacity: 0.8, dashArray: '8, 6' }} />
        ))}

        {positions.map(({ parada, pos, index }) => (
          <Marker
            key={parada.id}
            position={pos}
            icon={createNumberedIcon(index + 1, getMarkerColor(parada))}
            draggable={!!onReorder && parada.status === 'pendente'}
            eventHandlers={
              onReorder
                ? {
                    dragend: (e) => {
                      const marker = e.target as L.Marker;
                      const newLatLng = marker.getLatLng();
                      let closestIdx = index;
                      let closestDist = Infinity;
                      positions.forEach((other, otherIdx) => {
                        if (otherIdx === index) return;
                        const d = Math.hypot(other.pos[0] - newLatLng.lat, other.pos[1] - newLatLng.lng);
                        if (d < closestDist) { closestDist = d; closestIdx = otherIdx; }
                      });
                      if (closestIdx !== index) onReorder(index, closestIdx);
                      marker.setLatLng(pos);
                    },
                  }
                : undefined
            }
          >
            <Popup>
              <div className="text-xs">
                <strong>#{index + 1} {parada.nome}</strong><br />
                {parada.endereco}<br />
                {parada.etaMinutos != null && <span>ETA: ~{parada.etaMinutos} min<br /></span>}
                {parada.peso && <span>{parada.peso}kg </span>}
                {parada.volume && <span>{parada.volume}m³</span>}
                <br />
                <span style={{ color: STATUS_COLORS[parada.status] || '#6b7280' }}>
                  {parada.status === 'entregue' ? '✓ Entregue' : parada.status === 'em_entrega' ? '⏳ Em entrega' : parada.status === 'falhou' ? '✗ Falhou' : '○ Pendente'}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
