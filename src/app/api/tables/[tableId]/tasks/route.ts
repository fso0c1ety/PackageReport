import { NextRequest, NextResponse } from "next/server";
import { addTaskToTable, updateTaskInTable, getTables } from "../../../tablesStore";
import { v4 as uuidv4 } from "uuid";


export async function GET(req: NextRequest, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const table = getTables().find((t) => t.id === tableId);
  return NextResponse.json(table ? table.tasks : []);
}


export async function POST(req: NextRequest, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const data = await req.json();
  const newTask = { id: data.id || uuidv4(), values: data.values || {} };
  const table = addTaskToTable(tableId, newTask);
  return NextResponse.json(newTask, { status: 201 });
}


export async function PUT(req: NextRequest, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const data = await req.json();
  const updated = updateTaskInTable(tableId, { id: data.id, values: data.values });
  return NextResponse.json({ success: !!updated });
}
