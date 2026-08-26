"use client";

import Box from "@mui/material/Box";
import DesktopWindowBar from "../DesktopWindowBar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        height: '100vh',
        width: '100%',
        bgcolor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: 'none',
        padding: { xs: 0, md: 0 }
      }}
    >
      <DesktopWindowBar />
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', flex: 1, minHeight: 0, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
}
