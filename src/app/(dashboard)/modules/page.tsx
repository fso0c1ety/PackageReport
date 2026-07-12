"use client";

import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CircularProgress, Stack, Switch, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
import { useNotification } from "../../NotificationContext";

const MODULES = [
  ["crm", "CRM", "Companies, contacts and sales pipelines"], ["finance", "Finance", "Revenue, expenses, invoices and profit"],
  ["calendar", "Calendar", "Events, meetings and deadlines"], ["inventory", "Inventory", "Products, stock and materials"],
  ["hr", "HR", "Employees, leave and onboarding"], ["fleet", "Fleet", "Trucks, drivers and maintenance"],
  ["logistics", "Logistics", "Loads, carriers and dispatch"], ["ai", "AI", "Nexus Brain and AI tools"],
  ["reports", "Reports", "Dashboards, charts and KPIs"], ["documents", "Documents", "Files and document workflows"],
  ["settings", "Settings", "Workspace configuration"],
] as const;

export default function ModulesPage() {
  const workspaceId = useSearchParams().get("id");
  const { showNotification } = useNotification();
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    authenticatedFetch(getApiUrl(`workspaces/${workspaceId}/modules`), { suppressNativeErrorAlert: true })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setEnabled(Array.isArray(data.modules) ? data.modules : []))
      .catch(() => showNotification("Unable to load workspace modules.", "error"))
      .finally(() => setLoading(false));
  }, [showNotification, workspaceId]);

  const save = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const response = await authenticatedFetch(getApiUrl(`workspaces/${workspaceId}/modules`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modules: enabled }) });
      if (!response.ok) throw new Error();
      window.dispatchEvent(new CustomEvent("workspaceModulesUpdated"));
      showNotification("Workspace modules updated.", "success");
    } catch { showNotification("Unable to save workspace modules.", "error"); }
    finally { setSaving(false); }
  };

  if (!workspaceId) return <Alert severity="info">Select a workspace before managing modules.</Alert>;
  return <Box sx={{ maxWidth: 1050, mx: "auto", p: { xs: 2, md: 4 } }}><Typography variant="h4" fontWeight={900}>Business Modules</Typography><Typography color="text.secondary" mb={3}>Enable only the tools this workspace needs. Your existing boards and data are never deleted.</Typography>{loading ? <CircularProgress /> : <><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 1.5 }}>{MODULES.map(([key, name, description]) => <Card key={key} sx={{ p: 2, borderRadius: 3, bgcolor: "action.hover" }}><Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}><Box><Typography fontWeight={800}>{name}</Typography><Typography variant="body2" color="text.secondary">{description}</Typography></Box><Switch checked={enabled.includes(key)} onChange={(_, checked) => setEnabled((current) => checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))} /></Stack></Card>)}</Box><Button variant="contained" disabled={saving} onClick={save} sx={{ mt: 3, px: 4 }}>{saving ? "Saving..." : "Save modules"}</Button></>}</Box>;
}
