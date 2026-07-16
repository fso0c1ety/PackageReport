const test = require("node:test");
const assert = require("node:assert/strict");
const { buildMapData, coordinates } = require("../server/services/mapViewEngine");

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
