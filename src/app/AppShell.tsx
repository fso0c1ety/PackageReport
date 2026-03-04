"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material"; // Added
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        flexDirection: { xs: "column", md: "row" },
        overflowX: "clip",
      }}
    >
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* RIGHT CONTENT */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: 0,
          minWidth: 0,
          bgcolor: theme.palette.background.default, // ensure background coverage
        }}
      >
        <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />

        <Box
          component="main"
          sx={{
            flex: 1,
            // bgcolor: theme.palette.background.default, // redundant but harmless
            width: 0,
            minWidth: 0,
            overflowX: "clip",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
