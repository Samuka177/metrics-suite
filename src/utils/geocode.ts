/** Geocode brasileiro com parsing de NF-e e diagnóstico de falhas. */

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export interface AddressParts {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

export type GeocodeResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: string; suggestions: string[] };

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const isCep = (value: string) => /^\d{5}-?\d{3}$/.test(value.trim());
const isUf = (value: string) => UF_LIST.includes(value.trim().toUpperCase());
const isNumero = (value: string) => /^(\d+[A-Za-z]?|\d+\s+[A-Za-z]|S\/?N|SN)$/i.test(value.trim());

/** Extrai partes de um endereço em texto livre no padrão usado pelo app. */
export function parseEndereco(endereco: string): AddressParts {
  const parts: AddressParts = {};
  const s = normalize(endereco || '');
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

  // Padrão NF-e comum: "Rua X, 123, Bairro, Cidade, UF, CEP".
  const commaParts = s.split(',').map(x => normalize(x)).filter(Boolean);
  if (commaParts.length >= 4) {
    parts.logradouro = commaParts[0];

    const ufIndex = commaParts.findIndex(isUf);
    if (ufIndex >= 0) parts.uf = commaParts[ufIndex].toUpperCase();

    const cepPart = commaParts.find(isCep);
    if (cepPart) {
      const cepDigits = cepPart.replace(/\D/g, '');
      parts.cep = `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`;
    }

    const stopIndex = ufIndex >= 0 ? ufIndex : commaParts.length;
    const middle = commaParts.slice(1, stopIndex).filter(x => !isCep(x));
    const numeroIndex = middle.findIndex(isNumero);
    if (numeroIndex >= 0) {
      parts.numero = middle[numeroIndex].toUpperCase() === 'SN' ? 'SN' : middle[numeroIndex];
      const beforeNumero = middle.slice(0, numeroIndex).filter(Boolean);
      const afterNumero = middle.slice(numeroIndex + 1).filter(Boolean);
      if (beforeNumero.length) parts.complemento = beforeNumero.join(', ');
      if (afterNumero.length >= 1) parts.municipio = afterNumero[afterNumero.length - 1];
      if (afterNumero.length >= 2) parts.bairro = afterNumero[afterNumero.length - 2];
    } else {
      if (middle.length >= 1) parts.bairro = middle[middle.length - 2];
      if (middle.length >= 1) parts.municipio = middle[middle.length - 1];
    }

    return parts;
  }

  // Segmentos separados por " - " no padrão "Logradouro, N - Bairro - Município - UF - CEP"
  const segs = s.split(/\s-\s/).map(x => x.trim()).filter(Boolean);
  if (segs.length >= 1) {
    const first = segs[0];
    const m = first.match(/^(.+?),\s*(\d+[A-Za-z]?|\d+\s+[A-Za-z]|S\/?N|SN)\s*$/i);
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

export function getAddressDiagnostics(endereco: string): { reason: string; suggestions: string[] } {
  const parts = parseEndereco(endereco);
  const suggestions: string[] = [];

  if (!endereco || !endereco.trim()) {
    return {
      reason: 'Endereço ausente.',
      suggestions: ['Preencha logradouro, número, município, UF e CEP.'],
    };
  }

  if (!parts.cep) suggestions.push('Informe o CEP no formato 00000-000.');
  if (!parts.uf) suggestions.push('Informe a UF com 2 letras, por exemplo CE.');
  if (!parts.municipio) suggestions.push('Informe o município antes da UF.');
  if (!parts.logradouro || parts.logradouro.length < 4) suggestions.push('Revise o nome da rua/avenida.');
  if (!parts.numero || /^(S\/?N|SN)$/i.test(parts.numero)) suggestions.push('Substitua “SN” pelo número real ou adicione um ponto de referência no endereço.');

  if (!parts.cep) return { reason: 'CEP ausente.', suggestions };
  if (!parts.uf || !parts.municipio) return { reason: 'Cidade/UF incompletos.', suggestions };
  if (!parts.logradouro || parts.logradouro.length < 4) return { reason: 'Logradouro incompleto.', suggestions };
  if (!parts.numero || /^(S\/?N|SN)$/i.test(parts.numero)) return { reason: 'Número ausente ou “SN”.', suggestions };

  return {
    reason: 'O geocode não encontrou uma coordenada confiável para este endereço.',
    suggestions: ['Confira se rua, número, bairro, município, UF e CEP pertencem ao mesmo local.', 'Remova complementos como “loja”, “sala” ou “fundos” se atrapalharem a busca.'],
  };
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
export async function geocodeAddress(endereco: string): Promise<{ lat: number; lng: number } | null> {
  const result = await geocodeAddressDetailed(endereco);
  return result.ok ? { lat: result.lat, lng: result.lng } : null;
}

export async function geocodeAddressDetailed(endereco: string): Promise<GeocodeResult> {
  if (!endereco || !endereco.trim()) return { ok: false, ...getAddressDiagnostics(endereco) };
  const parts = parseEndereco(endereco);
  const coords = await geocodeParts(parts, endereco);
  if (coords) return { ok: true, ...coords };
  return { ok: false, ...getAddressDiagnostics(endereco) };
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

    // 1b) Sem CEP, pois alguns CEPs de NF-e são genéricos de cidade.
    if (street && parts.municipio && parts.uf) {
      const resultsNoCep = await nominatimFetch({ street, city: parts.municipio, state: parts.uf });
      const bestNoCep = pickBestResult(resultsNoCep, parts.uf);
      if (bestNoCep) return { lat: parseFloat(bestNoCep.lat), lng: parseFloat(bestNoCep.lon) };
    }

    // 2) Busca livre com UF/cidade concatenadas
    const q = fallbackQuery
      || [street, parts.complemento, parts.bairro, parts.municipio, parts.uf, parts.cep, 'Brasil']
          .filter(Boolean).join(', ');
    const results2 = await nominatimFetch({ q });
    const best2 = pickBestResult(results2, parts.uf);
    if (best2) return { lat: parseFloat(best2.lat), lng: parseFloat(best2.lon) };

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
