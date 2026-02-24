
"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";


import ThemeRegistry from "./ThemeRegistry";
import Sidebar from "./Sidebar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import TopBar from "./TopBar";
import Box from "@mui/material/Box";
import "./globals.css";
import PageTransition from "./PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`} style={{ background: '#23243a', color: '#fff', overflowX: 'hidden' }}>
        <ThemeRegistry>
          <Box
            sx={{
              display: 'flex',
              height: '100vh',
              width: '100%',
              bgcolor: '#23243a',
              flexDirection: { xs: 'column', md: 'row' },
              overflow: 'hidden',
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
      </body>
    </html>
  );
}
