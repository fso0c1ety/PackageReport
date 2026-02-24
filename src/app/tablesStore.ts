import { Column, Row } from "../types";

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
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

export function addTaskToTable(tableId: string, row: Row) {
  const table = tables.find((t) => t.id === tableId);
  if (table) table.rows.push(row);
  return table;
}

export function updateTaskInTable(tableId: string, row: Row) {
  const table = tables.find((t) => t.id === tableId);
  if (table) {
    table.rows = table.rows.map((r) => (r.id === row.id ? row : r));
  }
  return table;
}

export function deleteTaskFromTable(tableId: string, rowId: string) {
  const table = tables.find((t) => t.id === tableId);
  if (table) {
    table.rows = table.rows.filter((r) => r.id !== rowId);
  }
  return table;
}
