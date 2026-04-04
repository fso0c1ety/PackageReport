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
        px: { xs: 1, sm: 1.5 },
        pt: 1.1,
        pb: 0.75,
        bgcolor: "transparent",
        userSelect: "none",
      }}
    >
      <Box
        sx={{
          minHeight: 58,
          px: 2,
          pr: { xs: 11, sm: 16 },
          display: "flex",
          alignItems: "center",
          gap: 1.6,
          borderRadius: "22px",
          position: "relative",
          overflow: "hidden",
          border: `1px solid ${isDark ? alpha("#ffffff", 0.08) : alpha("#cdd6e1", 0.95)}`,
          background: isDark
            ? `linear-gradient(180deg, ${alpha("#1b2430", 0.94)} 0%, ${alpha("#131a24", 0.96)} 100%)`
            : `linear-gradient(180deg, ${alpha("#f4f7fb", 0.98)} 0%, ${alpha("#edf1f6", 0.98)} 100%)`,
          boxShadow: isDark
            ? `0 10px 30px ${alpha("#000", 0.28)}`
            : `0 10px 28px ${alpha("#8ea9c1", 0.18)}`,
          color: isDark ? "#f8fafc" : "#1f2937",
          WebkitAppRegion: "drag",
          backdropFilter: "blur(10px)",
          "&::after": {
            content: '""',
            position: "absolute",
            top: -26,
            right: 100,
            width: 170,
            height: 110,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha("#2ea8ff", isDark ? 0.28 : 0.22)} 0%, ${alpha("#2ea8ff", 0.06)} 62%, transparent 72%)`,
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: `1.8px solid ${alpha(isDark ? "#f8fafc" : "#111827", isDark ? 0.75 : 0.9)}`,
            bgcolor: alpha(isDark ? "#ffffff" : "#f8fafc", isDark ? 0.04 : 0.65),
            boxShadow: `inset 0 1px 0 ${alpha("#ffffff", isDark ? 0.08 : 0.75)}`,
            flexShrink: 0,
          }}
        />

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            letterSpacing: 0.15,
            lineHeight: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          Smar Manage
        </Typography>
      </Box>
    </Box>
  );
}
