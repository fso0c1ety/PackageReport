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
import TimelineIcon from "@mui/icons-material/Timeline";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DateRangeIcon from "@mui/icons-material/DateRange";
import DescriptionIcon from "@mui/icons-material/Description";
import Flag from "react-flagkit";
// Country name to ISO 3166-1 alpha-2 code mapping for react-flagkit
const countryCodeMap: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD", "Angola": "AO", "Antigua and Barbuda": "AG", "Argentina": "AR", "Armenia": "AM", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE", "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT", "Bolivia": "BO", "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "Brunei": "BN", "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cabo Verde": "CV", "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA", "Central African Republic": "CF", "Chad": "TD", "Chile": "CL", "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo (Congo-Brazzaville)": "CG", "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czechia (Czech Republic)": "CZ", "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO", "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE", "Eswatini (fmr. 'Swaziland')": "SZ", "Ethiopia": "ET", "Fiji": "FJ", "Finland": "FI", "France": "FR", "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE", "Ghana": "GH", "Greece": "GR", "Grenada": "GD", "Guatemala": "GT", "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY", "Haiti": "HT", "Honduras": "HN", "Hungary": "HU", "Iceland": "IS", "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "Kuwait": "KW", "Kyrgyzstan": "KG", "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR", "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU", "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV", "Mali": "ML", "Malta": "MT", "Marshall Islands": "MH", "Mauritania": "MR", "Mauritius": "MU", "Mexico": "MX", "Micronesia": "FM", "Moldova": "MD", "Monaco": "MC", "Mongolia": "MN", "Montenegro": "ME", "Morocco": "MA", "Mozambique": "MZ", "Myanmar (Burma)": "MM", "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK", "Norway": "NO", "Oman": "OM", "Pakistan": "PK", "Palau": "PW", "Palestine State": "PS", "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA", "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC", "Saint Vincent and the Grenadines": "VC", "Samoa": "WS", "San Marino": "SM", "Sao Tome and Principe": "ST", "Saudi Arabia": "SA", "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR", "Sweden": "SE", "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ", "Thailand": "TH", "Timor-Leste": "TL", "Togo": "TG", "Tonga": "TO", "Trinidad and Tobago": "TT", "Tunisia": "TN", "Turkey": "TR", "Turkmenistan": "TM", "Tuvalu": "TV", "Uganda": "UG", "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB", "United States of America": "US", "Uruguay": "UY", "Uzbekistan": "UZ", "Vanuatu": "VU", "Vatican City": "VA", "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW"
};
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
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
  Popover,
  InputAdornment
} from "@mui/material";
import PeopleSelector from "./PeopleSelector";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import ColumnTypeSelector from "./ColumnTypeSelector";
import { Column, Row, ColumnType, ColumnOption } from "../types";

// Columns will be loaded dynamically from backend; do not use hardcoded IDs.
const initialColumns: Column[] = [];

import { getApiUrl, SERVER_URL } from "./apiUrl";

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
      // Workspace view state
      const [workspaceView, setWorkspaceView] = useState<'table' | 'kanban' | 'gantt' | 'calendar' | 'doc' | 'gallery'>('table');
      const [filterText, setFilterText] = useState("");
      const [filterPerson, setFilterPerson] = useState<string[]>([]);
      const [filterStatus, setFilterStatus] = useState<string[]>([]);
      // Current date for calendar view
      const [currentDate, setCurrentDate] = useState(dayjs());
      // Document view state
      const [docContent, setDocContent] = useState("");
      const [docSaving, setDocSaving] = useState(false);
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
  const [automationLoading, setAutomationLoading] = useState(false);
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
  const [editAnchorEl, setEditAnchorEl] = useState<null | HTMLElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(null);
  const [renameAnchorEl, setRenameAnchorEl] = useState<null | HTMLElement>(null);
  const [colMenuId, setColMenuId] = useState<string | null>(null);
  const [showColSelector, setShowColSelector] = useState(false);
  const [colSelectorAnchor, setColSelectorAnchor] = useState<null | HTMLElement>(null);
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteColId, setDeleteColId] = useState<string | null>(null);
  const [fileDialog, setFileDialog] = useState<{ open: boolean; file: any | null; rowId: string | null; colId: string | null }>({ open: false, file: null, rowId: null, colId: null });
  const [fileComment, setFileComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [automationEnabled, setAutomationEnabled] = useState(true);

  // --- Fetch columns and tasks from backend on mount ---
  useEffect(() => {
    setLoading(true);
    // Fetch fresh data when tableId changes
    fetch(getApiUrl(`/tables`))
      .then((res) => res.json())
      .then((tables) => {
        const table = tables.find((t: any) => t.id === tableId);
        if (table) {
          setColumns(table.columns || []);
          // Only update docContent if it's different to avoid overwrite or loop
          // But here, we are mounting/switching table, so we should trust backend
          setDocContent(table.docContent || "");
        }
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


  // Debounced save for document content
  useEffect(() => {
    // Save regardless of current view if docContent changes or tableId changes
    if (docContent === undefined) return; 

    const timeout = setTimeout(() => {
      setDocSaving(true);
      fetch(getApiUrl(`/tables/${tableId}/doc`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: docContent }),
      })
      .then(res => {
         if (!res.ok) console.error('Failed to save doc');
      })
      .finally(() => {
        setDocSaving(false);
      });
    }, 2000);
    return () => clearTimeout(timeout);
  }, [docContent, tableId]); // Removed workspaceView dependency

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
      // Persist new column order to backend
      await fetch(getApiUrl(`/tables/${tableId}/columns`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns: newColumns }),
      });
      // Reload columns from backend to ensure persistence
      const tablesRes = await fetch(getApiUrl(`/tables`));
      const tables = await tablesRes.json();
      const table = tables.find((t: any) => t.id === tableId);
      if (table) setColumns(table.columns || []);
      return;
    }
    // Row drag
    if (result.type === undefined || result.type === 'row' || result.type === 'default') {
      const newRows = Array.from(rows);
      const [removed] = newRows.splice(result.source.index, 1);
      newRows.splice(result.destination.index, 0, removed);
      // Ensure all rows have unique, non-empty ids
      const allIds = newRows.map(r => r.id);
      const hasDuplicates = allIds.length !== new Set(allIds).size;
      const hasMissing = allIds.some(id => !id);
      if (hasDuplicates) {
        console.error('Duplicate row ids detected:', allIds);
      }
      if (hasMissing) {
        console.error('Some rows are missing ids:', newRows);
      }
      setRows(newRows);
      // Persist new row order to backend (send only orderedTaskIds)
      await fetch(getApiUrl(`/tables/${tableId}/tasks/order`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedTaskIds: newRows.map(r => r.id) }),
      });
      // Reload rows from backend to ensure persistence
      const res = await fetch(getApiUrl(`/tables/${tableId}/tasks`));
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setRows(data);
      }
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
  const handleCellClick = (rowId: string, colId: string, value: any, colType?: string, anchor?: HTMLElement) => {
    // Only enter edit mode if not already editing this cell
    // Set anchor for popover-based editors
    if (anchor) setEditAnchorEl(anchor);
    
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
      } else if (colType === "Timeline") {
         setEditValue({
           start: value?.start ? dayjs(value.start) : null,
           end: value?.end ? dayjs(value.end) : null
         });
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
    if (colType === "Timeline") {
        const start = newValue?.start && dayjs(newValue.start).isValid() ? dayjs(newValue.start).format("YYYY-MM-DD") : null;
        const end = newValue?.end && dayjs(newValue.end).isValid() ? dayjs(newValue.end).format("YYYY-MM-DD") : null;
        newValue = { start, end };
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

  // File upload for Files column - UPDATED for Server Upload
  const handleFileUpload = async (rowId: string, colId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      console.log('Starting file upload for row:', rowId, 'files:', files.length);

      // 1. Upload each file to server
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const res = await fetch(getApiUrl('/upload'), {
             method: 'POST',
             body: formData,
          });
          
          if (!res.ok) {
            console.error('Upload failed for file:', file.name);
            return null;
          }
          
          const data = await res.json();
          // Return object with metadata + url
          return {
             name: data.name || file.name,
             url: data.url,
             type: file.type,
             size: file.size,
             originalName: data.originalName,
             uploadedAt: new Date().toISOString()
          };
        } catch (err) {
          console.error('File upload error:', err);
          return null;
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const validFiles = uploadedFiles.filter((f): f is NonNullable<typeof f> => f !== null);
      
      if (validFiles.length === 0) {
        console.warn('No files were successfully uploaded');
        return;
      }

      console.log('Successfully uploaded files:', validFiles);

      // 2. Update Row State & Persist
      
      // Calculate new state first to avoid async state update issues
      const targetRow = rows.find(r => r.id === rowId);
      if (targetRow) {
         const prevFiles = Array.isArray(targetRow.values[colId]) ? targetRow.values[colId] : [];
         const newFiles = [...prevFiles, ...validFiles];
         const newRowValues = { ...targetRow.values, [colId]: newFiles };

         // Update local state
         setRows(prevRows => prevRows.map(r => r.id === rowId ? { ...r, values: newRowValues } : r));

         // Update backend
         await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ id: rowId, values: newRowValues }),
         });
      }

    } catch (error) {
      console.error("Error in handleFileUpload:", error);
    }

    setEditingCell(null);
    setEditValue("");
  };

  // File dialog open/close
  const handleFileClick = (file: any, rowId: string, colId: string) => {
    setFileDialog({ open: true, file, rowId, colId });
  };
  const handleFileDelete = async () => {
    if (!fileDialog.file || !fileDialog.rowId || !fileDialog.colId) return;
    const colId = fileDialog.colId;
    const rowId = fileDialog.rowId;
    
    // Calculate new values first
    let newValues: any = null;
    
    setRows(prevRows => {
      const targetRow = prevRows.find(r => r.id === rowId);
      if (!targetRow) return prevRows;

      const files = Array.isArray(targetRow.values[colId]) ? targetRow.values[colId] : [];
      const newFiles = files.filter((f: any) => f !== fileDialog.file);
      
      newValues = { ...targetRow.values, [colId]: newFiles };

      // Return updated rows
      return prevRows.map(row => 
        row.id === rowId ? { ...row, values: newValues } : row
      );
    });

    // Save to backend using the calculated values
    // Note: We need to trust that the row exists since we found it in state
    // To be safe, we check newValues. But since setRows is async/batched, 
    // we should re-calculate specifically for the API call or use the result from above.
    // However, since we can't extract return value from setRows, we duplicate logic slightly 
    // OR we just use the prevRows approach but outside.
    
    // Better approach:
    const currentRow = rows.find(r => r.id === rowId);
    if (currentRow) {
       const currentFiles = Array.isArray(currentRow.values[colId]) ? currentRow.values[colId] : [];
       const nextFiles = currentFiles.filter((f: any) => f !== fileDialog.file);
       const nextValues = { ...currentRow.values, [colId]: nextFiles };
       
       await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rowId, values: nextValues }),
       });
    }

    setFileDialog({ open: false, file: null, rowId: null, colId: null });
  };

  const handleFileCommentSubmit = async () => {
    if (!fileComment.trim() || !fileDialog.file || !fileDialog.rowId || !fileDialog.colId) return;
    
    const { rowId, colId, file: targetFile } = fileDialog;
    
    const newComment = {
      id: uuidv4(),
      text: fileComment,
      createdAt: new Date().toISOString(),
      user: "User" // Or use actual user info if available
    };

    let updatedFile: any = null;
    let nextRows: Row[] = [];

    // Calculate new state based on current rows
    const currentRow = rows.find(r => r.id === rowId);
    if (!currentRow) return;

    const currentFiles = Array.isArray(currentRow.values[colId]) ? currentRow.values[colId] : [];
    const updatedFiles = currentFiles.map((f: any) => {
        // Find by reference or unique property (URL is good for uploads)
        if (f === targetFile || (f.url && f.url === targetFile.url)) {
            updatedFile = { ...f, comments: [...(f.comments || []), newComment] };
            return updatedFile;
        }
        return f;
    });

    if (!updatedFile) return;

    const newValues = { ...currentRow.values, [colId]: updatedFiles };
    
    // Update local state
    setRows(prevRows => prevRows.map(r => r.id === rowId ? { ...r, values: newValues } : r));
    
    // Update dialog file reference immediately to show new comment
    setFileDialog(prev => ({ ...prev, file: updatedFile }));
    setFileComment("");

    // Persist to backend
    await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, values: newValues }),
    });
  };

  // Filter options
  const availablePeople = React.useMemo(() => {
    const people = new Set<string>();
    const peopleCols = columns.filter(c => c.type === 'People');
    rows.forEach(r => {
      peopleCols.forEach(c => {
         const cellVal = r.values[c.id];
         if (Array.isArray(cellVal)) {
           cellVal.forEach((p: any) => {
             if (p.name) people.add(p.name);
             // else if (p.email) people.add(p.email); // Use name primarily
           });
         }
      });
    });
    return Array.from(people).sort();
  }, [rows, columns]);

  const availableStatuses = React.useMemo(() => {
    const statuses = new Set<string>();
    const statusCols = columns.filter(c => c.type === 'Status');
    statusCols.forEach(c => {
       if (c.options) {
         c.options.forEach(o => statuses.add(o.value));
       }
    });
    return Array.from(statuses).sort();
  }, [columns]);

  // Filter logic
  const filteredRows = React.useMemo(() => {
    if (!filterText && filterPerson.length === 0 && filterStatus.length === 0) return rows;
    const lowerFilter = filterText.toLowerCase();
    
    return rows.filter(row => {
      // 1. Text Filter
      const textMatch = !filterText || Object.values(row.values).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string') {
            return val.toLowerCase().includes(lowerFilter);
        }
        if (typeof val === 'number') {
            return val.toString().includes(lowerFilter);
        }
        if (Array.isArray(val)) {
            return val.some((v: any) => {
               if (typeof v === 'string') return v.toLowerCase().includes(lowerFilter);
               if (v && typeof v === 'object') {
                   return (v.name && v.name.toLowerCase().includes(lowerFilter)) || 
                          (v.email && v.email.toLowerCase().includes(lowerFilter)) ||
                          (v.originalName && v.originalName.toLowerCase().includes(lowerFilter)); 
               }
               return false;
            });
        }
        if (typeof val === 'object') {
            if (val.start && val.end) {
                return val.start.includes(lowerFilter) || val.end.includes(lowerFilter);
            }
        }
        return false;
      });
      if (!textMatch) return false;

      // 2. People Filter
      if (filterPerson.length > 0) {
        const peopleCols = columns.filter(c => c.type === 'People');
        const hasPerson = peopleCols.some(col => {
           const val = row.values[col.id];
           if (Array.isArray(val)) {
             return val.some((p: any) => filterPerson.includes(p.name)); // Match by name
           }
           return false;
        });
        if (!hasPerson) return false;
      }

      // 3. Status Filter
      if (filterStatus.length > 0) {
        const statusCols = columns.filter(c => c.type === 'Status');
        const hasStatus = statusCols.some(col => {
           const val = row.values[col.id];
           return filterStatus.includes(val);
        });
        if (!hasStatus) return false;
      }

      return true;
    });
  }, [rows, filterText, filterPerson, filterStatus, columns]);

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

  const handleEditStatusLabel = (colId: string, idx: number, newValue: string) => {
    // Also update the local state while typing
    setLabelEdits(prev => ({
      ...prev,
      [colId]: { ...(prev[colId] || {}), [idx]: newValue }
    }));
  };

  const handleSaveStatusLabel = async (colId: string, idx: number) => {
    const newLabel = labelEdits[colId]?.[idx]?.trim();
    if (!newLabel) return;
    
    // Find column to get old value
    const col = columns.find(c => c.id === colId);
    const oldOption = col?.options?.[idx];
    if (!oldOption) return;

    // Update columns
    const params = { columns: [] as Column[] }; // Placeholder to capture updated columns
    
    setColumns(cols => {
      const updated = cols.map(c =>
        c.id === colId && c.options
          ? {
              ...c,
              options: c.options.map((opt, i) =>
                i === idx ? { ...opt, value: newLabel } : opt
              ),
            }
          : c
      );
      params.columns = updated;
      return updated;
    });

    // Persist columns
    await fetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: params.columns }),
    });

    // Update all rows that used this value
    const updatedRows = rows.map(r => {
      if (r.values[colId] === oldOption.value) {
        return { ...r, values: { ...r.values, [colId]: newLabel } };
      }
      return r;
    });
    setRows(updatedRows);

    // Persist rows (batch or individually)
    // For simplicity, we just persist the ones that changed
    updatedRows.forEach(r => {
      if (r.values[colId] === newLabel && r.values[colId] !== oldOption.value) {
        fetch(getApiUrl(`/tables/${tableId}/tasks`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: r.id, values: r.values }),
        });
      }
    });

    // Clear edit state
    setLabelEdits(edits => {
        const updated = { ...edits[colId] };
        delete updated[idx];
        return { ...edits, [colId]: updated };
    });
  };

  const handleEditStatusColor = (colId: string, idx: number, color: string) => {
    let updatedCols: Column[] = [];
    setColumns(cols => {
      updatedCols = cols.map(col =>
        col.id === colId && col.options
          ? {
              ...col,
              options: col.options.map((opt, i) =>
                i === idx ? { ...opt, color } : opt
              ),
            }
          : col
      );
      return updatedCols;
    });
    
    // Persist immediately
    fetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedCols }),
    });
  };

  const handleAddStatusLabel = (colId: string) => {
    if (!newStatusLabel.trim()) return;
    let updatedCols: Column[] = [];
    
    setColumns(cols => {
      updatedCols = cols.map(col =>
        col.id === colId && col.options && !col.options.some(opt => opt.value === newStatusLabel.trim())
          ? {
              ...col,
              options: [...col.options, { value: newStatusLabel.trim(), color: newStatusColor }],
            }
          : col
      );
      return updatedCols;
    });

    fetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedCols }),
    });

    setNewStatusLabel("");
    setNewStatusColor("#e0e4ef");
  };

  const handleDeleteStatusLabel = async (colId: string, idx: number) => {
    let updatedCols: Column[] = [];
    setColumns(cols => {
      updatedCols = cols.map(col =>
        col.id === colId && col.options
          ? {
              ...col,
              options: col.options.filter((_, i) => i !== idx),
            }
          : col
      );
      return updatedCols;
    });
    
    await fetch(getApiUrl(`/tables/${tableId}/columns`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedCols }),
    });

    // Also clear value from rows
    const col = columns.find(c => c.id === colId);
    const deletedOption = col?.options?.[idx];
    
    if (deletedOption) {
        setRows(prevRows =>
          prevRows.map(row => {
            if (row.values[colId] === deletedOption.value) {
                // Update backend as well
                const newValues = { ...row.values, [colId]: "" };
                fetch(getApiUrl(`/tables/${tableId}/tasks`), {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: row.id, values: newValues }),
                });
                return { ...row, values: newValues };
            }
            return row;
          })
        );
    }
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
    
    // Status/Dropdown/Priority - Modern status picker
    // Moved ABOVE the generic editing block so it takes precedence
    if (effectiveCol.type === "Status" || effectiveCol.type === "Dropdown" || effectiveCol.id === "priority") {
      const options = effectiveCol.options || [];
      const isEditing = editingCell && editingCell.rowId === row.id && editingCell.colId === col.id;
      const isLabelEditing = editingLabelsColId === effectiveCol.id;
      const currentOption = options.find(o => o.value === value) || { value: value || '-', color: '#e0e4ef' };
      
      return (
        <>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setStatusAnchor(e.currentTarget);
              setEditingCell({ rowId: row.id, colId: col.id });
            }}
            sx={{
              bgcolor: currentOption.color,
              color: '#fff',
              borderRadius: '4px',
              textAlign: 'center',
              py: 0.5,
              px: 1,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              minWidth: 100,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'filter 0.2s',
              '&:hover': { filter: 'brightness(1.1)' },
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {currentOption.value}
            </Typography>
          </Box>

          {/* Status Picker Popover */}
          {isEditing && (
            <Popover
              open={Boolean(statusAnchor)}
              anchorEl={statusAnchor}
              onClose={() => {
                setStatusAnchor(null);
                setEditingCell(null);
                setEditingLabelsColId(null);
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  p: 2,
                  bgcolor: '#23243a',
                  color: '#fff',
                  borderRadius: 3,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  border: '1px solid #3a3b5a',
                  minWidth: 220,
                  maxWidth: 280
                }
              }}
            >
              {!isLabelEditing ? (
                /* Standard Selection Mode */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#7d82a8', mb: 0.5, fontWeight: 600, textTransform: 'uppercase' }}>
                    Select Status
                  </Typography>
                  {options.map((opt) => (
                    <Box
                      key={opt.value}
                      onClick={() => {
                        handleCellSave(row.id, col.id, col.type, opt.value);
                        setStatusAnchor(null);
                        setEditingCell(null);
                      }}
                      sx={{
                        bgcolor: opt.color,
                        color: '#fff',
                        borderRadius: '4px',
                        py: 1,
                        px: 2,
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontWeight: 500,
                        transition: 'transform 0.1s',
                        '&:hover': { transform: 'scale(1.02)', filter: 'brightness(1.1)' }
                      }}
                    >
                      {opt.value}
                    </Box>
                  ))}
                  <Box sx={{ borderTop: '1px solid #3a3b5a', mt: 1, pt: 1, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                      onClick={() => setEditingLabelsColId(effectiveCol.id)}
                      sx={{ 
                        color: '#7d82a8', 
                        textTransform: 'none', 
                        fontSize: '0.8rem',
                        background: 'transparent',
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                        '&:hover': { 
                          color: '#fff', 
                          bgcolor: 'rgba(255,255,255,0.05)',
                          background: 'rgba(255,255,255,0.05)',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          boxShadow: 'none'
                        } 
                      }}
                    >
                      Edit Labels
                    </Button>
                  </Box>
                </Box>
              ) : (
                /* Edit Labels Mode */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#7d82a8', fontWeight: 600, textTransform: 'uppercase' }}>
                      Edit Labels
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setEditingLabelsColId(null)}
                      sx={{ color: '#fff', minWidth: 'auto', p: 0.5 }}
                    >
                      Done
                    </Button>
                  </Box>
                  
                  <Box sx={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {options.map((opt, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input
                          type="color"
                          value={opt.color}
                          onChange={(e) => handleEditStatusColor(effectiveCol.id, idx, e.target.value)}
                          style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }}
                        />
                        <input
                          type="text"
                          value={labelEdits[effectiveCol.id]?.[idx] ?? opt.value}
                          onChange={(e) => handleEditStatusLabel(effectiveCol.id, idx, e.target.value)}
                          onBlur={() => handleSaveStatusLabel(effectiveCol.id, idx)}
                          style={{ 
                            flex: 1, 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid #3a3b5a', 
                            color: '#fff', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontSize: '0.875rem'
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteStatusLabel(effectiveCol.id, idx)}
                          sx={{ color: '#e2445c', p: 0.5, '&:hover': { bgcolor: 'rgba(226,68,92,0.1)' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ borderTop: '1px solid #3a3b5a', pt: 1.5, display: 'flex', gap: 1 }}>
                    <input
                      type="color"
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      placeholder="New label"
                      value={newStatusLabel}
                      onChange={(e) => setNewStatusLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStatusLabel(effectiveCol.id)}
                      style={{ 
                        flex: 1, 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid #3a3b5a', 
                        color: '#fff', 
                            padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleAddStatusLabel(effectiveCol.id)}
                      disabled={!newStatusLabel.trim()}
                      sx={{ bgcolor: '#4f51c0', color: '#fff', borderRadius: 1, '&:hover': { bgcolor: '#5a5ccf' }, '&.Mui-disabled': { opacity: 0.5 } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Popover>
          )}
        </>
      );
    }
    
    // People Column - Modern
    if (col.type === "People") {
      const people = Array.isArray(value) ? value : [];
      const isEditing = editingCell && editingCell.rowId === row.id && editingCell.colId === col.id;
      
      // Calculate displayed people vs overflow
      const maxDisplay = 3;
      const displayPeople = people.slice(0, maxDisplay);
      const overflow = people.length - maxDisplay;

      return (
        <>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setStatusAnchor(e.currentTarget);
              setEditingCell({ rowId: row.id, colId: col.id });
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              minHeight: 32,
              borderRadius: '18px',
              transition: 'all 0.2s',
              gap: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            {people.length === 0 ? (
              <Box sx={{ 
                width: 28, 
                height: 28, 
                borderRadius: '50%', 
                border: '1px dashed #5a5b7a', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#7d82a8'
              }}>
                <AddIcon sx={{ fontSize: 16 }} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5 }}>
                {displayPeople.map((p, i) => (
                  <Tooltip key={p.email || i} title={p.name}>
                    <Avatar 
                      sx={{ 
                        width: 28, 
                        height: 28, 
                        fontSize: 12, 
                        bgcolor: '#0073ea',
                        border: '2px solid #23243a',
                        ml: i > 0 ? -1 : 0,
                        zIndex: 10 - i
                      }}
                    >
                      {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                    </Avatar>
                  </Tooltip>
                ))}
                {overflow > 0 && (
                  <Box sx={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    bgcolor: '#3b3c5a', 
                    color: '#fff', 
                    fontSize: 11, 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '2px solid #23243a',
                    ml: -1,
                    zIndex: 0
                  }}>
                    +{overflow}
                  </Box>
                )}
              </Box>
            )}
            
            {/* Quick add button visible on hover or if empty 
               (Optional, keeping clean for now)
            */}
          </Box>

          {isEditing && (
            <Popover
              open={Boolean(statusAnchor)}
              anchorEl={statusAnchor}
              onClose={() => {
                setStatusAnchor(null);
                setEditingCell(null);
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  width: 300,
                  bgcolor: '#23243a',
                  color: '#fff',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  border: '1px solid #3a3b5a'
                }
              }}
            >
              <Box sx={{ p: 2 }}>
                <Typography variant="caption" sx={{ color: '#7d82a8', fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                  Assigned People
                </Typography>
                
                {/* Search / Add */}
                <PeopleSelector
                  value={people}
                  onChange={(newPeople) => {
                    handleCellSave(row.id, col.id, col.type, newPeople);
                    // Keep popover open to allow multiple adds
                  }}
                  onClose={() => { /* Handled solely by Popover onClose */ }}
                />

                {/* Current People List */}
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {people.length === 0 && (
                    <Typography variant="body2" sx={{ color: '#5a5b7a', fontStyle: 'italic' }}>
                      No one assigned
                    </Typography>
                  )}
                  {people.map((p) => (
                    <Box key={p.email} sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      bgcolor: 'rgba(255,255,255,0.03)',
                      borderRadius: 2,
                      p: 1
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: '#0073ea' }}>
                          {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.name}</Typography>
                          <Typography variant="caption" sx={{ color: '#7d82a8', display: 'block', lineHeight: 1 }}>{p.email}</Typography>
                        </Box>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          const newPeople = people.filter(person => person.email !== p.email);
                          handleCellSave(row.id, col.id, col.type, newPeople);
                        }}
                        sx={{ color: '#5a5b7a', '&:hover': { color: '#e2445c', bgcolor: 'rgba(226,68,92,0.1)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Popover>
          )}
        </>
      );
    }

    if (editingCell && editingCell.rowId === row.id && editingCell.colId === col.id) {
      // Country column: dropdown in edit mode (case-insensitive)
      if (effectiveCol.type && effectiveCol.type.toLowerCase() === "country" && effectiveCol.options) {
        return (
          <FormControl size="small" fullWidth sx={{ minWidth: 160 }}>
            <Select
              value={value || ""}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log("Country changed:", newValue);
                setEditingCell(null);
                handleCellSave(row.id, col.id, col.type, newValue);
              }}
              autoFocus
              displayEmpty
              renderValue={(selected: any) => {
                if (!selected) {
                   return <span style={{ color: '#888' }}>Select country</span>;
                }
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 2, bgcolor: '#23234a' }}>
                    {countryCodeMap[selected as keyof typeof countryCodeMap] ? (
                      <Flag country={countryCodeMap[selected as keyof typeof countryCodeMap]} size={24} style={{ marginRight: 10, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
                    ) : null}
                    <Typography sx={{ color: '#fff', fontWeight: 500, fontSize: 15 }}>{selected}</Typography>
                  </Box>
                )
              }}
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


      // Message column: show chat popover trigger in edit mode
      // ...existing code...
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

      // Timeline
      if (col.type === "Timeline") {
        return (
          <Box
             ref={(node: HTMLElement | null) => {
               if (node && !editAnchorEl) {
                 setEditAnchorEl(node);
               }
             }}
             sx={{ 
                width: '100%', 
                height: 32, 
                display: 'flex', 
                alignItems: 'center',
                px: 1,
                bgcolor: '#2c2d4a',
                borderRadius: 2
             }}
          >
           <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.875rem' }}>
              {editValue && editValue.start && editValue.end ? `${dayjs(editValue.start).format('YYYY-MM-DD')} - ${dayjs(editValue.end).format('YYYY-MM-DD')}` : 'Set timeline'}
           </Typography>
           <Popover
            open={Boolean(editAnchorEl)}
            anchorEl={editAnchorEl}
            onClose={() => handleCellSave(row.id, col.id, col.type, editValue)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            PaperProps={{ sx: { bgcolor: '#2c2d4a', p: 2, borderRadius: 2, boxShadow: 6, border: '1px solid #3f4060', mt: 1 } }}
          >
             <Stack direction="row" spacing={1} alignItems="center">
                <DatePicker
                  label="Start"
                  value={editValue?.start || null}
                  onChange={(newDate: any) => setEditValue((prev: any) => ({ ...prev, start: newDate }))}
                  slotProps={{ 
                    textField: { 
                      size: 'small', 
                      sx: { 
                        width: 140, 
                        bgcolor: '#1e1f2b', 
                        input: { color: '#fff' }, 
                        label: { color: '#7d82a8' },
                        '& .MuiInputLabel-root': { color: '#7d82a8' },
                        '& .MuiInputBase-input': { color: '#fff' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3f4060' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#5f6190' },
                        '& .MuiSvgIcon-root': { color: '#7d82a8' }
                      } 
                    },
                    openPickerIcon: { sx: { color: "#bfc8e0" } }
                  }}
                />
                <Typography sx={{ color: '#7d82a8' }}>to</Typography>
                <DatePicker
                  label="End"
                  value={editValue?.end || null}
                  onChange={(newDate: any) => setEditValue((prev: any) => ({ ...prev, end: newDate }))}
                  slotProps={{ 
                    textField: { 
                      size: 'small', 
                      sx: { 
                        width: 140, 
                        bgcolor: '#1e1f2b', 
                        input: { color: '#fff' }, 
                        label: { color: '#7d82a8' },
                        '& .MuiInputLabel-root': { color: '#7d82a8' },
                        '& .MuiInputBase-input': { color: '#fff' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3f4060' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#5f6190' },
                        '& .MuiSvgIcon-root': { color: '#7d82a8' }
                      } 
                    },
                    openPickerIcon: { sx: { color: "#bfc8e0" } }
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleCellSave(row.id, col.id, col.type, editValue); }}
                  sx={{ color: '#00c875', bgcolor: 'rgba(0, 200, 117, 0.1)', '&:hover': { bgcolor: 'rgba(0, 200, 117, 0.2)' } }}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
             </Stack>
          </Popover>
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
      
      // Checkbox
      if (col.type === "Checkbox") {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 1 }}>
            <Checkbox
              checked={!!editValue}
              onChange={(e) => {
                 setEditValue(e.target.checked);
                 handleCellSave(row.id, col.id, col.type, e.target.checked);
              }}
              sx={{ 
                color: '#7d82a8',
                '&.Mui-checked': { color: '#00c875' }
              }}
              autoFocus
            />
          </Box>
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
        <Box 
          onClick={() => handleCellClick(row.id, col.id, value)} 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#23234a', minHeight: 44, minWidth: 160, cursor: 'pointer', '&:hover': { bgcolor: '#2c2d4a', cursor: 'pointer' } }}
        >
          {countryCodeMap[value as keyof typeof countryCodeMap] ? (
            <Flag country={countryCodeMap[value as keyof typeof countryCodeMap]} size={24} style={{ marginRight: 10, borderRadius: 4, boxShadow: '0 1px 4px #0002' }} />
          ) : null}
          <Typography sx={{ color: '#fff', fontWeight: 500, fontSize: 15 }}>{value || <span style={{ color: '#888' }}>Select Country</span>}</Typography>
        </Box>
      );
    }
    // --- Read mode ---
      // ...existing code...
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
        <Box 
          id={`cell-${row.id}-${col.id}`}
          onClick={(e) => handleCellClick(row.id, col.id, value, col.type, e.currentTarget)}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer', 
            width: '100%',
            height: 32,
            px: 1,
            borderRadius: 2,
            transition: 'all 0.2s',
            '&:hover': { bgcolor: '#2c2d4a', boxShadow: '0 0 0 1px #3f4060' }
          }}
        >
          <TimelineIcon sx={{ fontSize: 16, mr: 1, color: '#7d82a8' }} />
          <Typography variant="body2" sx={{ color: value?.start ? '#fff' : '#7d82a8', fontSize: '0.875rem' }}>
             {value && value.start && value.end ? `${value.start} - ${value.end}` : 'Set timeline'}
          </Typography>
        </Box>
      );
    }
    if (col.type === "Checkbox") {
      return (
        <Box 
          sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 1, cursor: 'pointer' }}
          onClick={() => handleCellSave(row.id, col.id, col.type, !value)}
        >
          <Checkbox 
            checked={!!value} 
            readOnly 
            sx={{ 
              color: '#7d82a8',
              '&.Mui-checked': { color: '#00c875' },
              p: 0
            }} 
          />
        </Box>
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


    if (col.type === "Date") {
      return (
        <Box 
          sx={{ 
            cursor: 'pointer', 
            minHeight: 32, 
            display: 'flex', 
            alignItems: 'center', 
            borderRadius: 2, 
            px: 1.5,
            transition: 'all 0.2s',
            '&:hover': { bgcolor: '#2c2d4a', boxShadow: '0 0 0 1px #3f4060' }
          }}
          onClick={() => handleCellClick(row.id, col.id, value, col.type)}
        >
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>
            {value && dayjs(value).isValid() ? dayjs(value).format('MMM D, YYYY') : '-'}
          </Typography>
        </Box>
      );
    }
    return (
      <Box 
        sx={{ 
          cursor: 'pointer', 
          minHeight: 32, 
          display: 'flex', 
          alignItems: 'center', 
          borderRadius: 2, 
          px: 1,
          ml: -1, /* Offset the cell padding so it aligns nicely */
          transition: 'all 0.2s',
          '&:hover': { bgcolor: '#2c2d4a', boxShadow: '0 0 0 1px #3f4060' }
        }}
        onClick={() => handleCellClick(row.id, col.id, value)}
      >
        <Typography variant="body2" sx={{ color: '#d0d4e4', fontSize: '0.875rem' }}>
          {value || "-"}
        </Typography>
      </Box>
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5, flexWrap: 'wrap' }}>
        <IconButton
          onClick={e => { e.stopPropagation(); setHeaderMenuAnchor(e.currentTarget); }}
          sx={{
            color: '#bfc8e0',
            height: 40,
            width: 40,
            borderRadius: '8px',
            border: '1px solid #3a3b5a',
            '&:hover': {
              color: '#fff',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              borderColor: '#4f51c0'
            }
          }}
        >
          <MoreVertIcon />
        </IconButton>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTask}
          sx={{
            bgcolor: '#0073ea',
            color: '#fff',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            px: 2.5,
            height: 40,
            boxShadow: '0 4px 12px rgba(0, 115, 234, 0.2)',
            '&:hover': { bgcolor: '#0060c2' }
          }}
        >
          New task
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setShowColSelector(true);
            setColSelectorAnchor(e.currentTarget);
          }}
          sx={{
            background: 'transparent',
            backgroundColor: 'transparent',
            color: '#bfc8e0',
            borderColor: '#3a3b5a',
            fontWeight: 500,
            textTransform: 'none',
            borderRadius: '8px',
            px: 2,
            height: 40,
            zIndex: 2,
            '&:hover': {
              borderColor: '#4f51c0',
              color: '#fff',
              bgcolor: 'rgba(79, 81, 192, 0.1)'
            }
          }}
        >
          Add column
        </Button>
        <Box sx={{ width: 12, display: { xs: 'none', sm: 'block' } }} />
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'center', 
            flexGrow: 1, 
            width: { xs: '100%', md: 'auto' },
            mt: { xs: 1.5, md: 0 },
            overflowX: 'auto',
            pb: 0.5,
            '::-webkit-scrollbar': { height: 4 },
            '::-webkit-scrollbar-thumb': { background: '#35365a', borderRadius: 2 }
          }}>
        {/* Text Filter */}
        <TextField
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search..."
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#7d82a8', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              bgcolor: 'rgba(255,255,255,0.05)',
              color: '#d0d4e4',
              borderRadius: '8px',
              fontSize: '0.8rem',
              '& fieldset': { border: '1px solid #3a3b5a' },
              '&:hover fieldset': { borderColor: '#4f51c0' },
              '&.Mui-focused fieldset': { borderColor: '#4f51c0' },
              width: { xs: 120, sm: 180 },
              height: 36
            }
          }}
        />
        {/* People Filter */}
        <FormControl size="small" sx={{ minWidth: { xs: 100, sm: 120 } }}>
          <Select
            multiple
            displayEmpty
            value={filterPerson}
            onChange={(e) => {
               const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
               setFilterPerson(val as string[]);
            }}
            renderValue={(selected) => {
              if (selected.length === 0) {
                return <Typography sx={{ color: '#7d82a8', fontSize: '0.8rem' }}>Person</Typography>;
              }
              return <Typography sx={{ color: '#d0d4e4', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(selected as string[]).join(', ')}</Typography>;
            }}
            sx={{
               bgcolor: 'rgba(255,255,255,0.05)',
               color: '#d0d4e4',
               borderRadius: '8px',
               height: 36,
               fontSize: '0.8rem',
               '.MuiOutlinedInput-notchedOutline': { borderColor: '#3a3b5a' },
               '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4f51c0' },
               '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4f51c0' },
               '.MuiSvgIcon-root': { color: '#7d82a8' }
            }}
            MenuProps={{ PaperProps: { sx: { bgcolor: '#23243a', color: '#fff', borderRadius: 2, border: '1px solid #3a3b5a' } } }}
          >
            {availablePeople.length === 0 ? (
               <MenuItem disabled sx={{ color: '#7d82a8' }}>No people found</MenuItem>
            ) : (
               availablePeople.map((name) => (
                 <MenuItem key={name} value={name} sx={{ '&.Mui-selected': { bgcolor: 'rgba(79, 81, 192, 0.2)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                    <Checkbox checked={filterPerson.includes(name)} sx={{ color: '#7d82a8', '&.Mui-checked': { color: '#00c875' } }} />
                    <ListItemText primary={name} primaryTypographyProps={{ color: '#d0d4e4' }} />
                 </MenuItem>
               ))
            )}
          </Select>
        </FormControl>
        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: { xs: 100, sm: 120 } }}>
          <Select
            multiple
            displayEmpty
            value={filterStatus}
            onChange={(e) => {
               const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
               setFilterStatus(val as string[]);
            }}
            renderValue={(selected) => {
              if (selected.length === 0) {
                return <Typography sx={{ color: '#7d82a8', fontSize: '0.8rem' }}>Status</Typography>;
              }
              return <Typography sx={{ color: '#d0d4e4', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(selected as string[]).join(', ')}</Typography>;
            }}
            sx={{
               bgcolor: 'rgba(255,255,255,0.05)',
               color: '#d0d4e4',
               borderRadius: '8px',
               height: 36,
               fontSize: '0.8rem',
               '.MuiOutlinedInput-notchedOutline': { borderColor: '#3a3b5a' },
               '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4f51c0' },
               '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4f51c0' },
               '.MuiSvgIcon-root': { color: '#7d82a8' }
            }}
            MenuProps={{ PaperProps: { sx: { bgcolor: '#23243a', color: '#fff', borderRadius: 2, border: '1px solid #3a3b5a' } } }}
          >
             {availableStatuses.length === 0 ? (
                <MenuItem disabled sx={{ color: '#7d82a8' }}>No statuses found</MenuItem>
             ) : (
                availableStatuses.map((status) => (
                  <MenuItem key={status} value={status} sx={{ '&.Mui-selected': { bgcolor: 'rgba(79, 81, 192, 0.2)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                     <Checkbox checked={filterStatus.includes(status)} sx={{ color: '#7d82a8', '&.Mui-checked': { color: '#00c875' } }} />
                     <ListItemText primary={status} primaryTypographyProps={{ color: '#d0d4e4' }} />
                  </MenuItem>
                ))
             )}
          </Select>
        </FormControl>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {/* Column Selector Popover */}
        {showColSelector && colSelectorAnchor && (
          <Popover
            open={showColSelector}
            anchorEl={colSelectorAnchor}
            onClose={() => setShowColSelector(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{ sx: { bgcolor: '#23243a', color: '#fff', borderRadius: 3, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #3a3b5a' } }}
          >
            <ColumnTypeSelector
              onSelect={(type, label) => {
                handleAddColumn(type, label);
                setShowColSelector(false);
              }}
            />
          </Popover>
        )}
        <Menu
          anchorEl={headerMenuAnchor}
          open={Boolean(headerMenuAnchor)}
          onClose={() => setHeaderMenuAnchor(null)}
          PaperProps={{
            sx: {
              bgcolor: '#1e1f2b',
              color: '#d0d4e4',
              borderRadius: 3,
              minWidth: 220,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: '1px solid #3a3b5a',
              mt: 1,
              overflow: 'hidden'
            }
          }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #2d2e45' }}>
            <Typography variant="overline" sx={{ color: '#7d82a8', fontWeight: 700, letterSpacing: 1 }}>
              Board Views
            </Typography>
          </Box>
          <MenuItem 
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('table'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(0, 115, 234, 0.1)', display: 'flex' }}>
              <InsertDriveFileIcon sx={{ color: '#0073ea', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Table view</Typography>
              <Typography sx={{ color: '#7d82a8', fontSize: 11 }}>Main list view</Typography>
            </Box>
          </MenuItem>
          <MenuItem 
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('kanban'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(0, 200, 117, 0.1)', display: 'flex' }}>
              <TimelineIcon sx={{ color: '#00c875', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Kanban</Typography>
              <Typography sx={{ color: '#7d82a8', fontSize: 11 }}>Board status view</Typography>
            </Box>
          </MenuItem>
          <MenuItem 
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('gantt'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(253, 171, 61, 0.1)', display: 'flex' }}>
              <InsertDriveFileIcon sx={{ color: '#fdab3d', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Gantt</Typography>
              <Typography sx={{ color: '#7d82a8', fontSize: 11 }}>Timeline view</Typography>
            </Box>
          </MenuItem>
          <MenuItem 
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('calendar'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(226, 68, 92, 0.1)', display: 'flex' }}>
              <CalendarMonthIcon sx={{ color: '#e2445c', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Calendar</Typography>
              <Typography sx={{ color: '#7d82a8', fontSize: 11 }}>Date based view</Typography>
            </Box>
          </MenuItem>
          <MenuItem 
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('doc'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(162, 93, 220, 0.1)', display: 'flex' }}>
              <DescriptionIcon sx={{ color: '#a25ddc', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Doc</Typography>
              <Typography sx={{ color: '#7d82a8', fontSize: 11 }}>Document view</Typography>
            </Box>
          </MenuItem>
          <MenuItem 
            onClick={() => { setHeaderMenuAnchor(null); setWorkspaceView('gallery'); }}
            sx={{ py: 1.5, px: 2, gap: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(87, 155, 252, 0.1)', display: 'flex' }}>
              <InsertDriveFileIcon sx={{ color: '#579bfc', fontSize: 20 }} />
            </Box>
             <Box>
              <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>File Gallery</Typography>
              <Typography sx={{ color: '#7d82a8', fontSize: 11 }}>Asset gallery</Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Box>

      {workspaceView === 'table' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none', overflowX: 'auto' }}>
            <Table sx={{ borderSpacing: '0 8px', borderCollapse: 'separate' }}>
              <TableHead>
                <Droppable droppableId="columns-droppable" direction="horizontal" type="column">
                  {(provided) => (
                    <TableRow ref={provided.innerRef} {...provided.droppableProps} sx={{ '& th': { borderBottom: 'none', color: '#bfc8e0', fontSize: 13, fontWeight: 600 } }}>
                      {/* Drag Handle Header Placeholder */}
                      <TableCell sx={{ width: 40, p: 0.5, borderBottom: 'none' }} />
                      
                      {columns.map((col, index) => (
                        <Draggable key={col.id} draggableId={col.id} index={index}>
                          {(provided, snapshot) => (
                            <TableCell
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              sx={{
                                ...provided.draggableProps.style,
                                minWidth: col.width || 150,
                                userSelect: 'none',
                                p: 0.5,
                                borderBottom: 'none',
                                bgcolor: 'transparent',
                              }}
                            >
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                bgcolor: snapshot.isDragging ? '#3b3c5a' : '#23243a', 
                                borderRadius: '8px', 
                                px: 1.5, 
                                py: 1.2, 
                                borderBottom: '2px solid #3a3b5a',
                                transition: 'all 0.2s ease',
                                '&:hover': { bgcolor: '#2c2d4a' }
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }} {...provided.dragHandleProps}>
                                  {col.type === "Status" && <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#00c875', flexShrink: 0 }} />}
                                  {col.type === "Timeline" && <TimelineIcon sx={{ fontSize: 18, color: '#fdab3d', flexShrink: 0 }} />}
                                  {col.type === "Files" && <InsertDriveFileIcon sx={{ fontSize: 18, color: '#579bfc', flexShrink: 0 }} />}
                                  {col.type === "People" && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#a25ddc', flexShrink: 0 }} />}
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: 600, 
                                    color: '#d0d4e4', 
                                    fontSize: '0.875rem',
                                    letterSpacing: '0.02em',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {col.name}
                                  </Typography>
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleColMenuOpen(e, col.id)}
                                  sx={{ 
                                    color: '#7d82a8', 
                                    padding: '2px',
                                    '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } 
                                  }}
                                >
                                  <MoreVertIcon fontSize="small" sx={{ fontSize: '1.1rem' }} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {/* Add Column Button in Header */}
                      <TableCell sx={{ minWidth: 50, p: 0.5, borderBottom: 'none' }}>
                        <IconButton
                          onClick={(e) => {
                            setShowColSelector(true);
                            setColSelectorAnchor(e.currentTarget);
                          }}
                          sx={{ 
                            bgcolor: '#23243a', 
                            color: '#7d82a8', 
                            borderRadius: '8px', 
                            width: '100%',
                            height: 48,
                            border: '1px dashed #3a3b5a',
                            '&:hover': { bgcolor: '#2c2d4a', color: '#fff', borderColor: '#4f51c0' } 
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}
                </Droppable>
              </TableHead>
              <Droppable droppableId="rows-droppable" type="row">
                {(provided) => (
                  <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                    {filteredRows.map((row, index) => (
                      <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={!!filterText}>
                        {(provided, snapshot) => (
                          <TableRow
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{
                              bgcolor: snapshot.isDragging ? '#2c2d4a' : '#23243a',
                              '&:hover': { bgcolor: '#2c2d4a' },
                              transition: 'background-color 0.2s',
                              borderRadius: 4, // Attempt to round row corners
                              ...provided.draggableProps.style
                            }}
                          >
                           {/* Row Drag Handle, Menu, and Message Icon */}
                           <TableCell sx={{ width: 60, p: 0, borderBottom: 'none', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', pl: 1, gap: 1 }}>
                               <div {...provided.dragHandleProps} style={{ display: 'flex', alignItems: 'center', cursor: 'grab' }}>
                                 <MoreVertIcon sx={{ color: '#555', fontSize: 16 }} />
                                 <MoreVertIcon sx={{ color: '#555', fontSize: 16, ml: -1 }} />
                               </div>
                               <TaskRowMenu
                                 row={row}
                                 onView={() => { setReviewTask(row); setShowEmailAutomation(false); }}
                                 onDelete={async () => {
                                   if (confirm('Are you sure you want to delete this task?')) {
                                     // Optimistic update
                                     setRows(prev => prev.filter(r => r.id !== row.id));
                                     // Backend call
                                     await fetch(getApiUrl(`/tables/${tableId}/tasks/${row.id}`), {
                                       method: "DELETE",
                                     });
                                   }
                                 }}
                               />
                               {/* Message Icon for Chat */}
                               <IconButton size="small" sx={{ color: '#4f51c0', '&:hover': { color: '#6c6ed6' } }} onClick={e => handleOpenChat(e, row.id, row.values.message || [], 'message')}>
                                 <ChatBubbleOutlineIcon sx={{ fontSize: 20 }} />
                               </IconButton>
                               {/* Chat Popover for Message Icon */}
                               {chatPopoverKey === `${row.id}-message` && chatAnchor && (
                                 <Popover
                                   open={!!chatAnchor}
                                   anchorEl={chatAnchor}
                                   onClose={handleCloseChat}
                                   anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                   transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                   PaperProps={{
                                     sx: {
                                       p: 0,
                                       minWidth: 360,
                                       maxWidth: 400,
                                       bgcolor: '#1e1f2b',
                                       borderRadius: 4,
                                       boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                       border: '1px solid #3a3b5a',
                                     }
                                   }}
                                 >
                                   <Box sx={{ display: 'flex', flexDirection: 'column', height: 450 }}>
                                     {/* Header */}
                                     <Box sx={{
                                       px: 2.5,
                                       py: 2,
                                       borderBottom: '1px solid #2d2e45',
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'space-between',
                                       bgcolor: '#23243a'
                                     }}>
                                       <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>Discussion</Typography>
                                       <IconButton size="small" onClick={handleCloseChat} sx={{ color: '#7d82a8', '&:hover': { color: '#fff' } }}>
                                         <span style={{ fontSize: 18 }}>✕</span>
                                       </IconButton>
                                     </Box>

                                     {/* Messages */}
                                     <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                       {chatMessages.length === 0 ? (
                                         <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                                            <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: '#4f51c0', mb: 1, opacity: 0.5 }} />
                                            <Typography variant="body2" sx={{ color: '#7d82a8' }}>No messages yet</Typography>
                                         </Box>
                                       ) : (
                                         chatMessages.map(msg => (
                                           <Box key={msg.id} sx={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                                             <Box sx={{ 
                                               bgcolor: '#2c2d4a', 
                                               px: 2, 
                                               py: 1.5, 
                                               borderRadius: '12px 12px 12px 2px',
                                               border: '1px solid #3a3b5a'
                                             }}>
                                               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                 <Typography variant="caption" sx={{ fontWeight: 600, color: '#6c6ed6' }}>{msg.sender}</Typography>
                                                 <Typography variant="caption" sx={{ color: '#5a5b7a', fontSize: 10 }}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Typography>
                                               </Box>
                                               <Typography variant="body2" sx={{ color: '#d0d4e4', lineHeight: 1.5 }}>{msg.text}</Typography>
                                             </Box>
                                           </Box>
                                         ))
                                       )}
                                       <div id="chat-bottom" />
                                     </Box>

                                     {/* Input */}
                                     <Box sx={{ px: 2, py: 2, borderTop: '1px solid #2d2e45', bgcolor: '#23243a' }}>
                                       <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                         <input
                                           value={chatInput}
                                           onChange={e => setChatInput(e.target.value)}
                                           placeholder="Write a reply..."
                                           onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                           style={{
                                             width: '100%',
                                             backgroundColor: '#1e1f2b',
                                             border: '1px solid #3a3b5a',
                                             borderRadius: '24px',
                                             padding: '12px 44px 12px 16px',
                                             color: '#fff',
                                             fontSize: '14px',
                                             outline: 'none'
                                           }}
                                         />
                                         <IconButton 
                                           onClick={handleSendChat} 
                                           disabled={!chatInput.trim()} 
                                           size="small"
                                           sx={{ 
                                             position: 'absolute', 
                                             right: 6, 
                                             color: chatInput.trim() ? '#4f51c0' : '#3a3b5a',
                                             bgcolor: chatInput.trim() ? 'rgba(79, 81, 192, 0.1)' : 'transparent',
                                             '&:hover': { bgcolor: chatInput.trim() ? 'rgba(79, 81, 192, 0.2)' : 'transparent' }
                                           }}
                                         >
                                           <SendIcon fontSize="small" />
                                         </IconButton>
                                       </Box>
                                     </Box>
                                   </Box>
                                 </Popover>
                               )}
                             </Box>
                           </TableCell>

                            {/* Render Cells */}
                            {columns.map((col) => (
                               <TableCell
                                 key={col.id}
                                 align="left"
                                 sx={{
                                   borderBottom: '1px solid #2e2f45',
                                   p: 1.5,
                                   color: '#d0d4e4',
                                   fontSize: '0.875rem',
                                   minWidth: col.width || 150,
                                   maxWidth: 300,
                                   overflow: 'hidden',
                                   textOverflow: 'ellipsis',
                                   whiteSpace: 'nowrap'
                                 }}
                               >
                                 {renderCell(row, col)}
                               </TableCell>
                            ))}
                            
                            {/* Empty cell for the Add Column column alignment */}
                            <TableCell sx={{ borderBottom: 'none', borderTopRightRadius: 12, borderBottomRightRadius: 12 }} />
                          </TableRow>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </TableBody>
                )}
              </Droppable>
            </Table>
          </TableContainer>
        </DragDropContext>
      ) : workspaceView === 'kanban' ? (
        <Box sx={{ 
          display: 'flex', 
          gap: 2.5, 
          height: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          pb: 2,
          px: 1,
          '::-webkit-scrollbar': { height: 8 },
          '::-webkit-scrollbar-track': { background: 'transparent' },
          '::-webkit-scrollbar-thumb': { background: '#35365a', borderRadius: 4 },
          '::-webkit-scrollbar-thumb:hover': { background: '#45466a' }
        }}>
          {(() => {
            const statusCol = columns.find(col => col.type === 'Status');
            if (!statusCol || !Array.isArray(statusCol.options)) {
              return (
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
                   <Stack alignItems="center" spacing={2}>
                      <Box sx={{ bgcolor: '#23243a', p: 4, borderRadius: 4, textAlign: 'center', maxWidth: 400 }}>
                           <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>No Status Column</Typography>
                           <Typography variant="body2" sx={{ color: '#bfc8e0' }}>
                              Please add a "Status" column to your table to visualize your tasks in Kanban view.
                           </Typography>
                      </Box>
                   </Stack>
                </Box>
              );
            }
            // Use status options for columns
            return statusCol.options.map(opt => {
              const colTasks = filteredRows.filter(r => r.values[statusCol.id] === opt.value);
              const statusColor = opt.color || '#35365a';
              
              return (
                <Paper 
                  key={opt.value}
                  elevation={0}
                  sx={{ 
                    width: 280, 
                    minWidth: 280,
                    bgcolor: 'transparent',
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%',
                    flexShrink: 0
                  }}
                >
                  {/* Column Header */}
                  <Box sx={{ 
                    mb: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    bgcolor: '#23243a', // Header BG
                    p: 1.5,
                    borderRadius: 2,
                    borderTop: `4px solid ${statusColor}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
                      {opt.value}
                    </Typography>
                    <Box sx={{ 
                      bgcolor: 'rgba(255,255,255,0.1)', 
                      borderRadius: '12px', 
                      px: 1, 
                      py: 0.25,
                      minWidth: 24,
                      textAlign: 'center'
                    }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#bfc8e0' }}>
                        {colTasks.length}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Tasks Container */}
                  <Box sx={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 1.5,
                    px: 0.5,
                    pb: 2,
                    '::-webkit-scrollbar': { width: 6 },
                    '::-webkit-scrollbar-track': { background: 'transparent' },
                    '::-webkit-scrollbar-thumb': { background: '#35365a', borderRadius: 3 },
                  }}>
                    {colTasks.map(task => (
                      <Paper 
                        key={task.id}
                        elevation={0}
                        sx={{ 
                          bgcolor: '#23243a',
                          p: 2, 
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          border: '1px solid transparent',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            border: `1px solid ${statusColor}44`
                          }
                        }}
                        onClick={() => setReviewTask(task)}
                      >
                         {/* Primary Text (Use first column) */}
                         <Typography sx={{ fontWeight: 500, color: '#fff', mb: 1, lineHeight: 1.4 }}>
                           {columns[0] ? (typeof task.values[columns[0].id] === 'string' ? task.values[columns[0].id] : 'Untitled') : 'Untitled'}
                         </Typography>

                         {/* Metadata Grid */}
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                           {columns.filter(c => c.id !== statusCol.id && c.id !== columns[0]?.id && !c.hidden).slice(0, 3).map(col => {
                             const rawVal = task.values[col.id];
                             if (!rawVal) return null;

                             if (col.type === 'People' && Array.isArray(rawVal)) {
                               return (
                                 <Box key={col.id} sx={{ display: 'flex', '& > *': { ml: -0.5 }, pl: 0.5 }}>
                                   {rawVal.slice(0, 3).map((p: any, i) => (
                                     <Tooltip key={i} title={p.name || p.email}>
                                       <Avatar 
                                         src={p.avatar}
                                         sx={{ width: 22, height: 22, border: '2px solid #23243a', fontSize: '0.6rem', bgcolor: '#3d3e5a' }}
                                       >
                                         {p.name?.[0] || p.email?.[0] || '?'}
                                       </Avatar>
                                     </Tooltip>
                                   ))}
                                 </Box>
                               );
                             }

                             if (col.type === 'Priority') {
                               const prioColor = rawVal === 'High' ? '#e2445c' : rawVal === 'Medium' ? '#fdab3d' : '#00c875';
                               return (
                                 <Chip 
                                   key={col.id} 
                                   label={String(rawVal)} 
                                   size="small" 
                                   sx={{ 
                                     height: 20, 
                                     fontSize: '0.65rem', 
                                     bgcolor: `${prioColor}33`, 
                                     color: prioColor,
                                     border: `1px solid ${prioColor}44`
                                   }} 
                                 />
                               );
                             }

                             if (col.type === 'Country' && countryCodeMap[String(rawVal)]) {
                               return (
                                 <Tooltip key={col.id} title={String(rawVal)}>
                                   <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                     <Flag country={countryCodeMap[String(rawVal)]} size={14} />
                                   </Box>
                                 </Tooltip>
                               );
                             }

                             // Generic fallback for other fields (Date, Text, etc)
                             if (['Date', 'Text'].includes(col.type)) {
                               return (
                                  <Typography key={col.id} variant="caption" sx={{ color: '#bfc8e0', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {col.type === 'Date' && <DateRangeIcon sx={{ fontSize: 12 }} />}
                                    {String(rawVal)}
                                  </Typography>
                               );
                             }
                             
                             return null;
                           })}
                         </Box>
                      </Paper>
                    ))}

                    <Button 
                       startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                       sx={{
                         color: '#bfc8e0',
                         textTransform: 'none',
                         justifyContent: 'flex-start',
                         py: 1,
                         px: 1,
                         borderRadius: 2,
                         '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' }
                       }}
                       onClick={() => {
                         // Pre-fill status
                         const newRow: Row = { id: uuidv4(), values: { [statusCol.id]: opt.value } };
                         setRows(prev => [...prev, newRow]);
                         setEditingCell({ rowId: newRow.id, colId: columns[0]?.id || '' });
                       }}
                    >
                      New Task
                    </Button>
                  </Box>
                </Paper>
              );
            });
          })()}
        </Box>
      ) : workspaceView === 'calendar' ? (
        <Box sx={{ mt: 4, mb: 4, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
          {/* Calendar Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
               <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>{currentDate.format('MMMM YYYY')}</Typography>
               <Box sx={{ display: 'flex', gap: 1 }}>
                 <IconButton onClick={() => setCurrentDate(curr => curr.subtract(1, 'month'))} sx={{ color: '#bfc8e0', bgcolor: '#2c2d4a', '&:hover': { bgcolor: '#3d3e5a' } }}>
                   <Typography variant="h6">{'<'}</Typography>
                 </IconButton>
                 <Button onClick={() => setCurrentDate(dayjs())} sx={{ color: '#fff', textTransform: 'none' }}>
                   Today
                 </Button>
                 <IconButton onClick={() => setCurrentDate(curr => curr.add(1, 'month'))} sx={{ color: '#bfc8e0', bgcolor: '#2c2d4a', '&:hover': { bgcolor: '#3d3e5a' } }}>
                   <Typography variant="h6">{'>'}</Typography>
                 </IconButton>
               </Box>
             </Box>
             {/* Filter/Legend could go here */}
          </Box>

          {/* Calendar Grid */}
          <Box sx={{ flex: 1, bgcolor: '#23243a', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #35365a' }}>
            {(() => {
               const dateCol = columns.find(c => c.type === 'Date');
               const statusCol = columns.find(c => c.type === 'Status');
               if (!dateCol) return (
                 <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                   <Typography sx={{ color: '#bfc8e0' }}>No Date column found. Please add a Date column to use Calendar view.</Typography>
                 </Box>
               );

               const startOfMonth = currentDate.startOf('month');
               const endOfMonth = currentDate.endOf('month');
               const startDate = startOfMonth.startOf('week');
               const endDate = endOfMonth.endOf('week');
               
               const calendarDays = [];
               let day = startDate;
               while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
                 calendarDays.push(day);
                 day = day.add(1, 'day');
               }

               const weeks = [];
               for (let i = 0; i < calendarDays.length; i += 7) {
                 weeks.push(calendarDays.slice(i, i + 7));
               }
               
               return (
                 <>
                   {/* Weekday Headers */}
                   <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #35365a' }}>
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                       <Box key={d} sx={{ p: 1.5, textAlign: 'center', borderRight: '1px solid #35365a', '&:last-child': { borderRight: 'none' } }}>
                         <Typography variant="subtitle2" sx={{ color: '#bfc8e0', fontWeight: 600 }}>{d}</Typography>
                       </Box>
                     ))}
                   </Box>
                   
                   {/* Weeks */}
                   <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                     {weeks.map((week, wIdx) => (
                       <Box key={wIdx} sx={{ 
                         display: 'grid', 
                         gridTemplateColumns: 'repeat(7, 1fr)', 
                         flex: 1,
                         minHeight: 100,
                         borderBottom: wIdx === weeks.length - 1 ? 'none' : '1px solid #35365a' 
                       }}>
                         {week.map((date, dIdx) => {
                           const isCurrentMonth = date.month() === currentDate.month();
                           const isToday = date.isSame(dayjs(), 'day');
                           const dayTasks = filteredRows.filter(r => {
                             const rDate = r.values[dateCol.id];
                             return rDate && dayjs(rDate).isSame(date, 'day');
                           });

                           return (
                             <Box 
                               key={dIdx} 
                               sx={{ 
                                 borderRight: dIdx === 6 ? 'none' : '1px solid #35365a',
                                 bgcolor: isCurrentMonth ? 'transparent' : 'rgba(0,0,0,0.15)',
                                 p: 1,
                                 position: 'relative',
                                 transition: 'background-color 0.2s',
                                 '&:hover': { bgcolor: isCurrentMonth ? '#2c2d4a' : 'rgba(0,0,0,0.2)' }
                               }}
                               onClick={() => {
                                 // Add new task on this date
                                 // Logic to open modal or prepopulate could go here
                               }}
                             >
                               <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                 <Typography sx={{ 
                                   fontSize: '0.85rem', 
                                   fontWeight: isToday ? 700 : 400,
                                   width: 24, 
                                   height: 24, 
                                   lineHeight: '24px',
                                   textAlign: 'center',
                                   borderRadius: '50%',
                                   bgcolor: isToday ? '#e2445c' : 'transparent',
                                   color: isToday ? '#fff' : isCurrentMonth ? '#fff' : '#5c5e80'
                                 }}>
                                   {date.date()}
                                 </Typography>
                               </Box>
                               
                               <Stack spacing={0.5}>
                                 {dayTasks.map(task => {
                                   const statusVal = statusCol ? task.values[statusCol.id] : null;
                                   const statusOpt = statusCol?.options?.find(o => o.value === statusVal);
                                   const borderLeftColor = statusOpt?.color || '#0073ea';
                                   
                                   return (
                                     <Paper
                                       key={task.id}
                                       elevation={0}
                                       sx={{
                                         p: 0.5,
                                         px: 1,
                                         bgcolor: '#35365a',
                                         borderLeft: `3px solid ${borderLeftColor}`,
                                         cursor: 'pointer',
                                         '&:hover': { filter: 'brightness(1.2)' }
                                       }}
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setReviewTask(task);
                                       }}
                                     >
                                       <Typography noWrap sx={{ fontSize: '0.75rem', color: '#fff' }}>
                                         {columns[0] ? task.values[columns[0].id] : 'Untitled'}
                                       </Typography>
                                     </Paper>
                                   );
                                 })}
                               </Stack>
                             </Box>
                           );
                         })}
                       </Box>
                     ))}
                   </Box>
                 </>
               );
            })()}
          </Box>
        </Box>
      ) : workspaceView === 'doc' ? (
        <Box sx={{ mt: 4, mb: 4, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ bgcolor: '#23243a', borderRadius: 4, p: 4, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 4 }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
               <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                 Workspace Document
               </Typography>
               <Typography variant="caption" sx={{ color: docSaving ? '#fdab3d' : '#00c875' }}>
                 {docSaving ? 'Saving...' : 'Saved'}
               </Typography>
             </Box>
             <TextField
               multiline
               fullWidth
               variant="outlined"
               placeholder="Write your project documentation, notes, or ideas here..."
               value={docContent}
               onChange={(e) => setDocContent(e.target.value)}
               sx={{
                 flex: 1,
                 bgcolor: 'transparent',
                 '& .MuiOutlinedInput-root': {
                   height: '100%',
                   alignItems: 'flex-start',
                   color: '#fff',
                   fontSize: '1.1rem',
                   lineHeight: 1.6,
                   '& fieldset': { border: 'none' },
                   '&:hover fieldset': { border: 'none' },
                   '&.Mui-focused fieldset': { border: 'none' }
                 }
               }}
             />
          </Box>
        </Box>
      ) : workspaceView === 'gantt' ? (
        <Box sx={{ mt: 4, mb: 4 }}>
          {/* Find Timeline column */}
          {(() => {
            const timelineCol = columns.find(col => col.type === 'Timeline');
            if (!timelineCol) {
              return <Typography sx={{ color: '#bfc8e0' }}>No Timeline column found. Gantt requires a Timeline column.</Typography>;
            }
            // Find min/max dates
            const tasksWithTimeline = filteredRows.filter(row => {
              const val = row.values[timelineCol.id];
              return val && val.start && val.end;
            });
            if (tasksWithTimeline.length === 0) {
              return <Typography sx={{ color: '#bfc8e0' }}>No tasks with timeline data.</Typography>;
            }
            const minDate = Math.min(...tasksWithTimeline.map(row => new Date(row.values[timelineCol.id].start).getTime()));
            const maxDate = Math.max(...tasksWithTimeline.map(row => new Date(row.values[timelineCol.id].end).getTime()));
            // Render Gantt chart
            return (
              <Box sx={{ bgcolor: '#23243a', borderRadius: 3, p: 3, boxShadow: 4 }}>
                <Typography variant="h6" sx={{ color: '#fdab3d', fontWeight: 700, mb: 2 }}>Gantt Chart</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {tasksWithTimeline.map(row => {
                    const start = new Date(row.values[timelineCol.id].start).getTime();
                    const end = new Date(row.values[timelineCol.id].end).getTime();
                    const total = maxDate - minDate;
                    const left = ((start - minDate) / total) * 100;
                    const width = ((end - start) / total) * 100;
                    return (
                      <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ color: '#fff', minWidth: 120 }}>{columns[0]?.name}: {row.values[columns[0]?.id]}</Typography>
                        <Box sx={{ position: 'relative', flex: 1, height: 24, bgcolor: '#35365a', borderRadius: 2 }}>
                          <Box sx={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%', bgcolor: '#fdab3d', borderRadius: 2, boxShadow: '0 2px 8px #fdab3d44' }} />
                        </Box>
                        <Typography sx={{ color: '#bfc8e0', minWidth: 120 }}>{row.values[timelineCol.id].start} - {row.values[timelineCol.id].end}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })()}
        </Box>
      ) : workspaceView === 'gallery' ? (
        <Box sx={{ mt: 4, mb: 4 }}>
          {/* File Gallery */}
          <Box sx={{ bgcolor: '#23243a', borderRadius: 4, p: 4, display: 'flex', flexDirection: 'column', gap: 3, boxShadow: 4 }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>File Gallery</Typography>
               <Typography variant="caption" sx={{ color: '#7d82a8' }}>
                 All files across your board
               </Typography>
             </Box>
             
             <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
               {/* Collect all files */}
               {(() => {
                 let allFiles: any[] = [];
                 const fileCols = columns.filter(c => c.type === 'Files');
                 
                 filteredRows.forEach(row => {
                   fileCols.forEach(col => {
                     const cellFiles = Array.isArray(row.values[col.id]) ? row.values[col.id] : [];
                     cellFiles.forEach((f: any) => {
                       // Find task name (first column usually)
                       const taskName = columns.length > 0 ? row.values[columns[0].id] : 'Untitled';
                       allFiles.push({ file: f, rowId: row.id, colId: col.id, taskName });
                     });
                   });
                 });
                 
                 if (allFiles.length === 0) {
                    return (
                      <Box sx={{ gridColumn: '1 / -1', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <InsertDriveFileIcon sx={{ fontSize: 64, color: '#35365a' }} />
                        <Typography sx={{ color: '#7d82a8' }}>No files uploaded yet.</Typography>
                      </Box>
                    );
                 }

                 return allFiles.map((item, idx) => {
                    const isImage = (item.file.type && item.file.type.startsWith('image/')) || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file.name);
                    const fileUrl = item.file.url ? (item.file.url.startsWith('http') ? item.file.url : `${SERVER_URL}${item.file.url}`) : null;

                    return (
                     <Paper 
                       key={idx}
                       elevation={0}
                       sx={{ 
                         bgcolor: '#2c2d4a', 
                         borderRadius: 3, 
                         overflow: 'hidden',
                         position: 'relative',
                         transition: 'transform 0.2s, box-shadow 0.2s',
                         '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 1 }
                       }}
                     >
                       {/* Preview Area */}
                       <Box 
                         sx={{ 
                           height: 140, 
                           bgcolor: '#1e1f2b', 
                           display: 'flex', 
                           alignItems: 'center', 
                           justifyContent: 'center',
                           cursor: 'pointer',
                           overflow: 'hidden',
                           borderBottom: '1px solid #35365a'
                         }}
                         onClick={() => handleFileClick(item.file, item.rowId, item.colId)}
                       >
                         {isImage && fileUrl ? (
                            <img 
                              src={fileUrl} 
                              alt={item.file.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                         ) : (
                            <InsertDriveFileIcon sx={{ fontSize: 48, color: '#579bfc' }} />
                         )}
                       </Box>
                       
                       {/* Info Area */}
                       <Box sx={{ p: 2 }}>
                         <Typography noWrap variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }} title={item.file.name}>
                           {item.file.name}
                         </Typography>
                         <Typography noWrap variant="caption" sx={{ color: '#7d82a8', display: 'block', mb: 1 }}>
                           {item.taskName}
                         </Typography>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <Typography variant="caption" sx={{ color: '#5c5e80', fontWeight: 600 }}>
                             {item.file.size ? (item.file.size / 1024).toFixed(0) + ' KB' : ''}
                           </Typography>
                           <IconButton 
                             size="small" 
                             onClick={() => handleFileClick(item.file, item.rowId, item.colId)}
                             sx={{ color: '#bfc8e0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: '#0073ea', color: '#fff' } }}
                           >
                              <span style={{ fontSize: 16 }}>↗</span>
                           </IconButton>
                         </Box>
                       </Box>
                     </Paper>
                   );
                 });
               })()}
             </Box>
          </Box>
        </Box>
      ) : null}

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
                <Button
                  variant="outlined"
                  onClick={async () => {
                    if (!reviewTask || !reviewTask.id || reviewTask.id === 'placeholder') {
                      setShowEmailAutomation(true);
                      return;
                    }
                    setAutomationLoading(true);
                    // Try to load per-task automation config first
                    let config = null;
                    try {
                      const res = await fetch(getApiUrl(`/automation/${tableId}`));
                      if (res.ok) {
                        const allConfigs = await res.json();
                        if (Array.isArray(allConfigs)) {
                          config = allConfigs.find((a: any) => a.taskId === reviewTask.id) || allConfigs.find((a: any) => a.tableId === tableId && !a.taskId);
                        } else if (allConfigs && typeof allConfigs === 'object') {
                          // If backend returns a single config (legacy), use it
                          config = allConfigs;
                        }
                      }
                    } catch {}
                    setAutomationEnabled(config?.enabled ?? true);
                    setEmailTriggerCol(config?.triggerCol ?? "");
                    setEmailCols(config?.cols ?? []);
                    setEmailRecipients(config?.recipients ?? []);
                    setAutomationLoading(false);
                    setShowEmailAutomation(true);
                  }}
                  sx={{ color: '#fff', borderColor: '#4f51c0', borderRadius: 2, fontWeight: 600, px: 3, py: 1, '&:hover': { bgcolor: '#35365a', borderColor: '#4f51c0' } }}
                >
                  Email Automation
                </Button>
              </Box>
            </Box>
          )}
          {reviewTask && showEmailAutomation && (
            <Box>
              {automationLoading && <Typography sx={{ color: '#bfc8e0', mb: 2 }}>Loading automation settings...</Typography>}
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
                    const body = {
                      enabled: automationEnabled,
                      triggerCol: emailTriggerCol,
                      cols: emailCols,
                      recipients: emailRecipients
                    };
                    if (reviewTask && reviewTask.id && reviewTask.id !== 'placeholder') {
                      (body as any).taskId = reviewTask.id;
                    }
                    await fetch(getApiUrl(`/automation/${tableId}`), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body)
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

      {/* File Preview / Actions Dialog */}
      <Dialog
        open={fileDialog.open}
        onClose={() => setFileDialog({ ...fileDialog, open: false })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#23243a', color: '#fff', borderRadius: 3, p: 0, border: '1px solid #35365a', overflow: 'hidden', height: '80vh', display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #35365a', bgcolor: '#2c2d4a' }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
             {fileDialog.file?.name || 'File Preview'}
          </Typography>
          <IconButton onClick={() => setFileDialog({ ...fileDialog, open: false })} sx={{ color: '#bfc8e0' }}>
            <span style={{ fontSize: 20 }}>✕</span>
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: 1, bgcolor: '#1e1f2b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'auto', borderRight: { md: '1px solid #35365a' }, borderBottom: { xs: '1px solid #35365a', md: 'none' } }}>
           {fileDialog.file && (
             <>
               {fileDialog.file.url ? (
                 <Box sx={{ width: '100%', height: '100%', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000' }}>
                   {(fileDialog.file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileDialog.file.name)) ? (
                     <img 
                       src={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`} 
                       alt={fileDialog.file.name} 
                       style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} 
                     />
                   ) : (fileDialog.file.type === 'application/pdf' || /\.pdf$/i.test(fileDialog.file.name)) ? (
                     <iframe 
                       src={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`} 
                       style={{ width: '100%', height: '60vh', border: 'none' }} 
                       title="PDF Preview"
                     />
                   ) : (
                     <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 5 }}>
                        <InsertDriveFileIcon sx={{ fontSize: 80, color: '#0073ea', opacity: 0.8 }} />
                        <Typography sx={{ color: '#bfc8e0', textAlign: 'center' }}>Preview not available for this file type</Typography>
                     </Box>
                   )}
                 </Box>
               ) : (
                 <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ color: '#fdab3d' }}>
                      File not uploaded to server
                    </Typography>
                 </Box>
               )}
             </>
           )}
        </Box>
        
        <Box sx={{ width: { xs: '100%', md: 320 }, bgcolor: '#23243a', display: 'flex', flexDirection: 'column', borderLeft: { md: '1px solid #35365a' }, borderTop: { xs: '1px solid #35365a', md: 'none' } }}>

          {/* Comments / Details Area */}
            {/* File Info */}
            <Box sx={{ p: 2, borderBottom: '1px solid #35365a' }}>
              <Typography variant="subtitle2" sx={{ color: '#7d82a8', mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                Details
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                {fileDialog.file?.size && (
                  <Chip size="small" label={`${(fileDialog.file.size / 1024).toFixed(1)} KB`} sx={{ bgcolor: '#2c2d4a', color: '#bfc8e0' }} />
                )}
                {fileDialog.file?.uploadedAt && (
                  <Typography variant="caption" sx={{ color: '#7d82a8' }}>
                    {new Date(fileDialog.file.uploadedAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Comments List */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#7d82a8', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                Comments
              </Typography>
              
              {(!fileDialog.file?.comments || fileDialog.file.comments.length === 0) && (
                <Typography variant="body2" sx={{ color: '#5a5b7a', fontStyle: 'italic', textAlign: 'center', mt: 4 }}>
                  No comments yet
                </Typography>
              )}

              {fileDialog.file?.comments?.map((comment: any) => (
                <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#0073ea' }}>
                    {comment.user ? comment.user.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#fff' }}>{comment.user}</Typography>
                      <Typography variant="caption" sx={{ color: '#5a5b7a', fontSize: '0.7rem' }}>
                        {dayjs(comment.createdAt).fromNow()}
                      </Typography>
                    </Box>
                    <Paper sx={{ p: 1.5, mt: 0.5, bgcolor: '#2c2d4a', color: '#bfc8e0', borderRadius: '0 8px 8px 8px' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{comment.text}</Typography>
                    </Paper>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Comment Input */}
            <Box sx={{ p: 2, borderTop: '1px solid #35365a', bgcolor: '#2c2d4a' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a comment..."
                value={fileComment}
                onChange={(e) => setFileComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleFileCommentSubmit();
                  }
                }}
                multiline
                maxRows={3}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={handleFileCommentSubmit}
                        disabled={!fileComment.trim()}
                        sx={{ color: '#0073ea', '&.Mui-disabled': { color: '#4a4b6a' } }}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { color: '#fff', fontSize: '0.875rem', bgcolor: '#1e1f2b', borderRadius: 2, pr: 0.5 }
                }}
                sx={{ '& fieldset': { border: 'none' } }}
              />
            </Box>
          </Box>
        </Box>
        
        <DialogActions sx={{ justifyContent: 'flex-end', px: 3, py: 2, bgcolor: '#23243a', borderTop: '1px solid #35365a', flexShrink: 0 }}>
           <Box sx={{ display: 'flex', gap: 2 }}>
             <Button 
               onClick={handleFileDelete}
               sx={{ color: '#e2445c', '&:hover': { bgcolor: 'rgba(226, 68, 92, 0.1)' } }}
               startIcon={<DeleteIcon />}
             >
               Delete
             </Button>
             
             {fileDialog.file?.url && (
               <Button
                 variant="contained"
                 component="a"
                 href={fileDialog.file.url.startsWith('http') ? fileDialog.file.url : `${SERVER_URL}${fileDialog.file.url}`}
                 download={fileDialog.file.name} // HTML5 download attribute
                 target="_blank"
                 rel="noopener noreferrer"
                 startIcon={<InsertDriveFileIcon />}
                 sx={{ 
                   bgcolor: '#0073ea', 
                   color: '#fff', 
                   borderRadius: 2, 
                   textTransform: 'none', 
                   fontWeight: 600,
                   '&:hover': { bgcolor: '#0060c2' }
                 }}
               >
                 Download
               </Button>
             )}
           </Box>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
