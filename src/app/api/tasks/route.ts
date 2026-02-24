
export const runtime = 'nodejs';

import { NextResponse, NextRequest } from 'next/server';
import { readTasks, writeTasks } from '../../../../server/data/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const tasks = readTasks();
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tasks = readTasks();
  const newTask = { id: uuidv4(), values: body.values || {} };
  tasks.push(newTask);
  console.log('Writing tasks:', tasks);
  writeTasks(tasks);
  return NextResponse.json(newTask, { status: 201 });
}

export async function PUT(request) {
  const body = await request.json();
  const { id, values } = body;
  let tasks = readTasks();
  tasks = tasks.map((task) => (task.id === id ? { ...task, values } : task));
  writeTasks(tasks);
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { id } = await request.json();
  let tasks = readTasks();
  tasks = tasks.filter((task) => task.id !== id);
  writeTasks(tasks);
  return NextResponse.json({ success: true });
}
