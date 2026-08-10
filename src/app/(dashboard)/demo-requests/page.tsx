"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";

type DemoRequest = { id: string; name: string; company_name: string; email: string; business_type: string; team_size?: string; recommended_template?: string; status: string; created_at: string };
const STATUSES = ["new", "contacted", "qualified", "demo_preparing", "demo_ready", "demo_sent", "demo_completed", "converted", "not_interested"];

export default function DemoRequestsPage() {
  const [requests, setRequests] = useState<DemoRequest[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); const response = await fetch("/api/internal/demo-requests"); const data = await response.json(); if (!response.ok) setError(data.error || "Unable to load demo requests"); else setRequests(data.requests || []); setLoading(false); };
  useEffect(() => { void load(); }, []);
  const updateStatus = async (id: string, status: string) => { const response = await fetch("/api/internal/demo-requests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) }); if (response.ok) setRequests((current) => current.map((item) => item.id === id ? { ...item, status } : item)); else setError("Unable to update the request."); };
  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1500, mx: "auto" }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}><Box><Typography variant="h4" fontWeight={900}>Demo Requests</Typography><Typography color="text.secondary">Platform-authorized demo administration.</Typography></Box><Button onClick={load}>Refresh</Button></Stack>{error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}{loading ? <CircularProgress sx={{ mt: 4 }} /> : <Stack spacing={1.5} mt={3}>{requests.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 2.5 }}><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr 1fr 1fr auto" }, gap: 2, alignItems: "center" }}><Box><Typography fontWeight={900}>{item.company_name}</Typography><Typography variant="body2">{item.name} · {item.email}</Typography></Box><Typography>{item.business_type}</Typography><Typography>{item.team_size || "—"}</Typography><Chip label={item.recommended_template || "No recommendation"} /><Select size="small" value={item.status} onChange={(event) => updateStatus(item.id, String(event.target.value))}>{STATUSES.map((status) => <MenuItem key={status} value={status}>{status.replaceAll("_", " ")}</MenuItem>)}</Select></Box></Paper>)}</Stack>}</Box>;
}
