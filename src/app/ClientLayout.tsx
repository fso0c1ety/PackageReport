"use client";

import { useState, useEffect } from "react";
import ThemeRegistry from "./ThemeRegistry";
import NotificationRequester from "./NotificationRequester";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import DesktopWindowBar from "./DesktopWindowBar";
import Box from "@mui/material/Box";
import PageTransition from "./PageTransition";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles"; // Added
import { CallProvider } from "./CallContext"; // Added
import { authenticatedFetch, ensureNativeHistoryRouting, getApiUrl, redirectToAppRoute } from "./apiUrl";
import SubscriptionBanner from "./SubscriptionBanner";
import CommandPalette from "./CommandPalette";
import MobileBottomNavigation from "./MobileBottomNavigation";

function ClientLayoutContent({ children }: { children: React.ReactNode }) { // extracted content component to useTheme
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const theme = useTheme(); 

  const handleCloseMobileSidebar = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMobileSidebarOpen(false);
  };
  
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
        onClose={handleCloseMobileSidebar}
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: { xs: '100%', md: 0 }, // important for flex containers to not overflow
          overflow: 'hidden',
        }}
      >
        <DesktopWindowBar />
        <SubscriptionBanner />
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
            pb: { xs: 'calc(76px + env(safe-area-inset-bottom))', md: 3 },
          }}
        >
          <PageTransition>
            {children}
          </PageTransition>
        </Box>
      </Box>
      <MobileBottomNavigation />
    </Box>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driverCheckComplete, setDriverCheckComplete] = useState(false);

  useEffect(() => {
    // If we are in ClientLayout, it means we are inside (dashboard).
    // So we just check if token exists.
    if (typeof window === 'undefined') return;

    ensureNativeHistoryRouting();

    const token = localStorage.getItem('token');

    if (!token) {
        // Redirect to login if no token.
        redirectToAppRoute('/login');

        const retryTimer = window.setTimeout(() => {
          if (!localStorage.getItem('token') && !window.location.pathname.includes('/login')) {
            redirectToAppRoute('/login', true);
          }
        }, 700);

        return () => clearTimeout(retryTimer);
    }

    setIsAuthenticated(true);
    authenticatedFetch(getApiUrl("logistics/context"), { suppressNativeErrorAlert: true })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const workspaceId = data?.driver ? data?.workspace?.id : null;
        const allowedDriverPath = pathname === "/driver-trips" || pathname === "/calendar" || pathname === "/settings";
        if (workspaceId && !allowedDriverPath) {
          redirectToAppRoute(`/driver-trips?id=${encodeURIComponent(workspaceId)}`, true);
          return;
        }
        setDriverCheckComplete(true);
        setLoading(false);
      })
      .catch(() => { setDriverCheckComplete(true); setLoading(false); });
  }, [pathname, router]);

  // Failsafe: only release the loading shell if authentication actually exists.
  useEffect(() => {
    const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('token') && driverCheckComplete) {
          setLoading(false);
        }
    }, 2500);
    return () => clearTimeout(timer);
  }, [driverCheckComplete]);

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
      <CallProvider>
        <NotificationRequester />
        <CommandPalette />
        <ClientLayoutContent>{children}</ClientLayoutContent>
      </CallProvider>
    </ThemeRegistry>
  );
}
