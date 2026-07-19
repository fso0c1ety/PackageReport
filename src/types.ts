// Premium types for modern, table-based to-do app
export type ColumnType =
  | 'Status'
  | 'Dropdown'
  | 'MultiSelect'
  | 'Text'
  | 'Date'
  | 'DateRange'
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
  | 'Message'
  | 'Link'
  | 'Number'
  | 'Email'
  | 'Phone'
  | 'Website'
  | 'Money'
  | 'Progress'
  | 'Tags'
  | 'Location'
  | 'CreatedDate'
  | 'UpdatedDate'
  | 'Image'
  | 'Rating'
  | 'Color'
  | 'QR'
  | 'Barcode'
  | 'LongText'
  | 'Relation'
  | 'Lookup'
  | 'Rollup'
  | 'AutoNumber'
  | 'CreatedBy'
  | 'LastUpdatedBy';

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
  fixed?: boolean;
  width?: number;
  hidden?: boolean;
  frozen?: boolean;
  required?: boolean;
  defaultValue?: unknown;
  icon?: string;
  color?: string;
  options?: ColumnOption[]; // For Dropdown/Status/People
  settings?: {
    currency?: string;
    precision?: number;
    relationTableId?: string;
    relationBoard?: string;
    relationDisplayColumnId?: string;
    formula?: string;
    maxRating?: number;
    lookupColumnId?: string;
    rollupColumnId?: string;
    rollupFunction?: 'SUM' | 'COUNT' | 'COUNT_UNIQUE' | 'AVERAGE' | 'MIN' | 'MAX' | 'EARLIEST_DATE' | 'LATEST_DATE' | 'PERCENT_COMPLETE';
    dateFormat?: string;
    allowedFileTypes?: string[];
    permissions?: {
      viewRoles?: string[];
      editRoles?: string[];
    };
  };
}

export interface Row {
  id: string;
  values: Record<string, any>; // key: columnId, value: cell value
  archived?: boolean;
  activity?: { text: string; time: string; user: string; userAvatar?: string; userId?: string }[];
  created_by?: string;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
}
