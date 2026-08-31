import type { NextConfig } from "next";

const CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SMART_MANAGE_BUILD_ID:
      process.env.NEXT_PUBLIC_SMART_MANAGE_BUILD_ID ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.COMMIT_SHA ||
      "development",
    NEXT_PUBLIC_SM_PERF: process.env.NEXT_PUBLIC_SM_PERF || "",
  },
  trailingSlash: true,
  serverExternalPackages: ["bullmq", "ioredis"],
  outputFileTracingRoot: process.cwd(),
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    "localhost:3000",
    "http://localhost:3000",
    "192.168.0.28",
    "192.168.0.28:3000",
    "192.168.0.28:4000",
    "http://192.168.0.28:3000",
    "http://192.168.0.28:4000",
    "capacitor://localhost",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      {
        // Apply CORS to every API route so Electron (app://localhost),
        // Capacitor (capacitor://localhost) and Android WebView (http://localhost)
        // can all reach the Vercel backend without being blocked.
        source: "/api/:path*",
        headers: CORS_HEADERS,
      },
    ];
  },
};

export default nextConfig;
