import React from "react";
import { Box, Typography, IconButton, Avatar, Divider } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import SettingsIcon from "@mui/icons-material/Settings";

export default function Sidebar() {
  return (
    <Box
      sx={{
        width: 220,
        height: "100vh",
        bgcolor: "#fff",
        borderRight: "1.5px solid #e0e4ef",
        display: "flex",
        flexDirection: "column",
        p: 2,
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <img src="/logo.svg" alt="logo" style={{ height: 28, marginRight: 8 }} />
        <Typography variant="h6" fontWeight={800} color="#0073ea">
          monday
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, mt: 2 }}>
        <SidebarItem icon={<HomeIcon />} label="Home" />
        <SidebarItem icon={<WorkspacesIcon />} label="Workspaces" />
        <SidebarItem icon={<SettingsIcon />} label="Settings" />
      </Box>
      <Divider />
      <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: "#0073ea" }}>VH</Avatar>
        <Typography fontWeight={600}>Your Name</Typography>
        <IconButton size="small">
          <AddIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

function SidebarItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1.2,
        px: 1.5,
        borderRadius: 2,
        cursor: "pointer",
        color: "#323338",
        fontWeight: 500,
        fontSize: 16,
        transition: "background 0.2s",
        '&:hover': {
          bgcolor: "#f6f7fb",
        },
      }}
    >
      {icon}
      <span>{label}</span>
    </Box>
  );
}
