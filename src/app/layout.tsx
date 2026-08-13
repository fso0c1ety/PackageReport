
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://package-report.vercel.app"),
  title: "Smart Manage — Business Management Platform",
  description: "Manage operations, projects, teams, customers, documents and industry-specific workflows from one flexible workspace.",
  applicationName: "Smart Manage",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", url: "/", siteName: "Smart Manage",
    title: "Smart Manage — Business Management Platform",
    description: "Manage operations, projects, teams, customers, documents and industry-specific workflows from one flexible workspace.",
    images: [{ url: "/marketing/boards.webp", width: 1440, height: 900, alt: "Smart Manage business workspace" }],
  },
  twitter: { card: "summary_large_image", title: "Smart Manage — Business Management Platform", description: "One flexible workspace for operations, projects, teams and customers.", images: ["/marketing/boards.webp"] },
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
import SmartManageUpdate from "./SmartManageUpdate";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`} style={{ overflowX: 'hidden' }}>
        <ThemeRegistry>
          <NotificationProvider>
            {children}
            <SmartManageUpdate />
          </NotificationProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
