import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Posicao {
  motorista_id: string;
  lat: number;
  lng: number;
  speed: number | null;
  created_at: string;
}

interface Props {
  motoristas: { id: string; nome: string; cor: string }[];
}

/** Painel de tracking GPS ao vivo — mostra última posição conhecida de cada motorista. */
export default function LiveTrackingPanel({ motoristas }: Props) {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [posicoes, setPosicoes] = useState<Record<string, Posicao>>({});

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from('motorista_posicoes')
        .select('motorista_id, lat, lng, speed, created_at')
        .eq('company_id', companyId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (cancelled) return;
      const latest: Record<string, Posicao> = {};
      for (const r of (data || []) as Posicao[]) {
        if (!latest[r.motorista_id]) latest[r.motorista_id] = r;
      }
      setPosicoes(latest);
    })();

    const channel = supabase
      .channel('motorista_posicoes_live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'motorista_posicoes', filter: `company_id=eq.${companyId}` },
        (payload) => {
          const r = payload.new as Posicao;
          setPosicoes(prev => ({ ...prev, [r.motorista_id]: r }));
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [companyId]);

  if (motoristas.length === 0) return null;

  const fmtAgo = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s atrás`;
    if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
    return `${Math.floor(s / 3600)}h atrás`;
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
          <Radio className="h-3.5 w-3.5 text-success animate-pulse" /> Rastreamento ao vivo
        </p>
        <div className="space-y-1">
          {motoristas.map(m => {
            const p = posicoes[m.id];
            return (
              <div key={m.id} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: m.cor }} />
                <span className="font-medium text-foreground">{m.nome.split(' ')[0]}</span>
                {p ? (
                  <>
                    <Badge variant="secondary" className="text-[10px]">{fmtAgo(p.created_at)}</Badge>
                    <a
                      href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}
                    </a>
                    {p.speed != null && p.speed > 0 && (
                      <span className="text-muted-foreground">{Math.round(p.speed * 3.6)} km/h</span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">sem sinal</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
