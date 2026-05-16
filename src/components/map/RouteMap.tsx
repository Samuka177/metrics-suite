import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Parada, Motorista } from '@/types/rotafacil';

type LatLngTuple = [number, number];

function createNumberedIcon(num: number, color: string, isHighlighted = false) {
  const size = isHighlighted ? 34 : 28;
  const fontSize = isHighlighted ? 14 : 13;
  const borderColor = isHighlighted ? '#0f172a' : '#ffffff';

  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#ffffff;width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;border:2px solid ${borderColor};box-shadow:0 2px 8px rgba(0,0,0,.28)">${num}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const STATUS_COLORS: Record<string, string> = {
  entregue: '#3B6D11',
  em_entrega: '#BA7517',
  falhou: '#DC2626',
  pendente: '#6b7280',
};

const DEFAULT_CENTER: LatLngTuple = [-23.55, -46.63];

function escapeHtml(value: string | undefined) {
  return (value ?? '').replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[char] || char;
  });
}

function getStatusLabel(status: Parada['status']) {
  if (status === 'entregue') return '✓ Entregue';
  if (status === 'em_entrega') return '⏳ Em entrega';
  if (status === 'falhou') return '✗ Falhou';
  return '○ Pendente';
}

function createPopupHtml(parada: Parada, index: number) {
  const details = [
    parada.etaMinutos != null ? `ETA: ~${parada.etaMinutos} min` : null,
    parada.peso ? `${parada.peso}kg` : null,
    parada.volume ? `${parada.volume}m³` : null,
  ].filter(Boolean);

  return `
    <div style="font-size:12px;line-height:1.45;min-width:160px;">
      <strong>#${index + 1} ${escapeHtml(parada.nome)}</strong><br />
      ${escapeHtml(parada.endereco)}
      ${details.length ? `<br />${details.join(' · ')}` : ''}
      <br />
      <span style="color:${STATUS_COLORS[parada.status] || STATUS_COLORS.pendente}">
        ${getStatusLabel(parada.status)}
      </span>
    </div>
  `;
}

interface RouteMapProps {
  paradas: Parada[];
  motoristas?: Motorista[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
  highlightIndex?: number;
}

export default function RouteMap({ paradas, motoristas = [], onReorder, highlightIndex }: RouteMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const getPos = useCallback((p: Parada, i: number): LatLngTuple => {
    if (p.lat != null && p.lng != null) return [p.lat, p.lng];

    let hash = 0;
    for (let c = 0; c < p.nome.length; c++) {
      hash = ((hash << 5) - hash + p.nome.charCodeAt(c)) | 0;
    }

    const lat = DEFAULT_CENTER[0] + (((hash % 100) / 100) * 0.08 - 0.04) + (i * 0.005);
    const lng = DEFAULT_CENTER[1] + ((((hash >> 8) % 100) / 100) * 0.08 - 0.04) + (i * 0.003);
    return [lat, lng];
  }, []);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(DEFAULT_CENTER, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    mapRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);

    requestAnimationFrame(() => map.invalidateSize());

    // Observa redimensionamento do container e ajusta o mapa
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapElementRef.current);

    return () => {
      ro.disconnect();
      layerGroupRef.current?.clearLayers();
      layerGroupRef.current?.remove();
      map.remove();
      layerGroupRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const positions = paradas.map((parada, index) => ({
      parada,
      index,
      pos: getPos(parada, index),
    }));

    const allPos = positions.map(({ pos }) => pos);
    const motoristaMap = new Map(motoristas.map((motorista) => [motorista.id, motorista.cor]));
    const groupedLines = new Map<string, LatLngTuple[]>();
    const noDriver: LatLngTuple[] = [];

    positions.forEach(({ parada, pos }) => {
      if (parada.status === 'entregue') return;

      if (parada.motoristaId && motoristaMap.has(parada.motoristaId)) {
        const group = groupedLines.get(parada.motoristaId) ?? [];
        group.push(pos);
        groupedLines.set(parada.motoristaId, group);
        return;
      }

      noDriver.push(pos);
    });

    groupedLines.forEach((linePositions, motoristaId) => {
      if (linePositions.length < 2) return;

      L.polyline(linePositions, {
        color: motoristaMap.get(motoristaId) || '#00D4AA',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 6',
      }).addTo(layerGroup);
    });

    if (noDriver.length > 1) {
      L.polyline(noDriver, {
        color: '#00D4AA',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 6',
      }).addTo(layerGroup);
    }

    positions.forEach(({ parada, pos, index }) => {
      const color = parada.motoristaId && motoristaMap.has(parada.motoristaId)
        ? motoristaMap.get(parada.motoristaId) || STATUS_COLORS.pendente
        : STATUS_COLORS[parada.status] || STATUS_COLORS.pendente;

      const marker = L.marker(pos, {
        icon: createNumberedIcon(index + 1, color, highlightIndex === index),
        draggable: Boolean(onReorder && parada.status === 'pendente'),
      });

      if (onReorder && parada.status === 'pendente') {
        marker.on('dragend', (event) => {
          const draggedMarker = event.target as L.Marker;
          const newLatLng = draggedMarker.getLatLng();
          let closestIdx = index;
          let closestDist = Infinity;

          positions.forEach((other, otherIdx) => {
            if (otherIdx === index) return;

            const distance = Math.hypot(other.pos[0] - newLatLng.lat, other.pos[1] - newLatLng.lng);
            if (distance < closestDist) {
              closestDist = distance;
              closestIdx = otherIdx;
            }
          });

          if (closestIdx !== index) {
            onReorder(index, closestIdx);
          }

          draggedMarker.setLatLng(pos);
        });
      }

      marker.bindPopup(createPopupHtml(parada, index));
      marker.addTo(layerGroup);
    });

    if (allPos.length > 0) {
      map.fitBounds(L.latLngBounds(allPos), { padding: [30, 30], maxZoom: 14 });
    } else {
      map.setView(DEFAULT_CENTER, 12);
    }

    requestAnimationFrame(() => map.invalidateSize());
  }, [paradas, motoristas, onReorder, highlightIndex, getPos]);

  return (
    <div className="rounded-xl overflow-hidden border border-border h-full w-full">
      <div ref={mapElementRef} className="h-full w-full" />
    </div>
  );
}

