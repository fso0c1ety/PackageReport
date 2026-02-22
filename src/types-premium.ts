// This file defines the core types for the modern, premium To-Do List app

export type ColumnType =
  | 'Status'
  | 'Dropdown'
  | 'Text'
  | 'Date'
  | 'People'
  | 'Numbers';

export interface ColumnOption {
  value: string;
  color?: string;
  icon?: string;
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  order: number;
  width?: number;
  hidden?: boolean;
  icon?: string;
  color?: string;
  options?: ColumnOption[]; // For Dropdown/Status/People
}

export interface Row {
  id: string;
  values: Record<string, any>; // key: columnId, value: cell value
  archived?: boolean;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
}
