/**
 * Geocode an address using Nominatim (OpenStreetMap).
 * Free, no API key required. Rate-limited to 1 req/s.
 */
export async function geocodeAddress(
  endereco: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: endereco,
      format: 'json',
      limit: '1',
      countrycodes: 'br',
    })}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'RotiFlow/1.0' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

/**
 * Batch geocode with 1s delay between requests (Nominatim policy).
 */
export async function batchGeocode(
  enderecos: { id: string; endereco: string }[]
): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();

  for (const item of enderecos) {
    const coords = await geocodeAddress(item.endereco);
    if (coords) results.set(item.id, coords);
    // Respect Nominatim rate limit
    await new Promise((r) => setTimeout(r, 1100));
  }

  return results;
}
