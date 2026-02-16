"use client";
// Task row menu component (must be top-level, not inside JSX)
function TaskRowMenu({ row, onDelete, onView }: { row: Row, onDelete: () => void, onView: () => void }) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleView = () => {
    // Blur the currently focused element before closing the menu
    if (typeof window !== 'undefined' && document && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    handleClose();
    onView();
  };
  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: '#bfc8e0' }}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose} PaperProps={{ sx: { bgcolor: '#2c2d4a', color: '#fff', borderRadius: 2 } }}>
        <MenuItem onClick={handleView} sx={{ color: '#fff' }}>
          <Typography sx={{ color: '#fff' }}>View</Typography>
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); onDelete(); }} sx={{ color: '#e2445c' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1, color: '#e2445c' }} />
          <Typography sx={{ color: '#e2445c' }}>Delete</Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
import React, { useState, useEffect } from "react";
import Flag from "react-flagkit";
// Country name to ISO 3166-1 alpha-2 code mapping for react-flagkit
const countryCodeMap: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD", "Angola": "AO", "Antigua and Barbuda": "AG", "Argentina": "AR", "Armenia": "AM", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT", "Bolivia": "BO", "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "Brunei": "BN", "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cabo Verde": "CV", "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA", "Central African Republic": "CF", "Chad": "TD", "Chile": "CL", "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo (Congo-Brazzaville)": "CG", "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czechia (Czech Republic)": "CZ", "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO", "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE", "Eswatini (fmr. 'Swaziland')": "SZ", "Ethiopia": "ET", "Fiji": "FJ", "Finland": "FI", "France": "FR", "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE", "Ghana": "GH", "Greece": "GR", "Grenada": "GD", "Guatemala": "GT", "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY", "Haiti": "HT", "Honduras": "HN", "Hungary": "HU", "Iceland": "IS", "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "Kuwait": "KW", "Kyrgyzstan": "KG", "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR", "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU", "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV", "Mali": "ML", "Malta": "MT", "Marshall Islands": "MH", "Mauritania": "MR", "Mauritius": "MU", "Mexico": "MX", "Micronesia": "FM", "Moldova": "MD", "Monaco": "MC", "Mongolia": "MN", "Montenegro": "ME", "Morocco": "MA", "Mozambique": "MZ", "Myanmar (Burma)": "MM", "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK", "Norway": "NO", "Oman": "OM", "Pakistan": "PK", "Palau": "PW", "Palestine State": "PS", "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA", "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC", "Saint Vincent and the Grenadines": "VC", "Samoa": "WS", "San Marino": "SM", "Sao Tome and Principe": "ST", "Saudi Arabia": "SA", "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR", "Sweden": "SE", "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ", "Thailand": "TH", "Timor-Leste": "TL", "Togo": "TG", "Tonga": "TO", "Trinidad and Tobago": "TT", "Tunisia": "TN", "Turkey": "TR", "Turkmenistan": "TM", "Tuvalu": "TV", "Uganda": "UG", "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB", "United States of America": "US", "Uruguay": "UY", "Uzbekistan": "UZ", "Vanuatu": "VU", "Vatican City": "VA", "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW"
};
import dayjs, { Dayjs } from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TextField,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Tooltip,
  Typography,
  Stack,
  Select,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemText,
  Switch,
  Popover
} from "@mui/material";
import PeopleSelector from "./PeopleSelector";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ColumnTypeSelector from "./ColumnTypeSelector";
import { Column, Row, ColumnType, ColumnOption } from "../types";

// Columns will be loaded dynamically from backend; do not use hardcoded IDs.
const initialColumns: Column[] = [];

import { getApiUrl } from "./apiUrl";

interface TableBoardProps {
  tableId: string;
}

const initialRows: Row[] = [
  {
    id: uuidv4().toString(),
    values: {
      task: "Started",
      owner: "",
      status: "Started",
      due: "",
      priority: "",
    },
  },
];

export default function TableBoard({ tableId }: TableBoardProps) {
    // Chat popover state
    const [chatAnchor, setChatAnchor] = useState<null | HTMLElement>(null);
    const [chatPopoverKey, setChatPopoverKey] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatTaskId, setChatTaskId] = useState<string | null>(null);
  // --- State ---

    // Fix popover anchor to button
    // (Removed duplicate handleOpenChat definition)

  // Handler to close the review dialog
  const handleCloseReview = () => {
    setReviewTask(null);
    setShowEmailAutomation(false);
  };
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [reviewTask, setReviewTask] = useState<Row | null>(null);
  // Email Automation UI state
  const [showEmailAutomation, setShowEmailAutomation] = useState(false);
  const [emailTriggerCol, setEmailTriggerCol] = useState<string>("");
  const [emailCols, setEmailCols] = useState<string[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  // Find the first column of type 'People'
  const peopleCol = columns.find(col => col.type === 'People');
  // Extract people options from the current task's people column
  const peopleOptions = (reviewTask && peopleCol && Array.isArray(reviewTask.values[peopleCol.id]))
    ? reviewTask.values[peopleCol.id].map((p: any) => ({ name: p.name, email: p.email }))
    : [];
  // --- Sample people list ---
  const samplePeople = [
    {
      name: "Valon Halili",
      email: "valonhalili74@gmail.com",
      avatar: null, // or a URL if you want
    },
    // Add more sample people if needed
  ];
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#e0e4ef");
  const [editingLabelsColId, setEditingLabelsColId] = useState<string | null>(null);
  const [labelEdits, setLabelEdits] = useState<{ [colId: string]: { [idx: number]: string } }>({});
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [renameAnchorEl, setRenameAnchorEl] = useState<null | HTMLElement>(null);
  const [colMenuId, setColMenuId] = useState<string | null>(null);
  const [showColSelector, setShowColSelector] = useState(false);
  const [colSelectorAnchor, setColSelectorAnchor] = useState<null | HTMLElement>(null);
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteColId, setDeleteColId] = useState<string | null>(null);
  const [fileDialog, setFileDialog] = useState<{ open: boolean; file: File | null; rowId: string | null; colId: string | null }>({ open: false, file: null, rowId: null, colId: null });
  const [loading, setLoading] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(true);

  // --- Fetch columns and tasks from backend on mount ---
  useEffect(() => {
    setLoading(true);
    fetch(getApiUrl(`/tables`))
      .then((res) => res.json())
      .then((tables) => {
        const table = tables.find((t: any) => t.id === tableId);
        if (table) setColumns(table.columns || []);
      })
      .finally(() => setLoading(false));
    fetch(getApiUrl(`/tables/${tableId}/tasks`))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data);
        } else {
          // If no tasks, show a placeholder row (not persisted)
          setRows([
            {
              id: 'placeholder',
              values: Object.fromEntries(columns.map(col => [col.id, col.type === 'People' ? [] : '']))
            }
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [tableId, columns.length]);

  // --- Handlers and logic ---
  // Add new task
  const handleAddTask = async () => {
    setLoading(true);
    // Initialize values for all columns
    const values: Record<string, any> = {};
    columns.forEach(col => {
      if (col.type === "Status" && col.options && col.options.length > 0) {
        values[col.id] = col.options[0].value;
      } else if (col.type === "Dropdown" && col.options && col.options.length > 0) {
        values[col.id] = col.options[0].value;
      } else if (col.type === "Date") {
        values[col.id] = "";
      } else if (col.type === "Checkbox") {
        values[col.id] = false;
      } else {
        values[col.id] = "";
      }
    });
    const newTask = { values };
    const res = await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
    const created = await res.json();
    setRows((prev) => [...prev, created]);
    setLoading(false);
  };

  // Drag and drop handler
  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    // Column drag
    if (result.type === 'column') {
      const newColumns = Array.from(columns);
      const [removed] = newColumns.splice(result.source.index, 1);
      newColumns.splice(result.destination.index, 0, removed);
      newColumns.forEach((col, idx) => (col.order = idx));
      setColumns(newColumns);
    }
    // Row drag
    if (result.type === 'row') {
      const newRows = Array.from(rows);
      const [removed] = newRows.splice(result.source.index, 1);
      newRows.splice(result.destination.index, 0, removed);
      setRows(newRows);
      // Optionally, persist new order to backend
      // await fetch(getApiUrl(`/tables/${TABLE_ID}/tasks`), {
      //   method: "PUT",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(newRows),
      // });
    }
  };

  // Add new column
  const handleAddColumn = async (colType: ColumnType, label: string) => {
    // Inject full country list for Country columns
    const fullCountryList = [
      "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","East Timor","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Korea, North","Korea, South","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
    ];
    const newColumn: Column = {
      id: uuidv4(),
      name: label,
      type: colType,
      order: columns.length,
      options:
        colType === "Country"
          ? fullCountryList.map(c => ({ value: c }))
          : ["Status", "Dropdown", "People"].includes(colType)
            ? []
            : undefined,
    };
    const updatedColumns = [...columns, newColumn];
    setColumns(updatedColumns);
    setShowColSelector(false);
    // Persist columns to backend
    await fetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedColumns }),
    });
    // Reload columns from backend to ensure persistence
    const tablesRes = await fetch(getApiUrl(`/tables`));
    const tables = await tablesRes.json();
    const table = tables.find((t: any) => t.id === tableId);
    if (table) setColumns(table.columns || []);

    // Update all existing tasks to include the new column with a default value
    const defaultValue = (() => {
      if (colType === "Status" || colType === "Dropdown") return newColumn.options && newColumn.options[0] ? newColumn.options[0].value : "";
      if (colType === "Checkbox") return false;
      if (colType === "Numbers") return 0;
      return "";
    })();
    const updatedRows = rows.map(row => ({
      ...row,
      values: { ...row.values, [newColumn.id]: defaultValue }
    }));
    setRows(updatedRows);
    // Persist each updated task to backend
    for (const row of updatedRows) {
      await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, values: row.values }),
      });
    }
  };

  // Edit cell
  const handleCellClick = (rowId: string, colId: string, value: any, colType?: string) => {
    // Only enter edit mode if not already editing this cell
    if (!editingCell || editingCell.rowId !== rowId || editingCell.colId !== colId) {
      // Close chat popover if clicking any column except Message
      if (colType !== "Message") {
        setChatAnchor(null);
        setChatTaskId(null);
        setChatMessages([]);
        setChatInput("");
      }
      setEditingCell({ rowId, colId });
      if (colType === "Date") {
        setEditValue(value ? dayjs(value) : null);
      } else if (colType === "People") {
        setEditValue(Array.isArray(value) ? value : []);
      } else if (colType === "Country") {
        setEditValue(value ?? "");
      } else {
        setEditValue(value ?? "");
      }
    }
  };
  // Accept optional valueOverride for immediate save from PeopleSelector
  const handleCellSave = async (rowId: string, colId: string, colType?: string, valueOverride?: any) => {
    console.log('handleCellSave called', { rowId, colId, colType, valueOverride });
    // Find and update the row before calling setRows
    const prevRows = [...rows];
    const rowIdx = prevRows.findIndex((row) => row.id === rowId);
    if (rowIdx === -1) return;
    let newValue = valueOverride !== undefined ? valueOverride : editValue;
    const col = columns.find(c => c.id === colId);
    if (col && col.type === "People") {
      newValue = Array.isArray(newValue) ? newValue.map((p: any) => ({ name: p.name, email: p.email })) : [];
    }
    if (colType === "Date") {
      newValue = newValue && dayjs.isDayjs(newValue) && newValue.isValid() ? newValue.format("YYYY-MM-DD") : "";
    }
    const updatedRow: Row = { ...prevRows[rowIdx], values: { ...prevRows[rowIdx].values, [colId]: newValue } };
    const updatedRows = prevRows.map((row, idx) => idx === rowIdx ? updatedRow : row);
    setRows(updatedRows);
    setEditingCell(null);
    setEditValue("");
    // If editing the placeholder row, treat as new task
    if (rowId === 'placeholder') {
      setLoading(true);
      // Create a new task with the edited value
      const values: Record<string, any> = { ...editValue };
      columns.forEach(col => {
        if (!(col.id in values)) {
          values[col.id] = col.type === 'People' ? [] : '';
        }
      });
      values[colId] = valueOverride !== undefined ? valueOverride : editValue;
      const res = await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const created = await res.json();
      // Remove placeholder and add real task
      setRows([created]);
      setEditingCell(null);
      setEditValue("");
      setLoading(false);
      return;
    }
    // Persist to backend for real rows
    if (updatedRow) {
      console.log('Sending PUT to backend:', getApiUrl(`/tables/${tableId}/tasks`), { id: updatedRow.id, values: updatedRow.values });
      const response = await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: updatedRow.id, values: updatedRow.values }),
      });
      // Log backend debug logs if present
      const debugLogsHeader = response.headers.get("X-Debug-Logs");
      if (debugLogsHeader) {
        try {
          const logs = JSON.parse(decodeURIComponent(debugLogsHeader));
          logs.forEach((log: { msg: string; obj?: any }) => {
            console.log(`[BACKEND] ${log.msg}`, log.obj);
          });
        } catch (e) {
          console.warn("Failed to parse backend debug logs:", e, debugLogsHeader);
        }
      }
      // Re-fetch latest rows from backend to ensure sync
      const res = await fetch(getApiUrl(`/tables/${tableId}/tasks`));
      let data = await res.json();
      // If backend returns no rows, show placeholder
      if (!Array.isArray(data) || data.length === 0) {
        data = [
          {
            id: 'placeholder',
            values: Object.fromEntries(columns.map(col => [col.id, col.type === 'People' ? [] : '']))
          }
        ];
      }
      setRows(data);
    }
  };

  // File upload for Files column
  const handleFileUpload = (rowId: string, colId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setRows(prevRows => prevRows.map(row => {
      if (row.id !== rowId) return row;
      const prevFiles = Array.isArray(row.values[colId]) ? row.values[colId] : [];
      return {
        ...row,
        values: {
          ...row.values,
          [colId]: [...prevFiles, ...Array.from(files)]
        }
      };
    }));
    setEditingCell(null);
    setEditValue("");
  };

  // File dialog open/close
  const handleFileClick = (file: File, rowId: string, colId: string) => {
    setFileDialog({ open: true, file, rowId, colId });
  };
  const handleFileDelete = () => {
    if (!fileDialog.file || !fileDialog.rowId || !fileDialog.colId) return;
    const colId = fileDialog.colId;
    const rowId = fileDialog.rowId;
    setRows(prevRows => prevRows.map(row => {
      if (row.id !== rowId) return row;
      const files = Array.isArray(row.values[colId]) ? row.values[colId] : [];
      return {
        ...row,
        values: {
          ...row.values,
          [colId]: files.filter((f: File) => f !== fileDialog.file)
        }
      };
    }));
    setFileDialog({ open: false, file: null, rowId: null, colId: null });
  };

  // Column menu
  const handleColMenuOpen = (event: React.MouseEvent<HTMLElement>, colId: string) => {
    setAnchorEl(event.currentTarget);
    setColMenuId(colId);
  };
  const handleColMenuClose = () => {
    setAnchorEl(null);
    setColMenuId(null);
  };

  // Persist column rename
  const handleRenameColumn = async (colId: string, newName: string) => {
    setColumns(cols => {
      const updated = cols.map(col =>
        col.id === colId ? { ...col, name: newName } : col
      );
      fetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: updated }),
      });
      return updated;
    });
  };

  // Persist column delete
  const handleDeleteColumn = async (colId: string) => {
    setColumns(cols => {
      const updated = cols.filter(col => col.id !== colId);
      fetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: updated }),
      });
      return updated;
    });
    // Also remove column from all rows
    setRows(rows => rows.map(row => {
      const { [colId]: _, ...rest } = row.values;
      return { ...row, values: rest };
    }));
  };

   // Status label management
  const handleEditStatusLabel = (colId: string, idx: number) => {
    const newLabel = labelEdits[colId]?.[idx]?.trim();
    if (!newLabel) return;
    setColumns(cols => {
      const updated = cols.map(col =>
        col.id === colId && col.options
          ? {
              ...col,
              options: col.options.map((opt, i) =>
                i === idx ? { ...opt, value: newLabel } : opt
              ),
            }
          : col
      );
      fetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: updated }),
      });
      return updated;
    });
    setLabelEdits(edits => {
      const updated = { ...edits[colId] };
      delete updated[idx];
      return { ...edits, [colId]: updated };
    });
  };
  const handleEditStatusColor = (colId: string, idx: number, color: string) => {
    setColumns(cols => {
      const updated = cols.map(col =>
        col.id === colId && col.options
          ? {
              ...col,
              options: col.options.map((opt, i) =>
                i === idx ? { ...opt, color } : opt
              ),
            }
          : col
      );
      fetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: updated }),
      });
      return updated;
    });
  };
  const handleAddStatusLabel = (colId: string) => {
    if (!newStatusLabel.trim()) return;
    setColumns(cols => {
      const updated = cols.map(col =>
        col.id === colId && col.options
          ? {
              ...col,
              options: col.options.some(opt => opt.value === newStatusLabel.trim())
                ? col.options
                : [...col.options, { value: newStatusLabel.trim(), color: newStatusColor }],
            }
          : col
      );
      fetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: updated }),
      });
      return updated;
    });
    setNewStatusLabel("");
    setNewStatusColor("#e0e4ef");
  };
  const handleDeleteStatusLabel = (colId: string, idx: number) => {
    setColumns(cols => {
      const updated = cols.map(col =>
        col.id === colId && col.options
          ? {
              ...col,
              options: col.options.filter((_, i) => i !== idx),
            }
          : col
      );
      fetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: updated }),
      });
      return updated;
    });
    if (editingCell && editingCell.colId === colId) {
      const col = columns.find(c => c.id === colId);
      if (col && col.options && col.options[idx] && editValue === col.options[idx].value) {
        setEditValue("");
      }
    }
    setRows(prevRows =>
      prevRows.map(row => {
        const col = columns.find(c => c.id === colId);
        if (!col || !col.options) return row;
        if (col.options[idx] && row.values[colId] === col.options[idx].value) {
          return { ...row, values: { ...row.values, [colId]: "" } };
        }
        return row;
      })
    );
    setLabelEdits(edits => {
      const { [idx]: _, ...rest } = edits[colId] || {};
      return { ...edits, [colId]: rest };
    });
  };

  // --- Render cell by type ---
    // Handler for opening chat popover
    const handleOpenChat = (
      event: React.MouseEvent<HTMLElement>,
      rowId: string,
      messages: any[],
      colId: string
    ) => {
      setChatAnchor(event.currentTarget);
      setChatPopoverKey(`${rowId}-${colId}`);
      setChatInput("");
      setChatTaskId(rowId);
      // Always load messages from backend when opening
      fetch(getApiUrl(`/tables/${tableId}/tasks/${rowId}`))
        .then(res => res.json())
        .then(task => setChatMessages(task.values.message || []));
    };
    const handleCloseChat = () => {
      setChatAnchor(null);
      setChatPopoverKey(null);
      setChatMessages([]);
      setChatInput("");
      setChatTaskId(null);
    };
    const handleSendChat = async () => {
      if (!chatTaskId || !chatInput.trim()) return;
      const newMsg = {
        id: uuidv4(),
        sender: "User", // Replace with actual user info if available
        text: chatInput,
        timestamp: new Date().toISOString()
      };
      // Update local state
      setChatMessages(prev => [...prev, newMsg]);
      setChatInput("");
      // Update task row in backend
      const row = rows.find(r => r.id === chatTaskId);
      if (row) {
        const updatedValues = { ...row.values, message: [...(row.values.message || []), newMsg] };
        await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, values: updatedValues }),
        });
        // Reload messages from backend after saving
        const res = await fetch(getApiUrl(`/tables/${tableId}/tasks/${row.id}`));
        const updatedRow = await res.json();
        setRows(rows => rows.map(r => r.id === row.id ? { ...r, values: updatedRow.values } : r));
        setChatMessages(updatedRow.values.message || []);
      }
    };
  const renderCell = (row: Row, col: Column) => {
    // Force Priority column to always use Dropdown logic for editing
    const effectiveCol = col.id === "priority" ? { ...col, type: "Dropdown" } : col;
    let value = row.values ? row.values[col.id] : "";
    // Debug logging for country column rendering
    if (effectiveCol.type && effectiveCol.options) {
      console.log({
        type: effectiveCol.type,
        options: effectiveCol.options,
        value,
        editValue,
        editingCell,
        colId: effectiveCol.id,
        rowId: row.id,
      });
    }
    // For Dropdown/Status/Priority/Country, ensure value is in options (case-insensitive for Country)
    if ((col.type === "Status" || col.type === "Dropdown" || col.id === "priority" || (col.type && col.type.toLowerCase() === "country")) && col.options) {
      if (!col.options.some(opt => opt.value === value)) {
        value = "";
      }
    }
    if (editingCell && editingCell.rowId === row.id && editingCell.colId === col.id) {
      // Country column: dropdown in edit mode (case-insensitive)
      if (((col.type && col.type.toLowerCase() === "country") || (effectiveCol.type && effectiveCol.type.toLowerCase() === "country")) && effectiveCol.options) {
        return (
          <FormControl size="small" fullWidth sx={{ minWidth: 160 }}>
            <Select
              value={value}
              onChange={(e) => {
                setEditingCell(null);
                handleCellSave(row.id, col.id, col.type, e.target.value);
              }}
              autoFocus
              displayEmpty
              renderValue={selected => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 2, bgcolor: '#23234a' }}>
                  {countryCodeMap[selected as keyof typeof countryCodeMap] ? (
                    <Flag country={countryCodeMap[selected as keyof typeof countryCodeMap]} size={24} style={{ marginRight: 10, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
                  ) : null}
                  <Typography sx={{ color: '#fff', fontWeight: 500, fontSize: 15 }}>{selected || <span style={{ color: '#888' }}>Select country</span>}</Typography>
                </Box>
              )}
              sx={{ color: '#fff', background: '#23234a', borderRadius: 2, boxShadow: '0 2px 8px #23234a33', minHeight: 44 }}
              id={`country-select-${row.id}-${col.id}`}
              name={`country-select-${row.id}-${col.id}`}
              MenuProps={{ PaperProps: { sx: { bgcolor: '#23234a', color: '#fff', borderRadius: 2 } } }}
            >
              {effectiveCol.options.map((opt: ColumnOption) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ color: '#fff', background: 'transparent', display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1 }}>
                  {countryCodeMap[opt.value as keyof typeof countryCodeMap] ? (
                    <Flag country={countryCodeMap[opt.value as keyof typeof countryCodeMap]} size={24} style={{ marginRight: 10, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
                  ) : null}
                  <Typography sx={{ fontWeight: 500, fontSize: 15 }}>{opt.value}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }
      // Files column
      if (effectiveCol.type === "Files") {
        return (
          <input
            type="file"
            multiple
            autoFocus
            id={`file-upload-${row.id}-${col.id}`}
            name={`file-upload-${row.id}-${col.id}`}
            onChange={(e) => handleFileUpload(row.id, col.id, e.target.files)}
            style={{ marginTop: 8, color: '#fff', background: '#222' }}
          />
        );
      }
      if (effectiveCol.type === "Doc") {
        return (
          <TextField
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(row.id, col.id)}
            onKeyDown={e => e.key === "Enter" && handleCellSave(row.id, col.id)}
            size="small"
            autoFocus
            placeholder="Paste doc link or text"
            id={`doc-input-${row.id}-${col.id}`}
            name={`doc-input-${row.id}-${col.id}`}
            InputProps={{ style: { color: '#fff' } }}
          />
        );
      }
      // Status/Dropdown/Country
      if ((effectiveCol.type === "Status" || effectiveCol.type === "Dropdown") && effectiveCol.options) {
        const isEditingLabels = editingLabelsColId === effectiveCol.id;
        return (
          <Box>
            <FormControl size="small" fullWidth>
              <Select
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setEditingCell(null);
                  handleCellSave(row.id, col.id, col.type, e.target.value);
                }}
                // Prevent closing when editing labels
                onBlur={!isEditingLabels ? () => handleCellSave(row.id, col.id) : undefined}
                autoFocus
                open={isEditingLabels ? true : undefined}
                MenuProps={isEditingLabels ? { disableAutoFocusItem: true } : {}}
                sx={{ color: '#fff', background: '#222' }}
                id={`dropdown-select-${row.id}-${col.id}`}
                name={`dropdown-select-${row.id}-${col.id}`}
              >
                {effectiveCol.options.map((opt: ColumnOption, idx: number) => (
                  isEditingLabels ? (
                    <MenuItem key={opt.value} value={opt.value} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#fff', background: '#222' }}>
                      <TextField
                        value={labelEdits[effectiveCol.id]?.[idx] ?? opt.value}
                        size="small"
                        onChange={(e) => setLabelEdits(edits => ({
                          ...edits,
                          [effectiveCol.id]: { ...edits[effectiveCol.id], [idx]: e.target.value }
                        }))}
                        onBlur={() => handleEditStatusLabel(effectiveCol.id, idx)}
                        sx={{ width: 100, color: '#fff', '& .MuiInputBase-input': { color: '#fff' } }}
                        InputProps={{ style: { color: '#fff' } }}
                      />
                      <input
                        type="color"
                        value={opt.color || "#e0e4ef"}
                        style={{ width: 28, height: 28, border: 'none', background: 'none', marginLeft: 4, marginRight: 4, cursor: 'pointer' }}
                        onChange={(e) => handleEditStatusColor(effectiveCol.id, idx, e.target.value)}
                      />
                      <IconButton size="small" color="error" onClick={() => { handleDeleteStatusLabel(effectiveCol.id, idx); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </MenuItem>
                  ) : (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#fff', background: '#222' }}
                      onClick={() => {
                        setEditValue(opt.value);
                        setEditingCell(null);
                        handleCellSave(row.id, col.id, col.type, opt.value);
                      }}
                    >
                      <Box sx={{ width: 16, height: 16, bgcolor: opt.color, borderRadius: '50%', mr: 1, display: 'inline-block' }} />
                      {opt.value}
                    </MenuItem>
                  )
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
              <IconButton size="small" onClick={() => setEditingLabelsColId(isEditingLabels ? null : effectiveCol.id)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 500, cursor: 'pointer' }} onClick={() => setEditingLabelsColId(isEditingLabels ? null : effectiveCol.id)}>
                Edit Labels
              </span>
              {isEditingLabels && (
                <>
                  <TextField
                    size="small"
                    placeholder="Add label"
                    value={newStatusLabel}
                    onChange={(e) => setNewStatusLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddStatusLabel(effectiveCol.id);
                      }
                    }}
                    sx={{ ml: 2, width: 100 }}
                  />
                  <input
                    type="color"
                    value={newStatusColor}
                    style={{ width: 28, height: 28, border: 'none', background: 'none', marginLeft: 4, marginRight: 4, cursor: 'pointer' }}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                  />
                  <IconButton size="small" color="primary" disabled={!newStatusLabel.trim()} onClick={() => handleAddStatusLabel(effectiveCol.id)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          </Box>
        );
      }
      // Country column: dropdown in edit mode only
      if (col.type && col.type.toLowerCase() === "country" && col.options) {
  return (
    <FormControl size="small" fullWidth>
      <Select
        value={value}
        onChange={e => {
          setEditValue(e.target.value);
          handleCellSave(row.id, col.id, col.type, e.target.value);
        }}
        sx={{ color: '#fff', background: '#222' }}
        id={`country-select-read-${row.id}-${col.id}`}
        name={`country-select-read-${row.id}-${col.id}`}
      >
        {col.options.map((opt: ColumnOption) => (
          <MenuItem key={opt.value} value={opt.value} sx={{ color: '#fff', background: '#222', display: 'flex', alignItems: 'center' }}>
            {countryCodeMap[opt.value as keyof typeof countryCodeMap] ? (
              <Flag country={countryCodeMap[opt.value as keyof typeof countryCodeMap]} size={20} style={{ marginRight: 8, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
            ) : null}
            {opt.value}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
      // Message column: show chat popover trigger in edit mode
      if (effectiveCol.type === "Message") {
        return (
          <>
            <Button variant="outlined" size="small" onClick={e => handleOpenChat(e, row.id, value || [], col.id)}>
              Chat
            </Button>
            {chatPopoverKey === `${row.id}-${col.id}` && chatAnchor && (
              <Popover
                open={!!chatAnchor}
                anchorEl={chatAnchor}
                onClose={handleCloseChat}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                  sx: {
                    p: 0,
                    minWidth: 340,
                    maxWidth: 420,
                    bgcolor: '#23234a',
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(44,45,74,0.25)',
                    border: '2px solid #0073ea',
                  }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: 380 }}>
                  <Box sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: '#2c2d4a',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    borderBottom: '1px solid #3a3b5a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}>
                    <Avatar sx={{ bgcolor: '#0073ea', width: 36, height: 36, fontWeight: 700 }}>💬</Avatar>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Task Chat</Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton size="small" onClick={handleCloseChat} sx={{ color: '#fff' }}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1, bgcolor: '#23234a' }}>
                    {chatMessages.length === 0 ? (
                      <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>No messages yet. Start the conversation!</Typography>
                    ) : (
                      chatMessages.map(msg => (
                        <Box key={msg.id} sx={{ mb: 2, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 1 }}>
                          <Avatar sx={{ bgcolor: '#0073ea', width: 32, height: 32, fontWeight: 700 }}>{msg.sender[0]}</Avatar>
                          <Box sx={{ bgcolor: '#2c2d4a', borderRadius: 2, px: 2, py: 1, minWidth: 120, maxWidth: 260 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{msg.sender}</Typography>
                            <Typography variant="body1" sx={{ color: '#bfc8e0', fontSize: 15 }}>{msg.text}</Typography>
                            <Typography variant="caption" sx={{ fontSize: 11, color: '#fff' }}>{new Date(msg.timestamp).toLocaleString()}</Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, bgcolor: '#23234a', borderTop: '1px solid #3a3b5a' }}>
                    <TextField
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      size="small"
                      placeholder="Type a fun message..."
                      fullWidth
                      sx={{ bgcolor: '#2c2d4a', color: '#fff', borderRadius: 2, '& .MuiInputBase-input': { color: '#fff' } }}
                    />
                    <Button onClick={handleSendChat} disabled={!chatInput.trim()} variant="contained" sx={{ bgcolor: '#0073ea', color: '#fff', fontWeight: 700, borderRadius: 2, boxShadow: '0 2px 8px #0073ea33' }}>Send</Button>
                  </Box>
                </Box>
              </Popover>
            )}
          </>
        );
      }
      // Date
      if (col.type === "Date") {
        return (
          <DatePicker
            value={editValue || null}
            onChange={val => setEditValue(val)}
            slotProps={{
              textField: {
                size: 'small',
                autoFocus: true,
                InputProps: { style: { color: '#fff' } },
                sx: { bgcolor: '#333', color: '#fff' },
                onBlur: () => {
                  if (editValue && dayjs(editValue).isValid()) {
                    handleCellSave(row.id, col.id, col.type, editValue);
                  }
                },
                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (editValue && dayjs(editValue).isValid()) {
                      handleCellSave(row.id, col.id, col.type, editValue);
                    }
                  }
                }
              }
            }}
          />
        );
      }
      // People (edit mode: custom PeopleSelector)
      if (col.type === "People") {
        // Always enter edit mode on click
        if (editingCell && editingCell.rowId === row.id && editingCell.colId === col.id) {
          // Deduplicate by email
          const seen: Record<string, boolean> = {};
          const deduped = (Array.isArray(editValue) ? editValue : []).filter((person: any) => {
            if (!person.email || seen[person.email]) return false;
            seen[person.email] = true;
            return true;
          });
          return (
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              {deduped.map((person: any) => (
                <Chip
                  key={person.email}
                  avatar={<Avatar sx={{ bgcolor: '#0073ea' }}>{person.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}</Avatar>}
                  label={person.name}
                  onDelete={person.email === "valonhalili74@gmail.com" ? undefined : () => {
                    const newValue = deduped.filter((p: any) => p.email !== person.email);
                    setEditValue(newValue);
                    handleCellSave(row.id, col.id, col.type, newValue);
                  }}
                  sx={{ mb: 0.5 }}
                  disabled={person.email === "valonhalili74@gmail.com"}
                />
              ))}
              <PeopleSelector
                value={deduped}
                onChange={(newValue: any[]) => {
                  setEditValue(newValue);
                }}
                onClose={(finalValue: any[]) => {
                  setEditValue(finalValue);
                  handleCellSave(row.id, col.id, col.type, finalValue);
                  setEditingCell(null);
                }}
              />
            </Box>
          );
        }
        // Always enter edit mode on click
        // Deduplicate by email for read mode too
        const seen: Record<string, boolean> = {};
        const people = (Array.isArray(value) ? value : []).filter((person: any) => {
          if (!person.email || seen[person.email]) return false;
          seen[person.email] = true;
          return true;
        });
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, position: 'relative' }}
            onClick={() => {
              handleCellClick(row.id, col.id, value, col.type);
            }}>
            {people.length === 0 ? (
              <Avatar sx={{ width: 28, height: 28, bgcolor: '#bdbdbd', fontSize: 14 }}>-</Avatar>
            ) : (
              <>
                {people.map((person: any) => (
                  <Tooltip key={person.email} title={person.name + (person.email ? ` (${person.email})` : "") }>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#0073ea', fontSize: 14 }}>
                      {person.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
                {people.length > 1 && (
                  <Box sx={{
                    position: 'absolute',
                    top: -8,
                    left: -8,
                    bgcolor: '#e2445c',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    zIndex: 2,
                    boxShadow: '0 0 0 2px #fff',
                  }}>
                    {people.length}
                  </Box>
                )}
              </>
            )}
          </Box>
        );
      }
      // Numbers
      if (col.type === "Numbers") {
        return (
          <TextField
            type="number"
            value={editValue}
            onChange={e => {
              const val = e.target.value;
              if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                setEditValue(val);
              }
            }}
            onBlur={() => handleCellSave(row.id, col.id)}
            onKeyDown={e => e.key === "Enter" && handleCellSave(row.id, col.id)}
            size="small"
            autoFocus
            id={`number-input-${row.id}-${col.id}`}
            name={`number-input-${row.id}-${col.id}`}
            inputProps={{ inputMode: 'decimal', pattern: '^-?\d*\.?\d*$', style: { color: '#fff' } }}
            InputProps={{ style: { color: '#fff' } }}
          />
        );
      }
      // Default: text input
      // Message column: show chat popover trigger
      if (col.type === "Message") {
        return (
          <Button variant="outlined" size="small" onClick={e => handleOpenChat(e, row.id, value || [], col.id)}>
            Chat
          </Button>
        );
      }
      return (
        <TextField
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => handleCellSave(row.id, col.id)}
          onKeyDown={e => e.key === "Enter" && handleCellSave(row.id, col.id)}
          size="small"
          autoFocus
          id={`text-input-${row.id}-${col.id}`}
          name={`text-input-${row.id}-${col.id}`}
          InputProps={{ style: { color: '#fff' } }}
        />
      );
    }
    // --- Read mode ---
    // Country column: always show dropdown with flag icons using effectiveCol (case-insensitive)
    if (effectiveCol.type && effectiveCol.type.toLowerCase() === "country" && effectiveCol.options) {
      // Read mode: styled country display
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#23234a', minHeight: 44, minWidth: 160 }}>
          {countryCodeMap[value as keyof typeof countryCodeMap] ? (
            <Flag country={countryCodeMap[value as keyof typeof countryCodeMap]} size={24} style={{ marginRight: 10, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
          ) : null}
          <Typography sx={{ color: '#fff', fontWeight: 500, fontSize: 15 }}>{value || <span style={{ color: '#888' }}>No country</span>}</Typography>
        </Box>
      );
    }
    // --- Read mode ---
    // Message column: show chat popover trigger
    if (col.type === "Message") {
      return (
        <>
          <Button variant="outlined" size="small" onClick={e => handleOpenChat(e, row.id, value || [], col.id)}>
            Chat
          </Button>
          {chatPopoverKey === `${row.id}-${col.id}` && chatAnchor && (
            <Popover
              open={!!chatAnchor}
              anchorEl={chatAnchor}
              onClose={handleCloseChat}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                sx: {
                  p: 0,
                  minWidth: 340,
                  maxWidth: 420,
                  bgcolor: '#23234a',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(44,45,74,0.25)',
                  border: '2px solid #0073ea',
                }
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', height: 380 }}>
                <Box sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: '#2c2d4a',
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  borderBottom: '1px solid #3a3b5a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}>
                  <Avatar sx={{ bgcolor: '#0073ea', width: 36, height: 36, fontWeight: 700 }}>💬</Avatar>
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Task Chat</Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton size="small" onClick={handleCloseChat} sx={{ color: '#fff' }}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1, bgcolor: '#23234a' }}>
                  {chatMessages.length === 0 ? (
                    <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>No messages yet. Start the conversation!</Typography>
                  ) : (
                    chatMessages.map(msg => (
                      <Box key={msg.id} sx={{ mb: 2, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#0073ea', width: 32, height: 32, fontWeight: 700 }}>{msg.sender[0]}</Avatar>
                        <Box sx={{ bgcolor: '#2c2d4a', borderRadius: 2, px: 2, py: 1, minWidth: 120, maxWidth: 260 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{msg.sender}</Typography>
                          <Typography variant="body1" sx={{ color: '#bfc8e0', fontSize: 15 }}>{msg.text}</Typography>
                          <Typography variant="caption" sx={{ fontSize: 11, color: '#fff' }}>{new Date(msg.timestamp).toLocaleString()}</Typography>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, bgcolor: '#23234a', borderTop: '1px solid #3a3b5a' }}>
                  <TextField
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    size="small"
                    placeholder="Type a fun message..."
                    fullWidth
                    sx={{ bgcolor: '#2c2d4a', color: '#fff', borderRadius: 2, '& .MuiInputBase-input': { color: '#fff' } }}
                  />
                  <Button onClick={handleSendChat} disabled={!chatInput.trim()} variant="contained" sx={{ bgcolor: '#0073ea', color: '#fff', fontWeight: 700, borderRadius: 2, boxShadow: '0 2px 8px #0073ea33' }}>Send</Button>
                </Box>
              </Box>
            </Popover>
          )}
        </>
      );
    }
    // Fix popover anchor to button
    if (col.type === "Files") {
      const files = value && Array.isArray(value) ? value : [];
      // Hidden file input ref
      const fileInputId = `file-input-${row.id}-${col.id}`;
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, cursor: 'pointer' }}
          onClick={e => {
            e.stopPropagation();
            const input = document.getElementById(fileInputId) as HTMLInputElement | null;
            if (input) input.click();
          }}
        >
          {files.length > 0 ? files.map((f: File, i: number) => (
            <Chip
              key={i}
              label={f.name}
              onClick={ev => { ev.stopPropagation(); handleFileClick(f, row.id, col.id); }}
              sx={{ cursor: 'pointer', bgcolor: '#e0e4ef' }}
            />
          )) : (
            <Typography variant="body2" color="text.secondary">Upload file</Typography>
          )}
          <input
            id={fileInputId}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              e.stopPropagation();
              handleFileUpload(row.id, col.id, e.target.files);
              // Reset input so same file can be uploaded again if needed
              (e.target as HTMLInputElement).value = "";
            }}
          />
        </Box>
      );
    }
    if (col.type === "Doc") {
      return (
        <Typography variant="body2" color="primary" sx={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => handleCellClick(row.id, col.id, value)}>
          {value ? value : 'Add doc link'}
        </Typography>
      );
    }
    if (col.type === "Connect") {
      return (
        <Typography variant="body2" color="secondary" sx={{ cursor: 'pointer' }} onClick={() => handleCellClick(row.id, col.id, value)}>
          {value ? value : 'Link to board/row'}
        </Typography>
      );
    }
    if (col.type === "Timeline") {
      return (
        <Typography variant="body2" color="text.secondary" onClick={() => handleCellClick(row.id, col.id, value)}>
          {value && value.start && value.end ? `${value.start} - ${value.end}` : 'Set timeline'}
        </Typography>
      );
    }
    if (col.type === "Checkbox") {
      return (
        <input type="checkbox" checked={!!value} readOnly onClick={() => handleCellClick(row.id, col.id, value)} />
      );
    }
    if (col.type === "Formula") {
      return (
        <Typography variant="body2" color="text.secondary">(auto)</Typography>
      );
    }
    if (col.type === "Extract") {
      return (
        <Typography variant="body2" color="text.secondary">(lookup)</Typography>
      );
    }
    // Priority column as dropdown with colors
    // Priority column as colored chip (read mode only)
    if (col.id === "priority" && col.options && (!editingCell || editingCell.rowId !== row.id || editingCell.colId !== col.id)) {
      const opt = col.options.find((o) => o.value === value);
      return (
        <Chip
          label={value || '-'}
          size="small"
          sx={{ bgcolor: opt?.color || '#e0e4ef', color: '#fff', fontWeight: 600 }}
          onClick={() => handleCellClick(row.id, col.id, value)}
        />
      );
    }
    // Always use dropdown for editing Priority, Status, Dropdown
    if ((col.type === "Status" || col.type === "Dropdown" || col.id === "priority") && col.options) {
      if (editingCell && editingCell.rowId === row.id && editingCell.colId === col.id) {
        return (
          <FormControl size="small" fullWidth>
            <Select
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={() => handleCellSave(row.id, col.id)}
              autoFocus
            >
              {col.options.map((opt, idx) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: opt.color, borderRadius: '50%', mr: 1, display: 'inline-block' }} />
                  {opt.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }
      // Read mode: colored chip
      const opt = col.options.find((o) => o.value === value);
      return (
        <Chip
          label={value || (col.id === "priority" ? '-' : '-')}
          size="small"
          sx={{ bgcolor: opt?.color || '#e0e4ef', color: '#fff', fontWeight: 600 }}
          onClick={() => handleCellClick(row.id, col.id, value)}
        />
      );
    }
    if (col.type === "People") {
      // Show avatars for all assigned people (multi-value)
      const people = Array.isArray(value) ? value : [];
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, position: 'relative' }} onClick={() => handleCellClick(row.id, col.id, value)}>
          {people.length === 0 ? (
            <Avatar sx={{ width: 28, height: 28, bgcolor: '#bdbdbd', fontSize: 14 }}>-</Avatar>
          ) : (
            <>
              {people.map((person: any) => (
                <Tooltip key={person.email} title={person.name + (person.email ? ` (${person.email})` : "") }>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#0073ea', fontSize: 14 }}>
                    {person.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
              {people.length > 1 && (
                <Box sx={{
                  position: 'absolute',
                  top: -8,
                  left: -8,
                  bgcolor: '#e2445c',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  zIndex: 2,
                  boxShadow: '0 0 0 2px #fff',
                }}>
                  {people.length}
                </Box>
              )}
            </>
          )}
        </Box>
      );
    }
    if (col.type === "Date") {
      return (
        <Typography
          variant="body2"
          sx={{ color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          onClick={() => handleCellClick(row.id, col.id, value, col.type)}
        >
          {value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : '-'}
        </Typography>
      );
    }
    return (
      <Typography variant="body2" onClick={() => handleCellClick(row.id, col.id, value)}>
        {value || "-"}
      </Typography>
    );
  };

  // --- JSX ---
  return (
    <Box>
      {/* Rename Column Dialog */}
      <Dialog open={!!renamingColId} onClose={() => setRenamingColId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename Column</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Column Name"
            type="text"
            fullWidth
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && renamingColId && renameValue.trim()) {
                handleRenameColumn(renamingColId, renameValue.trim());
                setRenamingColId(null);
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenamingColId(null)}>Cancel</Button>
          <Button
            onClick={() => {
              if (renamingColId && renameValue.trim()) {
                handleRenameColumn(renamingColId, renameValue.trim());
                setRenamingColId(null);
              }
            }}
            variant="contained"
            disabled={!renameValue.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Column Dialog */}
      <Dialog open={!!deleteColId} onClose={() => setDeleteColId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Column</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this column? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteColId(null)}>Cancel</Button>
          <Button
            onClick={() => {
              if (deleteColId) {
                handleDeleteColumn(deleteColId);
                setDeleteColId(null);
              }
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Column menu for rename/delete */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && !!colMenuId}
        onClose={handleColMenuClose}
        PaperProps={{ sx: { bgcolor: '#2c2d4a', color: '#fff', borderRadius: 2 } }}
      >
        <MenuItem
          onClick={() => {
            setRenamingColId(colMenuId);
            setRenameValue(columns.find(c => c.id === colMenuId)?.name || '');
            handleColMenuClose();
          }}
          sx={{ color: '#fff' }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1, color: '#fff' }} />
          Rename
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteColId(colMenuId);
            handleColMenuClose();
          }}
          sx={{ color: '#e2445c' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1, color: '#e2445c' }} />
          Delete
        </MenuItem>
      </Menu>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddTask} sx={{ color: '#fff' }}>
          New task
        </Button>
        <Button variant="outlined" onClick={(e) => { setShowColSelector(true); setColSelectorAnchor(e.currentTarget); }}>
          + Add column
        </Button>
        {/* ColumnTypeSelector Popover */}
        <Popover
          open={showColSelector}
          anchorEl={colSelectorAnchor}
          onClose={() => setShowColSelector(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={{ sx: { bgcolor: '#23243a', color: '#fff', borderRadius: 3, boxShadow: 6, p: 2 } }}
        >
          <Box sx={{ minWidth: 420 }}>
            <ColumnTypeSelector
              onSelect={(type, label) => {
                handleAddColumn(type, label);
                setShowColSelector(false);
              }}
            />
            <Box sx={{ textAlign: 'right', mt: 2 }}>
              <Button onClick={() => setShowColSelector(false)} sx={{ color: '#fff', fontWeight: 600, borderRadius: 2, px: 3, py: 1, '&:hover': { bgcolor: '#35365a' } }}>Cancel</Button>
            </Box>
          </Box>
        </Popover>
      </Box>
      <DragDropContext onDragEnd={onDragEnd}>
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3,
            boxShadow: 2,
            overflowX: 'auto',
            maxWidth: '100vw',
            '@media (max-width: 900px)': {
              minWidth: 0,
              px: 0,
            },
          }}
        >
          <Table
            sx={{
              background: '#23243a',
              color: '#fff',
              borderRadius: 3,
              minWidth: 650,
              '@media (max-width: 900px)': {
                minWidth: 500,
              },
            }}
          >
            <TableHead>
              <Droppable droppableId="columns-droppable" direction="horizontal" type="column">
                {(provided) => (
                  <TableRow ref={provided.innerRef} {...provided.droppableProps} sx={{ background: '#23243a' }}>
                    {columns.map((col, colIdx) => (
                      <Draggable key={col.id} draggableId={col.id} index={colIdx}>
                        {(provided) => (
                          <TableCell
                            align="left"
                            sx={{ fontWeight: 700, fontSize: 16, color: '#fff', background: '#23243a', borderBottom: '2px solid #35365a' }}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {col.name}
                              <IconButton size="small" sx={{ color: '#bfc8e0' }} onClick={(e) => handleColMenuOpen(e, col.id)}>
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </TableRow>
                )}
              </Droppable>
            </TableHead>
            <Droppable droppableId="rows-droppable" type="row">
              {(provided) => (
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {rows.filter(row => row.id).map((row, rowIdx) => (
                    <Draggable draggableId={String(row.id)} index={rowIdx} key={row.id}>
                      {(provided) => (
                        <TableRow key={row.id} ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} sx={{ background: rowIdx % 2 === 0 ? '#23243a' : '#2c2d4a', '&:hover': { background: '#35365a' } }}>
                          {columns.map((col, colIdx) => (
                            <TableCell
                              key={col.id}
                              align="left"
                              sx={{ cursor: 'pointer', color: '#fff', background: 'inherit', borderBottom: '1.5px solid #35365a' }}
                              onClick={() => {
                                // Always allow single click to enter edit mode for any column
                                handleCellClick(row.id, col.id, row.values[col.id], col.type);
                              }}
                              onDoubleClick={() => {
                                // Also allow double click for legacy/UX reasons
                                handleCellClick(row.id, col.id, row.values[col.id], col.type);
                              }}
                            >
                              {renderCell(row, col)}
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ color: '#fff', background: 'inherit', borderBottom: '1.5px solid #35365a' }}>
                            <TaskRowMenu
                              row={row}
                              onDelete={async () => {
                                setRows(rows => {
                                  if (rows.length <= 1) return rows; // Prevent deleting last row
                                  return rows.filter(r => r.id !== row.id);
                                });
                                // Only delete from backend if more than one row exists
                                if (rows.length > 1) {
                                  await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: row.id }),
                                  });
                                }
                              }}
                              onView={() => setReviewTask(row)}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {/* Add task row */}
                  <TableRow key="add-task-row">
                    {columns.map((col, idx) => (
                      <TableCell key={col.id} align="left" sx={{ background: '#35365a', borderBottom: 'none' }}>
                        {idx === 0 ? (
                          <Button
                            variant="text"
                            startIcon={<AddIcon />}
                            sx={{ color: '#fff', fontWeight: 600, pl: 0, background: '#4f51c0', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                            onClick={handleAddTask}
                          >
                            Add task
                          </Button>
                        ) : null}
                      </TableCell>
                    ))}
                    <TableCell sx={{ background: '#35365a', borderBottom: 'none' }} />
                  </TableRow>
                  {provided.placeholder}
                </TableBody>
              )}
            </Droppable>
          </Table>
        </TableContainer>
      </DragDropContext>

      {/* Task Review Drawer/Dialog with Email Automation */}
      <Dialog
        open={!!reviewTask}
        onClose={handleCloseReview}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            m: 1,
            width: '100%',
            maxWidth: { xs: '100vw', sm: 600 },
            minHeight: 200,
            bgcolor: '#23243a',
            color: '#fff',
            borderRadius: 3,
            boxShadow: 6,
            p: { xs: 1, sm: 3 },
            '@media (max-width: 600px)': {
              maxWidth: '100vw',
              m: 0,
            },
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: '#2c2d4a', color: '#fff', fontWeight: 700, fontSize: 22, borderRadius: 2, mb: 1, px: 3, py: 2 }}>
          Task Details
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#23243a', color: '#fff', px: { xs: 1, sm: 3 }, py: 2 }}>
          {reviewTask && !showEmailAutomation && (
            <Box>
              {columns.map((col) => (
                <Box key={col.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#bfc8e0', fontWeight: 600, fontSize: 15 }}>{col.name}</Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-word', color: '#fff', fontWeight: 500, fontSize: 16 }}>
                    {Array.isArray(reviewTask.values[col.id])
                      ? reviewTask.values[col.id].map((v: any, i: number) => typeof v === 'object' && v !== null ? v.name || v.email || JSON.stringify(v) : String(v)).join(', ')
                      : String(reviewTask.values[col.id] ?? "-")}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1} sx={{ color: '#bfc8e0' }}>Options</Typography>
                <Button variant="outlined" onClick={() => setShowEmailAutomation(true)} sx={{ color: '#fff', borderColor: '#4f51c0', borderRadius: 2, fontWeight: 600, px: 3, py: 1, '&:hover': { bgcolor: '#35365a', borderColor: '#4f51c0' } }}>
                  Email Automation
                </Button>
              </Box>
            </Box>
          )}
          {reviewTask && showEmailAutomation && (
            <Box>
              <Typography variant="h6" mb={2} sx={{ color: '#fff', fontWeight: 700 }}>Email Automation</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ color: '#bfc8e0', fontWeight: 600, mr: 2 }}>Automation Enabled</Typography>
                <Switch
                  checked={automationEnabled}
                  onChange={e => setAutomationEnabled(e.target.checked)}
                  color="primary"
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: automationEnabled ? '#4f51c0' : '#888' } }}
                />
              </Box>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="email-trigger-col-label" sx={{ color: '#bfc8e0' }}>Send email when column is edited</InputLabel>
                <Select
                  labelId="email-trigger-col-label"
                  value={emailTriggerCol || ''}
                  label="Send email when column is edited"
                  onChange={e => setEmailTriggerCol(e.target.value)}
                  sx={{ color: '#fff', bgcolor: '#2c2d4a', borderRadius: 2 }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: '#23243a', color: '#fff' } } }}
                >
                  {columns.map(col => (
                    <MenuItem key={col.id} value={col.id} sx={{ color: '#fff', bgcolor: '#23243a', '&.Mui-selected': { bgcolor: '#35365a' } }}>{col.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="email-cols-label" sx={{ color: '#bfc8e0' }}>Columns to include in email</InputLabel>
                <Select
                  labelId="email-cols-label"
                  multiple
                  value={emailCols}
                  onChange={(e) => setEmailCols(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  renderValue={(selected) => columns.filter((col) => selected.includes(col.id)).map((col) => col.name).join(', ')}
                  sx={{ color: '#fff', bgcolor: '#2c2d4a', borderRadius: 2 }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: '#23243a', color: '#fff' } } }}
                >
                  {columns.map((col) => (
                    <MenuItem key={col.id} value={col.id} sx={{ color: '#fff', bgcolor: '#23243a', '&.Mui-selected': { bgcolor: '#35365a' } }}>
                      <Checkbox checked={emailCols.indexOf(col.id) > -1} sx={{ color: '#4f51c0' }} />
                      <ListItemText primary={col.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="email-recipients-label" sx={{ color: '#bfc8e0' }}>Recipients</InputLabel>
                <Select
                  labelId="email-recipients-label"
                  multiple
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  renderValue={(selected) => selected.map((email: string) => {
                    const person = peopleOptions.find((p: { name: string; email: string }) => p.email === email);
                    return person ? person.name : email;
                  }).join(', ')}
                  sx={{ color: '#fff', bgcolor: '#2c2d4a', borderRadius: 2 }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: '#23243a', color: '#fff' } } }}
                >
                  {peopleOptions.map((person: { name: string; email: string }) => (
                    <MenuItem key={person.email} value={person.email} sx={{ color: '#fff', bgcolor: '#23243a', '&.Mui-selected': { bgcolor: '#35365a' } }}>
                      <Checkbox checked={emailRecipients.indexOf(person.email) > -1} sx={{ color: '#4f51c0' }} />
                      <ListItemText primary={person.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button variant="outlined" onClick={() => setShowEmailAutomation(false)} sx={{ color: '#fff', borderColor: '#4f51c0', borderRadius: 2, fontWeight: 600, px: 3, py: 1, '&:hover': { bgcolor: '#35365a', borderColor: '#4f51c0' } }}>Back</Button>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ bgcolor: '#4f51c0', color: '#fff', borderRadius: 2, fontWeight: 700, px: 3, py: 1, boxShadow: 2, '&:hover': { bgcolor: '#35365a' } }}
                  onClick={async () => {
                    // Save automation settings to backend
                    await fetch(getApiUrl(`/automation/${tableId}`), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        enabled: automationEnabled,
                        triggerCol: emailTriggerCol,
                        cols: emailCols,
                        recipients: emailRecipients
                      })
                    });
                    setShowEmailAutomation(false);
                  }}
                >
                  Save Automation
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#2c2d4a', borderRadius: 2, p: 2 }}>
          <Button onClick={handleCloseReview} sx={{ color: '#fff', fontWeight: 600, borderRadius: 2, px: 3, py: 1, '&:hover': { bgcolor: '#35365a' } }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
