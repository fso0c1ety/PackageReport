"use client";

import { useState, useEffect } from "react";
import ThemeRegistry from "./ThemeRegistry";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Box from "@mui/material/Box";
import PageTransition from "./PageTransition";
import { usePathname, useRouter } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
        <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: '#23243a', color: 'white' }}>
          Loading...
        </Box>
      </ThemeRegistry>
    );
  }

  // We are in the dashboard layout, so no need to handle /login specific rendering here.
  // The (auth) layout handles that.
  
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
          paddingTop: 'env(safe-area-inset-top)', 
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
