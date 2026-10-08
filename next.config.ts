import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SMART_MANAGE_BUILD_ID:
      process.env.NEXT_PUBLIC_SMART_MANAGE_BUILD_ID ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.COMMIT_SHA ||
      "development",
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
    ];
  },
};

export default nextConfig;
