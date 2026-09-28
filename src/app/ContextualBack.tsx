"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Box, Button } from "@mui/material";
import { usePathname, useSearchParams } from "next/navigation";

/** A stable in-app escape hatch for secondary authenticated routes. */
export default function ContextualBack() {
  const pathname = (usePathname() || "/").replace(/\/+$/, "") || "/";
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("id") || searchParams.get("workspaceId") || "";

  if (["/home", "/", "/driver-trips"].includes(pathname) || pathname.startsWith("/portal/")) return null;

  let destination = "/home";
  let label = "Back to Home";
  if (pathname === "/workspace") {
    destination = "/home";
    label = "Back to Home";
  } else if (["/main-workspace", "/table", "/board"].includes(pathname)) {
    destination = workspaceId ? `/workspace?id=${encodeURIComponent(workspaceId)}` : "/home";
    label = workspaceId ? "Back to Workspace" : "Back to Home";
  } else if (pathname === "/pricing") {
    destination = "/home";
    label = "Back to Home";
  } else if (pathname.startsWith("/settings")) {
    destination = workspaceId ? `/workspace?id=${encodeURIComponent(workspaceId)}` : "/home";
    label = workspaceId ? "Back to Workspace" : "Back to Home";
  }

  return (
    <Box sx={{ mb: { xs: 1, md: 1.5 }, display: "flex", alignItems: "center" }}>
      <Button
        component="a"
        href={destination}
        type="button"
        size="small"
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}
        aria-label={label}
      >
        {label}
      </Button>
    </Box>
  );
}
