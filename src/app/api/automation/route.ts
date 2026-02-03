import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const automationPath = path.join(process.cwd(), 'server/data/automation.json');
  try {
    const data = fs.readFileSync(automationPath, 'utf-8');
    const automations = JSON.parse(data);
    return NextResponse.json(automations);
  } catch (err) {
    return NextResponse.json([]);
  }
}
