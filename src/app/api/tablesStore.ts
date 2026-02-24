import { Column, Task } from "../../types";

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  tasks: Task[];
}

let tables: Table[] = [];

export function getTables() {
  return tables;
}

export function addTable(table: Table) {
  tables.push(table);
  return table;
}

export function updateTable(id: string, columns: Column[]) {
  const table = tables.find((t) => t.id === id);
  if (table) table.columns = columns;
  return table;
}

export function addTaskToTable(tableId: string, task: Task) {
  const table = tables.find((t) => t.id === tableId);
  if (table) table.tasks.push(task);
  return table;
}

export function updateTaskInTable(tableId: string, task: Task) {
  const table = tables.find((t) => t.id === tableId);
  if (table) {
    table.tasks = table.tasks.map((t) => (t.id === task.id ? task : t));
  }
  return table;
}

export function deleteTaskFromTable(tableId: string, taskId: string) {
  const table = tables.find((t) => t.id === tableId);
  if (table) {
    table.tasks = table.tasks.filter((t) => t.id !== taskId);
  }
  return table;
}
