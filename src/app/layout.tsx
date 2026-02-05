
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ background: '#23243a', color: '#fff', overflowX: 'hidden' }}>
        <ThemeRegistry>
          <Box
            sx={{
              display: 'flex',
              minHeight: '100vh',
              width: '100%',   // ✅ FIX
              bgcolor: '#23243a',
              flexDirection: { xs: 'column', md: 'row' },
              overflowX: 'hidden',
            }}
          >
            {/* Mobile menu button and avatar */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', p: 1, bgcolor: '#23243a', justifyContent: 'space-between', position: 'relative' }}>
              <IconButton onClick={() => setMobileSidebarOpen(true)} sx={{ color: '#fff' }}>
                <MenuIcon />
              </IconButton>
              <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Box sx={{ pointerEvents: 'auto' }}>
                  <span style={{ fontWeight: 800, color: '#4f51c0', fontSize: 20 }}>SmartManage</span>
                </Box>
              </Box>
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
                  p: { xs: 1, sm: 2, md: 3 },
                  bgcolor: '#23243a',
                  width: '100%',
                  minWidth: 0,
                  overflowX: 'auto',
                  display: 'block',
                  boxSizing: 'border-box',
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
