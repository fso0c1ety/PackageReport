"use client";

import React from "react";
import { Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { Column, Row } from "../../../types";
import "leaflet/dist/leaflet.css";

const countryCenters: Record<string, [number, number]> = {
  XK: [42.6675, 21.1662], AL: [41.1533, 20.1683], MK: [41.6086, 21.7453],
  ME: [42.7087, 19.3744], RS: [44.0165, 21.0059], DE: [51.1657, 10.4515],
  TR: [38.9637, 35.2433], IT: [41.8719, 12.5674], ES: [40.4637, -3.7492], FR: [46.2276, 2.2137],
};

function point(value: unknown): [number, number] | null {
  if (!value) return null;
  if (typeof value === "object") {
    const location = value as Record<string, unknown>;
    const lat = Number(location.latitude ?? location.lat);
    const lng = Number(location.longitude ?? location.lng ?? location.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return countryCenters[String(location.countryCode ?? "").toUpperCase()] ?? null;
  }
  return countryCenters[String(value).trim().toUpperCase()] ?? null;
}

export default function MapBoardView({ rows, columns, onOpenRow }: { rows: Row[]; columns: Column[]; onOpenRow: (row: Row) => void }) {
  const locationColumns = React.useMemo(() => columns.filter((column) => column.type === "Location" || column.type === "Country"), [columns]);
  const [source, setSource] = React.useState(locationColumns[0]?.id ?? "");
  const [selected, setSelected] = React.useState<Row[]>([]);
  const mapElementRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const markerRefs = React.useRef<LeafletMarker[]>([]);

  React.useEffect(() => {
    if (!locationColumns.some((column) => column.id === source)) setSource(locationColumns[0]?.id ?? "");
  }, [locationColumns, source]);

  const markers = React.useMemo(() => {
    const grouped = new Map<string, { point: [number, number]; rows: Row[] }>();
    for (const row of rows) {
      const coordinates = point(row.values?.[source]);
      if (!coordinates) continue;
      const key = `${coordinates[0].toFixed(4)}:${coordinates[1].toFixed(4)}`;
      const group = grouped.get(key) ?? { point: coordinates, rows: [] };
      group.rows.push(row);
      grouped.set(key, group);
    }
    return [...grouped.values()];
  }, [rows, source]);

  React.useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      if (cancelled || !mapElementRef.current) return;
      if (!mapRef.current) {
        mapRef.current = leaflet.map(mapElementRef.current, { zoomControl: true, attributionControl: true }).setView([42.6675, 21.1662], 7);
        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = markers.map((group) => {
        const icon = leaflet.divIcon({
          className: "smart-manage-map-marker",
          html: `<span>${group.rows.length}</span>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });
        const marker = leaflet.marker(group.point, { icon }).addTo(mapRef.current!);
        marker.on("click", () => setSelected(group.rows));
        return marker;
      });
      if (markers.length) mapRef.current.fitBounds(leaflet.latLngBounds(markers.map((marker) => marker.point)), { padding: [55, 55], maxZoom: 7 });
      setTimeout(() => mapRef.current?.invalidateSize(), 0);
    });
    return () => { cancelled = true; };
  }, [markers]);

  React.useEffect(() => () => {
    markerRefs.current = [];
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  if (!locationColumns.length) return <Paper sx={{ mt: 4, p: 5, textAlign: "center", borderRadius: 4 }}><MapIcon sx={{ fontSize: 54, color: "primary.main", mb: 1 }} /><Typography variant="h5" fontWeight={900}>Map View</Typography><Typography color="text.secondary">Add a Location or Country column to place rows on the map.</Typography></Paper>;

  return <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", lg: selected.length ? "1fr 320px" : "1fr" }, gap: 2 }}>
    <Paper sx={{ p: 2, borderRadius: 4, overflow: "hidden" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} mb={2}>
        <Box><Typography variant="h5" fontWeight={900}>Map View</Typography><Typography color="text.secondary" fontSize={13}>{markers.length} marker clusters · {rows.length} rows</Typography></Box>
        <TextField select size="small" label="Location source" value={source} onChange={(event) => setSource(event.target.value)} sx={{ minWidth: 220 }}>{locationColumns.map((column) => <MenuItem key={column.id} value={column.id}>{column.name}</MenuItem>)}</TextField>
      </Stack>
      <Box ref={mapElementRef} sx={{ height: { xs: 420, md: 560 }, borderRadius: 3, overflow: "hidden", bgcolor: "#dbeafe", "& .leaflet-control-attribution": { fontSize: 10 }, "& .smart-manage-map-marker": { bgcolor: "transparent", border: 0 }, "& .smart-manage-map-marker span": { width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#5b5df0", color: "#fff", fontWeight: 900, border: "3px solid #fff", boxShadow: "0 6px 18px rgba(49,46,129,.5)" } }} />
    </Paper>
    {selected.length > 0 && <Paper sx={{ p: 2, borderRadius: 4, maxHeight: 620, overflow: "auto" }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography fontWeight={900}>{selected.length} matching rows</Typography><Button size="small" onClick={() => setSelected([])}>Close</Button></Stack><Stack gap={1.2} mt={2}>{selected.map((row) => <Paper variant="outlined" key={row.id} onClick={() => onOpenRow(row)} sx={{ p: 1.5, cursor: "pointer", borderRadius: 2, "&:hover": { borderColor: "primary.main" } }}><Typography fontWeight={800}>{String(row.values?.[columns[0]?.id] || "Untitled row")}</Typography><Stack direction="row" gap={0.5} mt={0.5}>{columns.filter((column) => column.type === "Status").slice(0, 1).map((column) => <Chip key={column.id} size="small" label={String(row.values?.[column.id] || "No status")} />)}</Stack></Paper>)}</Stack></Paper>}
  </Box>;
}
