// Premium types for modern, table-based to-do app
export type ColumnType =
  | 'Status'
  | 'Dropdown'
  | 'Text'
  | 'Date'
  | 'People'
  | 'Numbers'
  | 'Files'
  | 'Doc'
  | 'Connect'
  | 'Timeline'
  | 'Checkbox'
  | 'Formula'
  | 'Extract'
  | 'Priority'
  | 'Country'
  | 'Message';

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
