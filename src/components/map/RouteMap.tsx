import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Default center: São Paulo
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
}

export default function RouteMap({ paradas }: RouteMapProps) {
  // Generate pseudo-coordinates around São Paulo based on stop index
  const positions: { parada: Parada; pos: [number, number]; index: number }[] = paradas.map((p, i) => {
    // Simple deterministic spread based on name hash
    let hash = 0;
    for (let c = 0; c < p.nome.length; c++) hash = ((hash << 5) - hash + p.nome.charCodeAt(c)) | 0;
    const lat = DEFAULT_CENTER[0] + (((hash % 100) / 100) * 0.08 - 0.04) + (i * 0.005);
    const lng = DEFAULT_CENTER[1] + ((((hash >> 8) % 100) / 100) * 0.08 - 0.04) + (i * 0.003);
    return { parada: p, pos: [lat, lng], index: i + 1 };
  });

  const allPos = positions.map(p => p.pos);

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: 250 }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {allPos.length > 0 && <FitBounds positions={allPos} />}
        {positions.map(({ parada, pos, index }) => (
          <Marker key={parada.id} position={pos} icon={createNumberedIcon(index, parada.status)}>
            <Popup>
              <div className="text-xs">
                <strong>#{index} {parada.nome}</strong><br />
                {parada.endereco}<br />
                <span style={{ color: parada.status === 'entregue' ? '#3B6D11' : '#BA7517' }}>
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
