import type { NextConfig } from "next";

const CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
];

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.0.29:3000",
  ],
  async headers() {
    return [
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
