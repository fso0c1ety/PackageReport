
import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "SMART MANAGE",
  applicationName: "SMART MANAGE",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { NotificationProvider } from "./NotificationContext";
import ThemeRegistry from "./ThemeRegistry";
import AppUpdateNotifier from "./AppUpdateNotifier";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`} style={{ overflowX: 'hidden' }}>
        <ThemeRegistry>
          <NotificationProvider>
            <AppUpdateNotifier />
            {children}
          </NotificationProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
