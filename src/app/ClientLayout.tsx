"use client";

import { useState, useEffect } from "react";
import ThemeRegistry from "./ThemeRegistry";
import NotificationRequester from "./NotificationRequester";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Box from "@mui/material/Box";
import PageTransition from "./PageTransition";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles"; // Added

function ClientLayoutContent({ children }: { children: React.ReactNode }) { // extracted content component to useTheme
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const theme = useTheme(); 
  
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        bgcolor: theme.palette.background.default, 
        color: theme.palette.text.primary,
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)', 
      }}
    >
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: 0, // important for flex containers to not overflow
          overflow: 'hidden',
        }}
      >
        <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 1, sm: 2, md: 3 },
            bgcolor: theme.palette.background.default,
            width: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'block',
            boxSizing: 'border-box',
          }}
        >
          <PageTransition>
            {children}
          </PageTransition>
        </Box>
      </Box>
    </Box>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we are in ClientLayout, it means we are inside (dashboard).
    // So we just check if token exists.
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    
    if (!token) {
        // Redirect to login if no token
        router.push('/login');
        // loading state will continue until redirect happens
    } else {
        setIsAuthenticated(true);
        setLoading(false);
    }
  }, [pathname, router]);

  // Failsafe: if we are stuck in loading state for too long (e.g. redirect failed), just show content
  // This is helpful if router.push is not firing or we are in a weird state
  useEffect(() => {
    const timer = setTimeout(() => {
        setLoading(false);
    }, 1000); 
    return () => clearTimeout(timer);
  }, []);

  // If loading, show nothing or a loading spinner
  if (loading) {
    return (
      <ThemeRegistry>
        <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default', color: 'white' }}>
          Loading...
        </Box>
      </ThemeRegistry>
    );
  }

  // We are in the dashboard layout, so no need to handle /login specific rendering here.
  // The (auth) layout handles that.
  
  return (
    <ThemeRegistry>
      <NotificationRequester />
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </ThemeRegistry>
  );
}
