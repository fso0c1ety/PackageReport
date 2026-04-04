"use client";

import { Avatar, Box, Typography, alpha, useTheme } from "@mui/material";
import { isElectronRuntime } from "./apiUrl";

export default function DesktopWindowBar() {
  const theme = useTheme();

  if (!isElectronRuntime()) {
    return null;
  }

  return (
    <Box
      sx={{
        height: 46,
        px: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.95)} 0%, ${alpha(
          theme.palette.primary.main,
          0.82,
        )} 45%, ${alpha("#0b1220", 0.96)} 100%)`,
        color: "white",
        WebkitAppRegion: "drag",
        userSelect: "none",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
        <Avatar
          src="/icon.png"
          alt="Smar Manage"
          variant="rounded"
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            boxShadow: `0 8px 20px ${alpha("#000", 0.25)}`,
          }}
        />

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, lineHeight: 1.1, letterSpacing: 0.2 }}
          >
            Smar Manage
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: alpha("#fff", 0.76), lineHeight: 1.1, display: "block" }}
          >
            Desktop workspace
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          px: 1.2,
          py: 0.45,
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.3,
          bgcolor: alpha("#fff", 0.12),
          border: `1px solid ${alpha("#fff", 0.14)}`,
        }}
      >
        Windows App
      </Box>
    </Box>
  );
}
