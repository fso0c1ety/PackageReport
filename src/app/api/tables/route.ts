
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { readTables, writeTables } from '../../../../server/data/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
	const tables = readTables();
	return NextResponse.json(tables);
}

export async function POST(request) {
	const body = await request.json();
	const tables = readTables();
	const newTable = {
		id: uuidv4(),
		name: body.name,
		columns: body.columns,
		createdAt: Date.now(),
	};
	tables.push(newTable);
	console.log('Writing tables:', tables);
	writeTables(tables);
	return NextResponse.json(newTable);
}
