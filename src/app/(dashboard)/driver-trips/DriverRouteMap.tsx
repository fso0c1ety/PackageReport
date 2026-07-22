"use client";
import React from "react";
import { Box } from "@mui/material";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";

export default function DriverRouteMap({ pickup, delivery, focus }: { pickup?: [number, number] | null; delivery?: [number, number] | null; focus?: "pickup" | "delivery" | null }) {
  const elementRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const layersRef = React.useRef<Array<Marker | Polyline>>([]);
  React.useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      if (cancelled || !elementRef.current) return;
      if (!mapRef.current) {
        mapRef.current = leaflet.map(elementRef.current, { zoomControl: true }).setView([42.3, 20.8], 6);
        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(mapRef.current);
      }
      layersRef.current.forEach((layer) => layer.remove());
      layersRef.current = [];
      const markerIcon = (label: string, color: string) => leaflet.divIcon({ className: "driver-route-marker", html: `<span style="background:${color}">${label}</span>`, iconSize: [38, 38], iconAnchor: [19, 19] });
      if (pickup) layersRef.current.push(leaflet.marker(pickup, { icon: markerIcon("P", "#16a34a") }).addTo(mapRef.current).bindPopup("Pickup"));
      if (delivery) layersRef.current.push(leaflet.marker(delivery, { icon: markerIcon("D", "#4f46e5") }).addTo(mapRef.current).bindPopup("Destination"));
      if (pickup && delivery) layersRef.current.push(leaflet.polyline([pickup, delivery], { color: "#4f46e5", weight: 5, opacity: 0.8, dashArray: "9 7" }).addTo(mapRef.current));
      const focused = focus === "delivery" ? delivery : focus === "pickup" ? pickup : null;
      if (focused) mapRef.current.setView(focused, 13);
      else if (pickup && delivery) mapRef.current.fitBounds(leaflet.latLngBounds([pickup, delivery]), { padding: [50, 50] });
      else if (pickup || delivery) mapRef.current.setView((pickup || delivery)!, 12);
      window.setTimeout(() => mapRef.current?.invalidateSize(), 0);
    });
    return () => { cancelled = true; };
  }, [pickup, delivery, focus]);
  React.useEffect(() => () => { layersRef.current = []; mapRef.current?.remove(); mapRef.current = null; }, []);
  return <Box ref={elementRef} sx={{ height: { xs: 360, md: 520 }, width: "100%", bgcolor: "#dbeafe", "& .driver-route-marker": { bgcolor: "transparent", border: 0 }, "& .driver-route-marker span": { width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: "50%", color: "white", fontWeight: 900, border: "3px solid white", boxShadow: "0 5px 15px rgba(15,23,42,.35)" } }} />;
}
