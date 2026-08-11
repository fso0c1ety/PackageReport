"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
import type { PortalConfig, PortalMembershipContext } from "../../../portal-engine/types";

type Props = { membership: PortalMembershipContext & { workspaceName?: string }; config?: PortalConfig | null };

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function PortalShell({ membership, config }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const navigation = config?.navigation || (membership.navigation || []).map((id) => ({ id, label: label(id), route: `${membership.landingRoute || "/dashboard"}?section=${id}` }));
  useEffect(() => {
    if (!config || config.portalType === "driver" || !membership.workspaceId) return;
    const query = new URLSearchParams({ workspaceId: membership.workspaceId, portalType: config.portalType });
    authenticatedFetch(getApiUrl(`professional-portal?${query.toString()}`), { suppressNativeErrorAlert: true })
      .then(async (response) => { const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.error || "Unable to load portal data"); return body; })
      .then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load portal data"));
  }, [config, membership.workspaceId]);
  const section = searchParams.get("section") || "home";
  const displayedEntities = useMemo(() => {
    const all = data?.entities || [];
    if (section === "home") return (config?.widgets || []).map((widget) => all.find((entity: any) => entity.entity === widget.entity)).filter(Boolean);
    const target = section.replaceAll("_", "").replace(/^my/, "").toLowerCase();
    return all.filter((entity: any) => String(entity.entity).replaceAll(" ", "").replace(/^my/i, "").toLowerCase().includes(target) || target.includes(String(entity.entity).replaceAll(" ", "").toLowerCase()));
  }, [config?.widgets, data?.entities, section]);
  return <Stack spacing={3} sx={{ width: "100%", maxWidth: 1180, mx: "auto", px: { xs: 2, md: 3 }, pb: { xs: 10, md: 4 } }}>
    <Box>
      <Typography variant="overline" color="primary" fontWeight={900}>{config?.name || `${label(membership.portalType || "standard")} Portal`}</Typography>
      <Typography variant="h4" fontWeight={900}>{membership.workspaceName}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {(membership.jobRoles || []).map((role) => <Chip key={role} label={label(role)} size="small" color={role === membership.primaryJobRole ? "primary" : "default"} />)}
      </Stack>
    </Box>
    {!config && <Alert severity="info">This portal is using the compatibility layout until its industry configuration is activated.</Alert>}
    {config && config.portalType !== "driver" && error && <Alert severity="error">{error}</Alert>}
    {config && config.portalType !== "driver" && !data && !error && <Box sx={{ minHeight: 120, display:"grid", placeItems:"center" }}><CircularProgress size={28} /></Box>}
    {data && <Box sx={{ display:"grid",gridTemplateColumns:{xs:"1fr",sm:"repeat(2,1fr)",lg:"repeat(3,1fr)"},gap:2 }}>
      {displayedEntities.map((entity:any) => { const widget = config?.widgets.find((item) => item.entity === entity.entity); const records = entity?.records || []; return <Card key={entity.entity} variant="outlined" sx={{borderRadius:3,minWidth:0}}><CardContent><Stack direction="row" justifyContent="space-between" gap={1}><Typography fontWeight={900}>{widget?.title || entity.name}</Typography><Chip size="small" label={records.length} /></Stack><Divider sx={{my:1.5}} />{records.length === 0 ? <Typography variant="body2" color="text.secondary">No authorized records available.</Typography> : <Stack spacing={1.25}>{records.slice(0,section === "home" ? 5 : 50).map((record:any) => <Box key={record.id} sx={{p:1.25,borderRadius:2,bgcolor:"action.hover",overflow:"hidden"}}>{Object.entries(record.fields).slice(0,section === "home" ? 4 : 12).map(([key,value]) => <Stack key={key} direction="row" gap={1} justifyContent="space-between"><Typography variant="caption" color="text.secondary">{key}</Typography><Typography variant="caption" fontWeight={700} noWrap sx={{maxWidth:"60%"}}>{typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}</Typography></Stack>)}</Box>)}</Stack>}</CardContent></Card> })}
      {displayedEntities.length === 0 && <Alert severity="info">This section has no authorized records for your account.</Alert>}
    </Box>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)" }, gap: 2 }}>
      {navigation.map((item) => {
        const separator = item.route.includes("?") ? "&" : "?";
        const route = membership.workspaceId ? `${item.route}${separator}id=${encodeURIComponent(membership.workspaceId)}` : item.route;
        return <Card key={item.id} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardActionArea onClick={() => router.push(route)} sx={{ height: "100%" }}>
            <CardContent><Typography fontWeight={850}>{item.label}</Typography><Typography variant="body2" color="text.secondary">Open authorized {item.label.toLowerCase()}</Typography></CardContent>
          </CardActionArea>
        </Card>;
      })}
    </Box>
  </Stack>;
}
