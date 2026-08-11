"use client";

import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { authenticatedFetch, getApiUrl } from "../../../apiUrl";
import PortalShell from "../../../components/portal/PortalShell";
import { useParams, usePathname } from "next/navigation";

export default function DedicatedPortalPage() {
  const params = useParams<{ portalType: string }>();
  const pathname = usePathname();
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState("");
  const portalType = params?.portalType || pathname.split("/").filter(Boolean).at(-1) || "";
  useEffect(() => {
    if (!portalType) return;
    void (async () => {
      const requested = portalType.replaceAll("-", "_");
      const query = new URLSearchParams({ portalType: requested });
      const response = await authenticatedFetch(getApiUrl(`portal-context?${query.toString()}`));
      const data = await response.json().catch(() => null);
      if (!response.ok) return setError(data?.error || "Unable to load portal");
      const membership = data.active;
      if (!membership || membership.portalType !== requested) return setError("This portal is not assigned to your account.");
      setContext(membership);
    })();
  }, [portalType]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!context) return <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  return <PortalShell membership={context} config={context.portalConfig} />;
}
