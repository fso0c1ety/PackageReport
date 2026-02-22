"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        bgcolor: "#23243a",
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
        }}
      >
        <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />

        <Box
          component="main"
          sx={{
            flex: 1,
            bgcolor: "#23243a",
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
