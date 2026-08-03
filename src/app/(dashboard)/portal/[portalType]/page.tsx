"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { authenticatedFetch, getApiUrl } from "../../../apiUrl";

export default function DedicatedPortalPage({ params }: { params: Promise<{ portalType: string }> }) {
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.resolve(params).then(async ({ portalType }) => {
      const response = await authenticatedFetch(getApiUrl("portal-context"));
      const data = await response.json().catch(() => null);
      if (!response.ok) return setError(data?.error || "Unable to load portal");
      const requested = portalType.replaceAll("-", "_");
      const membership = data.memberships?.find((item: any) => item.portalType === requested) || data.active;
      if (!membership || membership.portalType !== requested) return setError("This portal is not assigned to your account.");
      setContext(membership);
    });
  }, [params]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!context) return <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  return <Stack spacing={3} sx={{ maxWidth: 1100, mx: "auto" }}>
    <Box><Typography variant="overline" color="primary" fontWeight={900}>Dedicated portal</Typography><Typography variant="h4" fontWeight={900}>{context.portalType.replaceAll("_", " ")}</Typography><Typography color="text.secondary">{context.workspaceName}</Typography></Box>
    <Card variant="outlined" sx={{ borderRadius: 4 }}><CardContent><Typography variant="h6" fontWeight={850}>Your authorized workspace</Typography><Typography sx={{ mt: 1 }}>Only records matching <strong>{context.recordAccess?.scope?.replaceAll("_", " ")}</strong> are returned by the server.</Typography><Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>{context.jobRoles?.map((role: string) => <Chip key={role} label={role.replaceAll("_", " ")} color="primary" />)}</Stack></CardContent></Card>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)" }, gap: 2 }}>{(context.navigation?.length ? context.navigation : ["home", "my_records", "calendar", "documents", "profile"]).map((item: string) => <Card key={item} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Typography fontWeight={800}>{item.replaceAll("_", " ")}</Typography><Typography variant="body2" color="text.secondary">Available for this portal profile</Typography></CardContent></Card>)}</Box>
  </Stack>;
}
