const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const addressFields = require("../src/shared/internationalAddress.cjs");
const columns = require("../server/services/columnRegistry");

const addresses = [
  "Yakuplu Mah. Hürriyet Bulvarı 59. Sok No:32/A Kat:3, Yakuplu, 34524 Beylikdüzü/İstanbul, Türkiye",
  "Rr. Garibaldi, Nr. 12/4, 10000 Prishtinë, Kosovë",
  "Müllerstraße 18 (Hinterhaus), 3. OG, 13353 Berlin, Deutschland",
  "Bulevardi Dëshmorët e Kombit, Apt. #5-B, Tiranë 1001, Shqipëri",
  "Rue de l'Université 123, Bâtiment C / Unité 32-A, 75007 Paris, France",
];

test("international postal addresses preserve Unicode and punctuation exactly", () => {
  for (const address of addresses) {
    assert.deepEqual(addressFields.validateInternationalAddress(address), { valid: true, error: null });
    assert.equal(addressFields.normalizeInternationalAddress(address), address);
    const normalized = columns.normalizeCellValue("Location", address);
    assert.equal(normalized.address, address);
    assert.equal(normalized.label, address);
    assert.equal(columns.toExportValue("Location", normalized), address);
  }
});

test("partial address search works with structured Unicode locations", () => {
  const location = columns.normalizeCellValue("Location", addresses[0]);
  assert.equal(columns.matchesFilter("Location", location, "contains", "Hürriyet Bulvarı"), true);
  assert.equal(columns.matchesFilter("Location", location, "contains", "34524 Beylikdüzü"), true);
  assert.match(addressFields.internationalAddressSearchText(location), /türkiye/);
});

test("structured locations keep the postal address separate from map URLs", () => {
  const address = addresses[1];
  const normalized = addressFields.normalizeInternationalAddress({ address, label: address, mapUrl: "https://maps.example/route" });
  assert.equal(normalized.address, address);
  assert.equal(normalized.mapUrl, "https://maps.example/route");
  assert.equal(addressFields.validateInternationalAddress("https://www.google.com/search?q=Prishtina").valid, false);
});

test("address validation allows long international text but enforces a safe database payload bound", () => {
  const longAddress = `${"Çınar Mahallesi, ".repeat(80)}İzmir 35000, Türkiye`;
  assert.equal(longAddress.length > 1000, true);
  assert.equal(addressFields.validateInternationalAddress(longAddress).valid, true);
  assert.equal(addressFields.validateInternationalAddress("A".repeat(addressFields.MAX_ADDRESS_LENGTH + 1)).valid, false);
});

test("API, Excel, geocoder and UI contracts preserve complete addresses", () => {
  const root = path.join(__dirname, "..");
  const cellRoute = fs.readFileSync(path.join(root, "src/app/api/tables/[tableId]/tasks/[taskId]/cells/[columnId]/route.js"), "utf8");
  const taskRoute = fs.readFileSync(path.join(root, "src/app/api/tables/[tableId]/tasks/route.js"), "utf8");
  const excelRoute = fs.readFileSync(path.join(root, "src/app/api/tables/import-excel/route.js"), "utf8");
  const map = fs.readFileSync(path.join(root, "src/app/(dashboard)/driver-trips/DriverRouteMap.tsx"), "utf8");
  const board = fs.readFileSync(path.join(root, "src/app/TableBoard.tsx"), "utf8");
  for (const source of [cellRoute, taskRoute, excelRoute]) assert.match(source, /validateInternationalAddress/);
  assert.match(excelRoute, /addressFields\.isAddressColumn\(column\) \? String\(rawValue\)/);
  assert.match(map, /\[original,spanishStreet,turkishStreet/);
  assert.match(board, /overflowWrap: 'anywhere'/);
  assert.doesNotMatch(cellRoute + taskRoute, /\[\^a-zA-Z0-9/);
});
