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
  const [portalContext, setPortalContext] = useState<any>(null);
  useEffect(() => {
    authenticatedFetch(getApiUrl(`portal-context${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`), { suppressNativeErrorAlert: true })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setPortalContext(data?.active || null))
      .catch(() => setPortalContext(null));
  }, [workspaceId]);
  const dedicatedPortal = portalContext?.portalType && portalContext.portalType !== "standard";
  const portalBase = portalContext?.landingRoute || `/portal/${String(portalContext?.portalType || "standard").replaceAll("_", "-")}`;
  const iconFor = (item: string) => item.includes("calendar") ? <CalendarMonthRoundedIcon /> : item.includes("document") ? <FolderRoundedIcon /> : item.includes("profile") || item.includes("setting") ? <SettingsRoundedIcon /> : item.includes("trip") || item.includes("delivery") ? <LocalShippingRoundedIcon /> : item.includes("work") || item.includes("record") ? <AssignmentTurnedInRoundedIcon /> : <HomeRoundedIcon />;
  const configuredNavigation = portalContext?.portalConfig?.navigation;
  const portalDestinations = (Array.isArray(configuredNavigation) && configuredNavigation.length
    ? configuredNavigation.filter((item: any) => item.mobile !== false).slice(0, 5)
    : (portalContext?.navigation?.length ? portalContext.navigation : ["home", "my_records", "calendar", "documents", "profile"]).slice(0, 5).map((id: string) => ({ id, label: id.replace(/^my_/, "My ").replaceAll("_", " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase()), route: `${portalBase}?section=${encodeURIComponent(id)}` })))
    .map((item: any) => {
      const route = String(item.route || portalBase);
      const separator = route.includes("?") ? "&" : "?";
      return { label: item.label, path: `${route}${separator}id=${encodeURIComponent(portalContext?.workspaceId || workspaceId || "")}`, icon: iconFor(item.id || item.label) };
    });
  const visibleDestinations = dedicatedPortal ? portalDestinations : destinations;
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
