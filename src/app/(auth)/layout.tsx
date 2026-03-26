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
          bgcolor: '#0f172a', // Deep slate for contrast
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(56, 189, 248, 0.15) 0%, transparent 40%),
              radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.15) 0%, transparent 40%)
            `,
            zIndex: 0,
          },
          backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
          padding: { xs: 2, md: 0 } // No padding on desktop for split screen
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
          {children}
        </Box>
      </Box>
    </ThemeRegistry>
  );
}
