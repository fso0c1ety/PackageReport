import { NextRequest, NextResponse } from 'next/server';

// Origins that native runtimes use when calling Vercel from an embedded WebView.
// These are NOT real HTTP origins — they are internal scheme origins used by each platform.
const ALLOWED_ORIGINS = new Set([
  'http://localhost',           // Android Capacitor WebView
  'capacitor://localhost',      // Capacitor iOS / Android (strict)
  'app://localhost',            // Electron custom protocol
  'https://package-report.vercel.app', // Vercel production itself
]);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 h
};

export function middleware(req: NextRequest) {
  // --- Handle CORS Preflight (OPTIONS) ---
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // --- Pass through & inject CORS headers on the real response ---
  const res = NextResponse.next();
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.headers.set(key, value);
  });
  return res;
}

export const config = {
  // Only run on API routes — skip static files, _next internals, etc.
  matcher: '/api/:path*',
};
