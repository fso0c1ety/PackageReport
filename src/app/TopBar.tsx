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
        height: { xs: 40, sm: 64 },
        bgcolor: "#23243a",
        borderBottom: "1.5px solid #35365a",
        display: "flex",
        alignItems: "center",
        px: { xs: 1, sm: 3 },
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ fontWeight: 600, fontSize: 'clamp(13px, 4vw, 20px)', color: '#fff' }}>Welcome back, Valon</span>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2.5 } }}>
        <IconButton size="medium" sx={{ color: '#fff', p: { xs: 0.7, sm: 1.2 } }}><NotificationsNoneIcon sx={{ fontSize: { xs: 22, sm: 26 } }} /></IconButton>
        <IconButton size="medium" sx={{ color: '#fff', p: { xs: 0.7, sm: 1.2 } }}><MailOutlineIcon sx={{ fontSize: { xs: 22, sm: 26 } }} /></IconButton>
        <IconButton size="medium" sx={{ color: '#fff', p: { xs: 0.7, sm: 1.2 } }}><SearchIcon sx={{ fontSize: { xs: 22, sm: 26 } }} /></IconButton>
        <IconButton size="medium" sx={{ color: '#fff', p: { xs: 0.7, sm: 1.2 } }}><HelpOutlineIcon sx={{ fontSize: { xs: 22, sm: 26 } }} /></IconButton>
        <Avatar sx={{ width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, bgcolor: '#4f51c0', fontSize: { xs: 16, sm: 18 } }}>VH</Avatar>
      </Box>
    </Box>
  );
}
