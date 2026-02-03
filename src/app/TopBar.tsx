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
        bgcolor: "#23243a",
        borderBottom: "1.5px solid #35365a",
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
        <span style={{ fontWeight: 600, fontSize: 18, color: '#fff' }}>Welcome back, Valon</span>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton size="small" sx={{ color: '#fff' }}><NotificationsNoneIcon /></IconButton>
        <IconButton size="small" sx={{ color: '#fff' }}><MailOutlineIcon /></IconButton>
        <IconButton size="small" sx={{ color: '#fff' }}><SearchIcon /></IconButton>
        <IconButton size="small" sx={{ color: '#fff' }}><HelpOutlineIcon /></IconButton>
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#4f51c0' }}>VH</Avatar>
      </Box>
    </Box>
  );
}
