import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Envia a posição GPS atual para a tabela motorista_posicoes a cada `intervalMs`,
 * enquanto `active` for true. Requer permissão de geolocalização.
 */
export function useGpsTracker(params: {
  active: boolean;
  motoristaId: string | null;
  companyId: string | null;
  intervalMs?: number;
}) {
  const { active, motoristaId, companyId, intervalMs = 30000 } = params;
  const lastSentRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !motoristaId || !companyId) return;
    if (!('geolocation' in navigator)) return;

    const send = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSentRef.current < intervalMs) return;
      lastSentRef.current = now;
      await (supabase as any).from('motorista_posicoes').insert({
        motorista_id: motoristaId,
        company_id: companyId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        speed: pos.coords.speed ?? null,
        heading: pos.coords.heading ?? null,
      });
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      send,
      () => { /* ignore */ },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [active, motoristaId, companyId, intervalMs]);
}
