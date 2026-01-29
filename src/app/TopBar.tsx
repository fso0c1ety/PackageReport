import React from "react";
import { Box, Avatar, IconButton } from "@mui/material";
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export default function TopBar() {
  return (
    <Box
      sx={{
        width: "100%",
        height: 64,
        bgcolor: "#fff",
        borderBottom: "1.5px solid #e0e4ef",
        display: "flex",
        alignItems: "center",
        px: 3,
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 18, color: '#323338' }}>Welcome back, Valon</span>
      </Box>
      {/* Title is shown in the sidebar or the mobile header in layout.tsx */}
      <Box sx={{ flex: 1 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton size="small"><NotificationsNoneIcon /></IconButton>
        <IconButton size="small"><MailOutlineIcon /></IconButton>
        <IconButton size="small"><SearchIcon /></IconButton>
        <IconButton size="small"><HelpOutlineIcon /></IconButton>
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#0073ea' }}>VH</Avatar>
      </Box>
    </Box>
  );
}
