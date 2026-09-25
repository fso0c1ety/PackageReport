const normalizeAddress = (value) => String(value || "").replace(/\s+/g, " ").trim();

function candidateQueries(address) {
  const original = normalizeAddress(address);
  const expanded = original.replace(/\bMah\.?\b/gi, "Mahallesi").replace(/(\d+)\.\s*Sok\b/gi, "$1. Sokak").replace(/\bNo\s*:\s*/gi, "No ");
  const compact = original.match(/(\d+)\.\s*Sok\b/i)?.[1];
  const neighborhood = original.match(/Yakuplu/i)?.[0] || "";
  const district = original.match(/Beylikdüzü/i)?.[0] || "";
  const compactQuery = compact && neighborhood && district ? `${compact} Sokak ${neighborhood} ${district} İstanbul Türkiye` : "";
  return [...new Set([original, expanded, compactQuery].filter(Boolean))];
}

function sufficientlySpecific(item, query) {
  const display = String(item?.display_name || "").toLocaleLowerCase("tr");
  if (/sokak|cadde|bulvar|mahalle/.test(display)) return true;
  return /sokak|cadde|bulvar|mahalle/.test(query.toLocaleLowerCase("tr")) && display.includes("beylikdüzü");
}

export async function geocodeAddress(address) {
  const query = normalizeAddress(address);
  if (!query) return null;
  for (const candidate of candidateQueries(query)) {
    const params = new URLSearchParams({ format: "jsonv2", limit: "1", q: candidate });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "Accept-Language": "en", "User-Agent": "SmartManage/1.0 trip-map" } });
    if (!response.ok) continue;
    const item = (await response.json())?.[0];
    if (!sufficientlySpecific(item, candidate)) continue;
    const latitude = Number(item?.lat);
    const longitude = Number(item?.lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude };
  }
  return null;
}
