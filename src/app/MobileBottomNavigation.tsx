"use client";

import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { usePathname, useRouter } from "next/navigation";
import { navigateToAppRoute } from "./apiUrl";

const destinations = [
  { label: "Home", path: "/home", icon: <HomeRoundedIcon /> },
  { label: "My Work", path: "/my-work", icon: <AssignmentTurnedInRoundedIcon /> },
  { label: "Calendar", path: "/calendar", icon: <CalendarMonthRoundedIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsRoundedIcon /> },
];

export default function MobileBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const current = destinations.find((item) => pathname.startsWith(item.path))?.path || false;
  return (
    <Paper elevation={12} sx={{ display: { xs: "block", md: "none" }, position: "fixed", zIndex: 1300, left: 0, right: 0, bottom: 0, pb: "env(safe-area-inset-bottom)", borderRadius: 0, borderTop: "1px solid", borderColor: "divider" }}>
      <BottomNavigation
        showLabels
        value={current}
        onChange={(_, value) => navigateToAppRoute(value, router)}
        sx={{ height: 62, bgcolor: "background.paper", "& .MuiBottomNavigationAction-root": { minWidth: 56, px: 0.5 }, "& .MuiBottomNavigationAction-label": { fontSize: "0.68rem", fontWeight: 700 } }}
      >
        {destinations.map((item) => <BottomNavigationAction key={item.path} label={item.label} value={item.path} icon={item.icon} />)}
      </BottomNavigation>
    </Paper>
  );
}
