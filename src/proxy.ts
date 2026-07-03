import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'http://localhost',
  'capacitor://localhost',
  'app://localhost',
  'https://package-report.vercel.app',
]);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function proxy(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = { ...CORS_HEADERS };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  const res = NextResponse.next();
  Object.entries(headers).forEach(([key, value]) => {
    res.headers.set(key, value);
  });
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
