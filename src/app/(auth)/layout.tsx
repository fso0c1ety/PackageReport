"use client";

import ThemeRegistry from "../ThemeRegistry";
import Box from "@mui/material/Box";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeRegistry>
      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          width: '100%',
          bgcolor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'none',
          padding: { xs: 0, md: 0 }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
          {children}
        </Box>
      </Box>
    </ThemeRegistry>
  );
}
