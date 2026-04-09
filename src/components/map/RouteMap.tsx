import { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Parada } from '@/types/rotafacil';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createNumberedIcon(num: number, status: string) {
  const color = status === 'entregue' ? '#3B6D11' : status === 'em_entrega' ? '#BA7517' : '#6b7280';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

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
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export default function RouteMap({ paradas, onReorder }: RouteMapProps) {
  const getPos = useCallback((p: Parada, i: number): [number, number] => {
    if (p.lat != null && p.lng != null) return [p.lat, p.lng];
    // Fallback: deterministic spread
    let hash = 0;
    for (let c = 0; c < p.nome.length; c++) hash = ((hash << 5) - hash + p.nome.charCodeAt(c)) | 0;
    const lat = DEFAULT_CENTER[0] + (((hash % 100) / 100) * 0.08 - 0.04) + (i * 0.005);
    const lng = DEFAULT_CENTER[1] + ((((hash >> 8) % 100) / 100) * 0.08 - 0.04) + (i * 0.003);
    return [lat, lng];
  }, []);

  const positions = paradas.map((p, i) => ({
    parada: p,
    pos: getPos(p, i),
    index: i,
  }));

  const allPos = positions.map(p => p.pos);
  const polylinePositions: [number, number][] = positions
    .filter(p => p.parada.status !== 'entregue')
    .map(p => p.pos);

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: 300 }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {allPos.length > 0 && <FitBounds positions={allPos} />}

        {/* Route polyline */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: '#00D4AA', weight: 4, opacity: 0.8, dashArray: '8, 6' }}
          />
        )}

        {positions.map(({ parada, pos, index }) => (
          <Marker
            key={parada.id}
            position={pos}
            icon={createNumberedIcon(index + 1, parada.status)}
            draggable={!!onReorder && parada.status === 'pendente'}
            eventHandlers={
              onReorder
                ? {
                    dragend: (e) => {
                      const marker = e.target as L.Marker;
                      const newLatLng = marker.getLatLng();
                      // Find nearest position to snap to
                      let closestIdx = index;
                      let closestDist = Infinity;
                      positions.forEach((other, otherIdx) => {
                        if (otherIdx === index) return;
                        const d = Math.hypot(other.pos[0] - newLatLng.lat, other.pos[1] - newLatLng.lng);
                        if (d < closestDist) {
                          closestDist = d;
                          closestIdx = otherIdx;
                        }
                      });
                      if (closestIdx !== index) {
                        onReorder(index, closestIdx);
                      }
                      // Reset marker position
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
                <span style={{ color: parada.status === 'entregue' ? '#3B6D11' : parada.status === 'em_entrega' ? '#BA7517' : '#6b7280' }}>
                  {parada.status === 'entregue' ? '✓ Entregue' : parada.status === 'em_entrega' ? '⏳ Em entrega' : '○ Pendente'}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
