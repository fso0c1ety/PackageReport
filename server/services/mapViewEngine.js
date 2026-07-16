const COUNTRY_CENTERS = Object.freeze({
  XK: [42.6675, 21.1662], DE: [51.1657, 10.4515], TR: [38.9637, 35.2433], IT: [41.8719, 12.5674], ES: [40.4637, -3.7492], FR: [46.2276, 2.2137],
  AL: [41.1533, 20.1683], MK: [41.6086, 21.7453], RS: [44.0165, 21.0059], ME: [42.7087, 19.3744], US: [37.0902, -95.7129], GB: [55.3781, -3.436],
});

function hashLocation(label) {
  let hash = 0; for (const char of String(label || "")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return [((Math.abs(hash) % 12000) / 100) - 60, ((Math.abs(hash * 31) % 34000) / 100) - 170];
}

function coordinates(value) {
  if (!value) return null;
  if (typeof value === "object") {
    const lat = Number(value.latitude ?? value.lat); const lng = Number(value.longitude ?? value.lng ?? value.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
    const code = String(value.countryCode || "").toUpperCase(); if (COUNTRY_CENTERS[code]) return COUNTRY_CENTERS[code];
    return hashLocation(value.label || value.address || value.city || value.countryName);
  }
  const code = String(value).trim().toUpperCase();
  return COUNTRY_CENTERS[code] || hashLocation(value);
}

function buildMapData(rows, options) {
  const sourceColumnId = options?.sourceColumnId;
  if (!sourceColumnId) return { markers: [], routes: [] };
  const groups = new Map(); const routes = [];
  for (const row of rows || []) {
    const point = coordinates(row.values?.[sourceColumnId]); if (!point) continue;
    const precision = Number(options?.clusterPrecision ?? 1);
    const key = `${point[0].toFixed(precision)}:${point[1].toFixed(precision)}`;
    const marker = groups.get(key) || { key, latitude: point[0], longitude: point[1], rows: [], count: 0, total: 0 };
    marker.rows.push(row); marker.count += 1;
    const amount = Number(row.values?.[options?.aggregateColumnId]); if (Number.isFinite(amount)) marker.total += amount;
    groups.set(key, marker);
    if (options?.destinationColumnId) {
      const destination = coordinates(row.values?.[options.destinationColumnId]);
      if (destination) routes.push({ rowId: row.id, origin: point, destination, status: row.values?.[options.statusColumnId] || null });
    }
  }
  return { markers: [...groups.values()], routes };
}

module.exports = { COUNTRY_CENTERS, buildMapData, coordinates, hashLocation };
