"use client";

import { Box, Typography, alpha, useTheme } from "@mui/material";
import { isElectronRuntime } from "./apiUrl";

export default function DesktopWindowBar() {
  const theme = useTheme();

  if (!isElectronRuntime()) {
    return null;
  }

  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        height: 48,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: isDark ? "#0F172A" : "#F8FAFC",
        WebkitAppRegion: "drag",
        userSelect: "none",
        position: "relative",
        borderBottom: `1px solid ${isDark ? alpha("#ffffff", 0.05) : alpha("#000000", 0.05)}`,
        zIndex: 1200,
      }}
    >
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          bgcolor: isDark ? alpha("#ffffff", 0.2) : alpha("#000000", 0.15),
          mr: 1.5,
          boxShadow: `inset 0 1px 0 ${alpha("#ffffff", isDark ? 0.05 : 0.2)}`,
        }}
      />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          color: isDark ? alpha("#ffffff", 0.8) : alpha("#000000", 0.65),
          letterSpacing: 0.3,
        }}
      >
        Smar Manage
      </Typography>
    </Box>
  );
}
