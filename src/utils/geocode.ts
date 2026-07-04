/**
 * Geocode brasileiro robusto usando Nominatim (OpenStreetMap).
 *
 * Estratégia:
 * 1. Tenta uma busca ESTRUTURADA (street/city/state/postalcode) — muito mais
 *    preciso do que a busca livre, especialmente quando o mesmo nome de rua
 *    existe em várias cidades do Brasil.
 * 2. Se falhar, tenta busca livre restrita ao Brasil e (quando conhecido) à UF.
 * 3. Se ainda falhar, tenta busca livre pura.
 *
 * Também filtra resultados fora da UF esperada, evitando que "Rua Sete, 100"
 * caia em outro estado.
 */

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export interface AddressParts {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

/** Extrai partes de um endereço em texto livre no padrão usado pelo app. */
export function parseEndereco(endereco: string): AddressParts {
  const parts: AddressParts = {};
  const s = (endereco || '').trim();
  if (!s) return parts;

  // CEP: 00000-000 ou 00000000
  const cepMatch = s.match(/\b(\d{5})-?(\d{3})\b/);
  if (cepMatch) parts.cep = `${cepMatch[1]}-${cepMatch[2]}`;

  // UF: token de 2 letras maiúsculas que seja UF válida
  const tokens = s.split(/[\s,\-]+/).map(t => t.trim()).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i].toUpperCase();
    if (t.length === 2 && UF_LIST.includes(t)) { parts.uf = t; break; }
  }

  // Segmentos separados por " - " no padrão "Logradouro, N - Bairro - Município - UF - CEP"
  const segs = s.split(/\s-\s/).map(x => x.trim()).filter(Boolean);
  if (segs.length >= 1) {
    const first = segs[0];
    const m = first.match(/^(.+?),\s*(\d+[A-Za-z]?)\s*$/);
    if (m) { parts.logradouro = m[1].trim(); parts.numero = m[2].trim(); }
    else parts.logradouro = first;
  }
  if (segs.length >= 2) parts.bairro = segs[1];
  if (segs.length >= 3) parts.municipio = segs[segs.length - (parts.uf ? 2 : 1) - (parts.cep ? 1 : 0)] || segs[2];

  // Município: tenta o segmento antes da UF/CEP
  if (!parts.municipio) {
    for (const seg of segs.slice(1)) {
      const up = seg.toUpperCase();
      if (parts.uf && up === parts.uf) continue;
      if (parts.cep && seg.replace(/\D/g, '') === parts.cep.replace(/\D/g, '')) continue;
      if (/^\d{5}-?\d{3}$/.test(seg)) continue;
      if (UF_LIST.includes(up)) continue;
      parts.municipio = seg;
    }
  }
  return parts;
}

async function nominatimFetch(params: Record<string, string>): Promise<any[]> {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    format: 'json',
    limit: '5',
    addressdetails: '1',
    countrycodes: 'br',
    ...params,
  })}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'RotiFlow/1.0' } });
  if (!res.ok) return [];
  return await res.json();
}

function pickBestResult(results: any[], expectedUf?: string): any | null {
  if (!results.length) return null;
  if (expectedUf) {
    const uf = expectedUf.toUpperCase();
    // Nominatim retorna estado por nome; mapear UF -> nomes conhecidos
    const UF_NAMES: Record<string, string[]> = {
      AC: ['Acre'], AL: ['Alagoas'], AP: ['Amapá','Amapa'], AM: ['Amazonas'],
      BA: ['Bahia'], CE: ['Ceará','Ceara'], DF: ['Distrito Federal'],
      ES: ['Espírito Santo','Espirito Santo'], GO: ['Goiás','Goias'],
      MA: ['Maranhão','Maranhao'], MT: ['Mato Grosso'], MS: ['Mato Grosso do Sul'],
      MG: ['Minas Gerais'], PA: ['Pará','Para'], PB: ['Paraíba','Paraiba'],
      PR: ['Paraná','Parana'], PE: ['Pernambuco'], PI: ['Piauí','Piaui'],
      RJ: ['Rio de Janeiro'], RN: ['Rio Grande do Norte'],
      RS: ['Rio Grande do Sul'], RO: ['Rondônia','Rondonia'],
      RR: ['Roraima'], SC: ['Santa Catarina'], SP: ['São Paulo','Sao Paulo'],
      SE: ['Sergipe'], TO: ['Tocantins'],
    };
    const names = UF_NAMES[uf] || [];
    const inUf = results.find(r => {
      const st = r.address?.state || '';
      return names.some(n => st.toLowerCase() === n.toLowerCase());
    });
    if (inUf) return inUf;
  }
  return results[0];
}

/** Geocodifica um endereço em texto livre. */
export async function geocodeAddress(
  endereco: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!endereco || !endereco.trim()) return null;
  const parts = parseEndereco(endereco);
  return geocodeParts(parts, endereco);
}

/** Geocodifica com partes estruturadas quando disponíveis. */
export async function geocodeParts(
  parts: AddressParts,
  fallbackQuery?: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    // 1) Busca estruturada
    const structured: Record<string, string> = {};
    const street = [parts.logradouro, parts.numero].filter(Boolean).join(', ');
    if (street) structured.street = street;
    if (parts.municipio) structured.city = parts.municipio;
    if (parts.uf) structured.state = parts.uf;
    if (parts.cep) structured.postalcode = parts.cep;

    if (Object.keys(structured).length >= 2) {
      const results = await nominatimFetch(structured);
      const best = pickBestResult(results, parts.uf);
      if (best) return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
    }

    // 2) Busca livre com UF/cidade concatenadas
    const q = fallbackQuery
      || [street, parts.bairro, parts.municipio, parts.uf, parts.cep, 'Brasil']
          .filter(Boolean).join(', ');
    const results2 = await nominatimFetch({ q });
    const best2 = pickBestResult(results2, parts.uf);
    if (best2) return { lat: parseFloat(best2.lat), lng: parseFloat(best2.lon) };

    // 3) Última tentativa: só cidade + UF (centro da cidade — melhor que nada)
    if (parts.municipio && parts.uf) {
      const results3 = await nominatimFetch({
        city: parts.municipio, state: parts.uf,
      });
      const best3 = pickBestResult(results3, parts.uf);
      if (best3) return { lat: parseFloat(best3.lat), lng: parseFloat(best3.lon) };
    }
    return null;
  } catch {
    return null;
  }
}

/** Batch com delay de 1.1s entre chamadas (política Nominatim). */
export async function batchGeocode(
  enderecos: { id: string; endereco: string }[],
): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();
  for (const item of enderecos) {
    const coords = await geocodeAddress(item.endereco);
    if (coords) results.set(item.id, coords);
    await new Promise((r) => setTimeout(r, 1100));
  }
  return results;
}
