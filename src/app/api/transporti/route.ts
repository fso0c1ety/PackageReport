import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const tablesPath = path.join(process.cwd(), 'server/data/tables.json');
  try {
    const data = fs.readFileSync(tablesPath, 'utf-8');
    const tables = JSON.parse(data);
    const transportiTable = tables.find((t: any) => t.name === 'Transporti');
    if (!transportiTable || !transportiTable.tasks || transportiTable.tasks.length === 0) {
      return NextResponse.json(null);
    }
    const latestTask = transportiTable.tasks[transportiTable.tasks.length - 1];
    return NextResponse.json({
      recipients: Array.isArray(latestTask.values['73c3a39c-fe0e-45d5-a0e6-e4ffac381225'])
        ? latestTask.values['73c3a39c-fe0e-45d5-a0e6-e4ffac381225'].map((p: any) => p.email)
        : [],
      ...latestTask.values
    });
  } catch (err) {
    return NextResponse.json(null);
  }
}
