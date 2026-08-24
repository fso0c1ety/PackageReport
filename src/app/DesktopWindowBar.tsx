"use client";

import { Box, IconButton, Typography, alpha, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import MinimizeRoundedIcon from "@mui/icons-material/MinimizeRounded";
import CropSquareRoundedIcon from "@mui/icons-material/CropSquareRounded";
import FilterNoneRoundedIcon from "@mui/icons-material/FilterNoneRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { isElectronRuntime } from "./apiUrl";

export default function DesktopWindowBar() {
  const theme = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const windowApi = typeof window !== "undefined" ? window.smartManageWindow : undefined;

  useEffect(() => {
    if (!windowApi) return;
    let active = true;
    void windowApi.getState().then((state) => { if (active) setIsMaximized(state.isMaximized); });
    return windowApi.onState((state) => setIsMaximized(state.isMaximized));
  }, [windowApi]);

  if (!isElectronRuntime()) {
    return null;
  }

  const isDark = theme.palette.mode === "dark";

  const controlSx = {
    width: 46,
    height: 36,
    minWidth: 46,
    borderRadius: 0,
    color: theme.palette.text.primary,
    WebkitAppRegion: "no-drag",
    "&:hover": { bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,.10)" : "rgba(15,23,42,.08)" },
  } as const;

  return (
    <Box
      sx={{
        height: 48,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        WebkitAppRegion: "drag",
        userSelect: "none",
        position: "relative",
        borderBottom: `1px solid ${isDark ? alpha("#ffffff", 0.05) : alpha("#000000", 0.05)}`,
        zIndex: 1200,
      }}
      onDoubleClick={() => void windowApi?.maximize()}
    >
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          bgcolor: isDark ? alpha("#ffffff", 0.2) : alpha("#000000", 0.15),
          ml: 2,
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
        Smart Manage
      </Typography>
      <Box onDoubleClick={(event) => event.stopPropagation()} sx={{ display: "flex", alignItems: "center", height: "100%", WebkitAppRegion: "no-drag" }}>
        <IconButton aria-label="Minimize" onClick={() => void windowApi?.minimize()} sx={controlSx}><MinimizeRoundedIcon fontSize="small" /></IconButton>
        <IconButton aria-label={isMaximized ? "Restore" : "Maximize"} onClick={() => void windowApi?.maximize()} sx={controlSx}>
          {isMaximized ? <FilterNoneRoundedIcon fontSize="small" /> : <CropSquareRoundedIcon fontSize="small" />}
        </IconButton>
        <IconButton aria-label="Close" onClick={() => void windowApi?.close()} sx={{ ...controlSx, "&:hover": { bgcolor: "#c42b1c", color: "#fff" } }}><CloseRoundedIcon fontSize="small" /></IconButton>
      </Box>
    </Box>
  );
}
