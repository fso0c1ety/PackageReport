const normalizeAddress = (value) => String(value || "").replace(/\s+/g, " ").trim();

export async function geocodeAddress(address) {
  const query = normalizeAddress(address);
  if (!query) return null;
  const params = new URLSearchParams({ format: "jsonv2", limit: "1", q: query });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "Accept-Language": "en", "User-Agent": "SmartManage/1.0 trip-map" },
  });
  if (!response.ok) return null;
  const item = (await response.json())?.[0];
  const latitude = Number(item?.lat);
  const longitude = Number(item?.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}
