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
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: "#0073ea" }}>VH</Avatar>
      </Box>
    </Box>
  );
}
