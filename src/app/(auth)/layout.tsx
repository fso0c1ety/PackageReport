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
          bgcolor: '#23243a', // Matches HomeDashboard background
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #2f305c 0%, #23243a 100%)', // More cohesive gradient
          padding: 2
        }}
      >
        {children}
      </Box>
    </ThemeRegistry>
  );
}
