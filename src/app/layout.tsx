
"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";


import ThemeRegistry from "./ThemeRegistry";
import Sidebar from "./Sidebar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import TopBar from "./TopBar";
import Box from "@mui/material/Box";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeRegistry>
          <Box
            sx={{
              display: 'flex',
              minHeight: '100vh',
              width: '100vw',
              bgcolor: '#f6f7fb',
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            {/* Mobile menu button and avatar */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', p: 1, bgcolor: '#f6f7fb', justifyContent: 'space-between', position: 'relative' }}>
              <IconButton onClick={() => setMobileSidebarOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Box sx={{ pointerEvents: 'auto' }}>
                  <span style={{ fontWeight: 800, color: '#0073ea', fontSize: 20 }}>SmartManage</span>
                </Box>
              </Box>
              {/* Avatar removed from mobile header; only TopBar avatar/icons are shown */}
            </Box>
            <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
              }}
            >
              <TopBar />
              <Box
                component="main"
                sx={{
                  flex: 1,
                  p: { xs: '12px 4px 0 4px', sm: '16px 8px 0 8px', md: '32px 32px 0 32px' },
                  bgcolor: '#f6f7fb',
                  width: '100%',
                  minWidth: 0,
                }}
              >
                {children}
              </Box>
            </Box>
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
