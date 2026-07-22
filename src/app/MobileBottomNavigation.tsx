"use client";

import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch, getApiUrl, navigateToAppRoute } from "./apiUrl";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

const destinations = [
  { label: "Home", path: "/home", icon: <HomeRoundedIcon /> },
  { label: "My Work", path: "/my-work", icon: <AssignmentTurnedInRoundedIcon /> },
  { label: "Calendar", path: "/calendar", icon: <CalendarMonthRoundedIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsRoundedIcon /> },
];

export default function MobileBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const workspaceId = useSearchParams().get("id");
  const [driverPortal, setDriverPortal] = useState(false);
  useEffect(() => {
    if (!workspaceId) { setDriverPortal(false); return; }
    authenticatedFetch(getApiUrl(`logistics/context?workspaceId=${encodeURIComponent(workspaceId)}`), { suppressNativeErrorAlert: true })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setDriverPortal(Boolean(data?.driver)))
      .catch(() => setDriverPortal(false));
  }, [workspaceId]);
  const driverDestinations = [
    { label: "Home", path: `/driver-trips?id=${workspaceId}`, icon: <HomeRoundedIcon /> },
    { label: "My Trips", path: `/driver-trips?id=${workspaceId}`, icon: <LocalShippingRoundedIcon /> },
    { label: "Calendar", path: `/calendar?id=${workspaceId}`, icon: <CalendarMonthRoundedIcon /> },
    { label: "Documents", path: `/driver-trips?id=${workspaceId}&section=documents`, icon: <FolderRoundedIcon /> },
    { label: "Profile", path: `/settings?tab=profile&id=${workspaceId}`, icon: <SettingsRoundedIcon /> },
  ];
  const visibleDestinations = driverPortal ? driverDestinations : destinations;
  const current = visibleDestinations.find((item) => `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`.startsWith(item.path))?.path || false;
  return (
    <Paper data-mobile-bottom-navigation="true" elevation={12} sx={{ display: { xs: "block", md: "none" }, position: "fixed", zIndex: 1300, left: 0, right: 0, bottom: 0, pb: "env(safe-area-inset-bottom)", borderRadius: 0, borderTop: "1px solid", borderColor: "divider" }}>
      <BottomNavigation
        showLabels
        value={current}
        onChange={(_, value) => navigateToAppRoute(value, router)}
        sx={{ height: 62, bgcolor: "background.paper", "& .MuiBottomNavigationAction-root": { minWidth: 56, px: 0.5 }, "& .MuiBottomNavigationAction-label": { fontSize: "0.68rem", fontWeight: 700 } }}
      >
        {visibleDestinations.map((item) => <BottomNavigationAction key={`${item.label}-${item.path}`} label={item.label} value={item.path} icon={item.icon} />)}
      </BottomNavigation>
    </Paper>
  );
}
