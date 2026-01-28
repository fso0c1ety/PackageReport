import React from "react";
import { Box, Typography, Avatar, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h5" fontWeight={700} color="#323338">
          Main table
        </Typography>
        <IconButton size="small" sx={{ ml: 1 }}>
          <AddIcon />
        </IconButton>
      </Box>
      {/* Centered SmartManage only on desktop, not mobile */}
      <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', position: 'absolute', left: 0, right: 0, pointerEvents: 'none' }}>
        <Typography
          variant="h6"
          fontWeight={800}
          color="#0073ea"
          sx={{ textAlign: 'center', width: '100%', pointerEvents: 'auto' }}
        >
          SmartManage
        </Typography>
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: "#0073ea" }}>VH</Avatar>
      </Box>
    </Box>
  );
}
