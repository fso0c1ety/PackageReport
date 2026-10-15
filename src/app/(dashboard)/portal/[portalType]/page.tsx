"use client";

import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { authenticatedFetch, getApiUrl } from "../../../apiUrl";
import PortalShell from "../../../components/portal/PortalShell";
import { parsePortalContextResponse } from "../../../portalContextResponse";
import { useParams, usePathname } from "next/navigation";

export default function DedicatedPortalPage() {
  const params = useParams<{ portalType: string }>();
  const pathname = usePathname();
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const portalType = params?.portalType || pathname.split("/").filter(Boolean).at(-1) || "";
  useEffect(() => {
    if (!portalType) return;
    void (async () => {
      const requested = portalType.replaceAll("-", "_");
      const query = new URLSearchParams({ portalType: requested });
      let response;
      try {
        response = await authenticatedFetch(getApiUrl(`portal-context?${query.toString()}`), { suppressNativeErrorAlert: true });
      } catch {
        return setError("Nuk mund të lidhemi me portalin. Kontrolloni lidhjen dhe provoni përsëri.");
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) return setError(data?.error || "Unable to load portal");
      const result = parsePortalContextResponse(data, requested);
      if (result.error) return setError(result.error);
      setContext(result.membership);
    })();
  }, [portalType, reload]);

  if (error) return <Stack spacing={2} sx={{ maxWidth: 640, mx: "auto", mt: 6 }}><Box sx={{ p: 2, borderRadius: 2, bgcolor: "warning.light", color: "warning.contrastText" }}><Typography>{error}</Typography></Box><Stack direction="row" spacing={1}><Button variant="contained" onClick={() => { setError(""); setContext(null); setReload((value) => value + 1); }}>Provo përsëri</Button><Button variant="outlined" href="/home">Kthehu te Workspace</Button></Stack></Stack>;
  if (!context) return <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  return <PortalShell membership={context} config={context.portalConfig} />;
}
