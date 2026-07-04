"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useRouter } from "next/navigation";
import { authenticatedFetch, getApiUrl, navigateToAppRoute } from "./apiUrl";

interface BillingStatus {
  plan: string;
  status: string;
  writable: boolean;
  trial_ends_at?: string | null;
  purge_at?: string | null;
  current_period_end?: string | null;
}

export default function SubscriptionBanner() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    authenticatedFetch(getApiUrl("billing/status"))
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data && setBilling(data))
      .catch(() => {});
  }, []);

  const daysUntilDeletion = useMemo(() => {
    if (!billing?.purge_at) return 30;
    return Math.max(0, Math.ceil((new Date(billing.purge_at).getTime() - Date.now()) / 86400000));
  }, [billing]);

  const daysUntilRenewal = useMemo(() => {
    if (!billing?.current_period_end) return null;
    return Math.max(0, Math.ceil(
      (new Date(billing.current_period_end).getTime() - Date.now()) / 86400000
    ));
  }, [billing]);

  const daysUntilTrialEnd = useMemo(() => {
    if (!billing?.trial_ends_at) return null;
    return Math.max(0, Math.ceil(
      (new Date(billing.trial_ends_at).getTime() - Date.now()) / 86400000
    ));
  }, [billing]);

  if (!billing) return null;

  const expired = !billing.writable;
  const isTrial = billing.plan === "trial" && billing.status === "trialing";
  const isPaid = billing.plan !== "trial" && billing.status === "active";

  if (!expired && !isTrial && !isPaid) return null;

  const message = expired
    ? `Your subscription has expired. Boards are view-only and will be deleted in ${daysUntilDeletion} day${daysUntilDeletion === 1 ? "" : "s"}.`
    : isTrial
      ? `You are using the Free Trial${daysUntilTrialEnd === null ? "" : ` — ${daysUntilTrialEnd} day${daysUntilTrialEnd === 1 ? "" : "s"} remaining`}. Choose a plan before it ends to keep your workspace active.`
      : daysUntilRenewal === null
        ? `Your ${billing.plan} plan is active. The next payment date is being finalized.`
        : `Your ${billing.plan} plan renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}. Keep your payment method active to avoid workspace interruption.`;

  return (
    <Box
      role="alert"
      sx={{
        minHeight: 34,
        px: 2,
        py: 0.5,
        bgcolor: expired ? "#dc354f" : isTrial ? "#d97706" : "#2563eb",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        flexWrap: "wrap",
        flexShrink: 0,
      }}
    >
      <WarningAmberIcon sx={{ fontSize: 16 }} />
      <Typography sx={{ fontSize: 13, fontWeight: 600, letterSpacing: 0 }}>
        {message}
      </Typography>
      <Button
        size="small"
        onClick={() => navigateToAppRoute("/pricing", router)}
        sx={{
          color: "#fff",
          p: 0,
          minWidth: 0,
          fontSize: 13,
          fontWeight: 800,
          textTransform: "none",
          textDecoration: "underline",
        }}
      >
        {expired || isTrial ? "Choose a plan" : "Manage billing"}
      </Button>
    </Box>
  );
}
