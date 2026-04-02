import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BUILD_COMMIT = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'edc8e7463386ac815cb01ca7bdaa24346ba30c97';
const BUILD_DATE = '2026-03-28';

export async function GET() {
  return NextResponse.json({
    commit: BUILD_COMMIT,
    date: BUILD_DATE,
    environment: process.env.NODE_ENV || 'development',
  });
}
