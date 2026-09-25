const test = require("node:test");
const assert = require("node:assert/strict");
const { buildMapData, coordinates } = require("../server/services/mapViewEngine");

test("geocoder keeps the complete address as the canonical query", async () => {
  const { geocodeAddress } = await import("../server/services/geocoding.js");
  const previousFetch = global.fetch;
  const requests = [];
  global.fetch = async (url) => { requests.push(String(url)); const exact = requests.length === 1; return { ok: true, async json() { return exact ? [] : [{ lat: "41.005", lon: "28.88", display_name: "59. Sokak, Yakuplu Mahallesi, Beylikdüzü, İstanbul, Türkiye" }]; } }; };
  try {
    assert.deepEqual(await geocodeAddress("Yakuplu Mah. Hürriyet Bulvarı 59. Sok No:32/A Kat:3, Yakuplu, 34524 Beylikdüzü/İstanbul, Türkiye"), { latitude: 41.005, longitude: 28.88 });
    assert.match(decodeURIComponent(requests[0]).replace(/\+/g, " "), /Yakuplu Mah\. Hürriyet Bulvarı 59\. Sok No:32\/A Kat:3/);
    assert.ok(requests.length >= 2);
  } finally { global.fetch = previousFetch; }
});

test("map accepts structured coordinates, countries and addresses", () => {
  assert.deepEqual(coordinates({ latitude: 42.66, longitude: 21.16 }), [42.66, 21.16]);
  assert.deepEqual(coordinates("XK"), [42.6675, 21.1662]);
  assert.equal(coordinates("Prishtina, Kosovo").length, 2);
});

test("map clusters rows and aggregates totals", () => {
  const rows = [{ id: "1", values: { country: "XK", revenue: 10 } }, { id: "2", values: { country: "XK", revenue: 20 } }, { id: "3", values: { country: "DE", revenue: 5 } }];
  const data = buildMapData(rows, { sourceColumnId: "country", aggregateColumnId: "revenue" });
  assert.equal(data.markers.length, 2);
  assert.equal(data.markers.find((marker) => marker.count === 2).total, 30);
});

test("route mode connects origin and destination", () => {
  const rows = [{ id: "load-1", values: { pickup: "XK", delivery: "DE", status: "In Transit" } }];
  const data = buildMapData(rows, { sourceColumnId: "pickup", destinationColumnId: "delivery", statusColumnId: "status" });
  assert.equal(data.routes.length, 1);
  assert.equal(data.routes[0].status, "In Transit");
});
