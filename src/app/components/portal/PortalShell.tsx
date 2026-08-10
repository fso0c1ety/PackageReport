"use client";

import { Alert, Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import type { PortalConfig, PortalMembershipContext } from "../../../portal-engine/types";

type Props = { membership: PortalMembershipContext & { workspaceName?: string }; config?: PortalConfig | null };

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function PortalShell({ membership, config }: Props) {
  const router = useRouter();
  const navigation = config?.navigation || (membership.navigation || []).map((id) => ({ id, label: label(id), route: `${membership.landingRoute || "/dashboard"}?section=${id}` }));
  return <Stack spacing={3} sx={{ width: "100%", maxWidth: 1180, mx: "auto", px: { xs: 2, md: 3 }, pb: { xs: 10, md: 4 } }}>
    <Box>
      <Typography variant="overline" color="primary" fontWeight={900}>{config?.name || `${label(membership.portalType || "standard")} Portal`}</Typography>
      <Typography variant="h4" fontWeight={900}>{membership.workspaceName}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {(membership.jobRoles || []).map((role) => <Chip key={role} label={label(role)} size="small" color={role === membership.primaryJobRole ? "primary" : "default"} />)}
      </Stack>
    </Box>
    {!config && <Alert severity="info">This portal is using the compatibility layout until its industry configuration is activated.</Alert>}
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
