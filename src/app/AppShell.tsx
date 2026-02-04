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
      {/* MOBILE HEADER */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          alignItems: "center",
          p: 1,
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <IconButton
          onClick={() => setMobileSidebarOpen(true)}
          sx={{ color: "#fff" }}
        >
          <MenuIcon />
        </IconButton>

        <span style={{ fontWeight: 800, color: "#4f51c0", fontSize: 20 }}>
          SmartManage
        </span>
      </Box>

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
        <TopBar />

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
