"use client";

import { useState } from "react";
import ThemeRegistry from "./ThemeRegistry";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Box from "@mui/material/Box";
import PageTransition from "./PageTransition";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ThemeRegistry>
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          width: '100%',
          bgcolor: '#23243a',
          flexDirection: { xs: 'column', md: 'row' },
          overflow: 'hidden',
          paddingTop: 'env(safe-area-inset-top)', // Ensure content starts below the notch
        }}
      >
        <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
          <Box
            component="main"
            sx={{
              flex: 1,
              p: { xs: 1, sm: 2, md: 3 },
              bgcolor: '#23243a',
              width: '100%',
              minWidth: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'block',
              boxSizing: 'border-box',
            }}
          >
            <PageTransition>{children}</PageTransition>
          </Box>
        </Box>
      </Box>
    </ThemeRegistry>
  );
}
