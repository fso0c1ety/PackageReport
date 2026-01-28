"use client";
// Task row menu component (must be top-level, not inside JSX)
function TaskRowMenu({ row, onDelete }: { row: Row, onDelete: () => void }) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  return (
    <>
      <IconButton onClick={handleOpen}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        <MenuItem onClick={() => { handleClose(); alert(`Viewing task: ${row.id}`); }}>
          <Typography>View</Typography>
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); onDelete(); }}>
          <DeleteIcon fontSize="small" color="error" sx={{ mr: 1 }} />
          <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ColumnTypeSelector from "./ColumnTypeSelector";
import { Column, Row, ColumnType, ColumnOption } from "../types";

const initialColumns: Column[] = [
  { id: "task", name: "Task", type: "Text", order: 0 },
  { id: "owner", name: "Owner", type: "People", order: 1 },
  { id: "status", name: "Status", type: "Status", order: 2, options: [
    { value: "Working on it", color: "#fdab3d" },
    { value: "Done", color: "#00c875" },
    { value: "Stuck", color: "#e2445c" },
  ] },
  { id: "due", name: "Due date", type: "Date", order: 3 },
  { id: "priority", name: "Priority", type: "Dropdown", order: 4, options: [
    { value: "Low", color: "#00c875" },
    { value: "Medium", color: "#fdab3d" },
    { value: "High", color: "#e2445c" },
  ] },
];

import { getApiUrl } from "./apiUrl";

interface TableBoardProps {
  tableId: string;
}

const initialRows: Row[] = [];

export default function TableBoard({ tableId }: TableBoardProps) {
  // --- State ---
  const [columns, setColumns] = useState<Column[]>(initialColumns);
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
      .then((data) => setRows(data))
      .finally(() => setLoading(false));
  }, [tableId]);

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
    const newColumn: Column = {
      id: uuidv4(),
      name: label,
      type: colType,
      order: columns.length,
      options: ["Status", "Dropdown", "People"].includes(colType)
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
    setEditingCell({ rowId, colId });
    if (colType === "Date") {
      setEditValue(value ? dayjs(value) : null);
    } else {
      setEditValue(value ?? "");
    }
  };
  const handleCellSave = async (rowId: string, colId: string, colType?: string) => {
    let updatedRow: Row | undefined;
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        let newValue = editValue;
        if (colType === "Date") {
          newValue = editValue && dayjs.isDayjs(editValue) && editValue.isValid() ? editValue.format("YYYY-MM-DD") : "";
        }
        updatedRow = { ...row, values: { ...row.values, [colId]: newValue } };
        return updatedRow;
      })
    );
    setEditingCell(null);
    setEditValue("");
    // Persist to backend
    if (updatedRow) {
      await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: updatedRow.id, values: updatedRow.values }),
      });
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
  const renderCell = (row: Row, col: Column) => {
    // Force Priority column to always use Dropdown logic for editing
    const effectiveCol = col.id === "priority" ? { ...col, type: "Dropdown" } : col;
    let value = row.values ? row.values[col.id] : "";
    // For Dropdown/Status/Priority, ensure value is in options
    if ((col.type === "Status" || col.type === "Dropdown" || col.id === "priority") && col.options) {
      if (!col.options.some(opt => opt.value === value)) {
        value = "";
      }
    }
    if (editingCell && editingCell.rowId === row.id && editingCell.colId === col.id) {
      if (effectiveCol.type === "Files") {
        return (
          <input
            type="file"
            multiple
            autoFocus
            onChange={e => handleFileUpload(row.id, col.id, e.target.files)}
            style={{ marginTop: 8 }}
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
          />
        );
      }
      // Status/Dropdown
      if ((effectiveCol.type === "Status" || effectiveCol.type === "Dropdown") && effectiveCol.options) {
        const isEditingLabels = editingLabelsColId === effectiveCol.id;
        return (
          <Box>
            <FormControl size="small" fullWidth>
              <Select
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                // Prevent closing when editing labels
                onBlur={!isEditingLabels ? () => handleCellSave(row.id, col.id) : undefined}
                autoFocus
                open={isEditingLabels ? true : undefined}
                MenuProps={isEditingLabels ? { disableAutoFocusItem: true } : {}}
              >
                {effectiveCol.options.map((opt, idx) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isEditingLabels ? (
                      <>
                        <TextField
                          value={labelEdits[effectiveCol.id]?.[idx] ?? opt.value}
                          size="small"
                          onChange={e => setLabelEdits(edits => ({
                            ...edits,
                            [effectiveCol.id]: { ...edits[effectiveCol.id], [idx]: e.target.value }
                          }))}
                          onBlur={() => handleEditStatusLabel(effectiveCol.id, idx)}
                          sx={{ width: 100 }}
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        />
                        <input
                          type="color"
                          value={opt.color || "#e0e4ef"}
                          style={{ width: 28, height: 28, border: 'none', background: 'none', marginLeft: 4, marginRight: 4, cursor: 'pointer' }}
                          onChange={e => handleEditStatusColor(effectiveCol.id, idx, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        />
                        <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); handleDeleteStatusLabel(effectiveCol.id, idx); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Box sx={{ width: 16, height: 16, bgcolor: opt.color, borderRadius: '50%', mr: 1, display: 'inline-block' }} />
                        {opt.value}
                      </>
                    )}
                  </MenuItem>
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
                    onChange={e => setNewStatusLabel(e.target.value)}
                    onKeyDown={e => {
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
                    onChange={e => setNewStatusColor(e.target.value)}
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
      // Date
      if (col.type === "Date") {
        return (
          <DatePicker
            value={editValue || null}
            onChange={val => setEditValue(val)}
            onClose={() => handleCellSave(row.id, col.id, col.type)}
            slotProps={{ textField: { size: 'small', autoFocus: true } }}
          />
        );
      }
      // People
      if (col.type === "People") {
        return (
          <TextField
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(row.id, col.id)}
            onKeyDown={e => e.key === "Enter" && handleCellSave(row.id, col.id)}
            size="small"
            autoFocus
          />
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
            inputProps={{ inputMode: 'decimal', pattern: '^-?\\d*\\.?\\d*$' }}
          />
        );
      }
      // Default: text input
      return (
        <TextField
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => handleCellSave(row.id, col.id)}
          onKeyDown={e => e.key === "Enter" && handleCellSave(row.id, col.id)}
          size="small"
          autoFocus
        />
      );
    }
    // --- Read mode ---
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
      return (
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#0073ea', fontSize: 14 }} onClick={() => handleCellClick(row.id, col.id, value)}>
          {value ? value[0] : "-"}
        </Avatar>
      );
    }
    if (col.type === "Date") {
      return (
        <Typography variant="body2" color="text.secondary" onClick={() => handleCellClick(row.id, col.id, value, col.type)}>
          {value || "-"}
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddTask} sx={{ color: '#fff' }}>
          New task
        </Button>
        <Button variant="outlined" onClick={(e) => { setShowColSelector(true); setColSelectorAnchor(e.currentTarget); }}>
          + Add column
        </Button>
      </Box>
      <DragDropContext onDragEnd={onDragEnd}>
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
          <Table>
            <TableHead>
              <Droppable droppableId="columns-droppable" direction="horizontal" type="column">
                {(provided) => (
                  <TableRow ref={provided.innerRef} {...provided.droppableProps}>
                    {columns.map((col, colIdx) => (
                      <Draggable key={col.id} draggableId={col.id} index={colIdx}>
                        {(provided) => (
                          <TableCell
                            align="left"
                            sx={{ fontWeight: 700, fontSize: 16 }}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {col.name}
                              <IconButton size="small" onClick={(e) => handleColMenuOpen(e, col.id)}>
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
                  {rows.map((row, rowIdx) => (
                    <Draggable key={row.id || String(rowIdx)} draggableId={row.id ? String(row.id) : `row-${rowIdx}`} index={rowIdx}>
                      {(provided) => (
                        <TableRow key={row.id} ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                          {columns.map((col, colIdx) => (
                            <TableCell key={col.id} align="left" sx={{ cursor: 'pointer' }}>
                              {renderCell(row, col)}
                            </TableCell>
                          ))}
                          <TableCell align="center">
                            <TaskRowMenu row={row} onDelete={async () => {
                              setRows(rows => rows.filter(r => r.id !== row.id));
                              await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: row.id }),
                              });
                            }} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {/* Add task row */}
                  <TableRow key="add-task-row">
                    {columns.map((col, idx) => (
                      <TableCell key={col.id} align="left" sx={{ bgcolor: '#f6f7fb', borderBottom: 'none' }}>
                        {idx === 0 ? (
                          <Button
                            variant="text"
                            startIcon={<AddIcon />}
                            sx={{ color: '#fff', fontWeight: 600, pl: 0, background: '#0073ea' }}
                            onClick={handleAddTask}
                          >
                            Add task
                          </Button>
                        ) : null}
                      </TableCell>
                    ))}
                    <TableCell sx={{ bgcolor: '#f6f7fb', borderBottom: 'none' }} />
                  </TableRow>
                  {provided.placeholder}
                </TableBody>
              )}
            </Droppable>
          </Table>
        </TableContainer>
      </DragDropContext>
      {/* Column menu (edit/delete) */}
      <Menu anchorEl={anchorEl} open={!!colMenuId} onClose={handleColMenuClose}>
        <MenuItem onClick={e => {
          setRenamingColId(colMenuId);
          setRenameValue(columns.find(c => c.id === colMenuId)?.name || "");
          setRenameAnchorEl(e.currentTarget);
          handleColMenuClose();
        }}><EditIcon fontSize="small" sx={{ mr: 1 }} />Rename column</MenuItem>
        <MenuItem onClick={() => {
          setDeleteColId(colMenuId);
          handleColMenuClose();
        }}><DeleteIcon fontSize="small" sx={{ mr: 1 }} />Delete column</MenuItem>
      </Menu>
      {/* File preview/delete dialog */}
      <Menu
        open={fileDialog.open}
        onClose={() => setFileDialog({ open: false, file: null, rowId: null, colId: null })}
        anchorEl={null}
        anchorReference="none"
        PaperProps={{ sx: { minWidth: 340, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' } }}
      >
        <Typography fontWeight={600} mb={2} align="center">File: {fileDialog.file?.name ?? ''}</Typography>
        {fileDialog.file && fileDialog.file.type && fileDialog.file.type.startsWith('image/') ? (
          <img
            src={fileDialog.file ? URL.createObjectURL(fileDialog.file) : ''}
            alt={fileDialog.file ? fileDialog.file.name : ''}
            style={{ maxWidth: 280, maxHeight: 200, marginBottom: 16, borderRadius: 8 }}
          />
        ) : fileDialog.file ? (
          <Typography variant="body2" color="text.secondary" mb={2}>Cannot preview this file type.</Typography>
        ) : null}
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          {fileDialog.file ? (
            <Button
              variant="outlined"
              onClick={() => {
                if (fileDialog.file) {
                  const url = URL.createObjectURL(fileDialog.file);
                  window.open(url, '_blank');
                }
              }}
            >
              Open
            </Button>
          ) : null}
          <Button color="error" variant="contained" onClick={handleFileDelete}>
            Delete
          </Button>
        </Box>
      </Menu>
      {/* Rename column dialog */}
      <Dialog open={!!renamingColId} onClose={() => setRenamingColId(null)}>
        <DialogTitle>Rename column</DialogTitle>
        <DialogContent>
          <TextField
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            size="small"
            fullWidth
            autoFocus
            margin="dense"
            onKeyDown={async e => {
              if (e.key === 'Enter') {
                const updatedColumns = columns.map(c => c.id === renamingColId ? { ...c, name: renameValue } : c);
                setColumns(updatedColumns);
                setRenamingColId(null);
                // Persist columns to backend
                await fetch(getApiUrl(`/tables/${tableId}/columns`), {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ columns: updatedColumns }),
                });
                // Reload columns from backend
                const tablesRes = await fetch(getApiUrl(`/tables`));
                const tables = await tablesRes.json();
                const table = tables.find((t: any) => t.id === tableId);
                if (table) setColumns(table.columns || []);
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenamingColId(null)}>Cancel</Button>
          <Button onClick={async () => {
            const updatedColumns = columns.map(c => c.id === renamingColId ? { ...c, name: renameValue } : c);
            setColumns(updatedColumns);
            setRenamingColId(null);
            // Persist columns to backend
            await fetch(getApiUrl(`/tables/${tableId}/columns`), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ columns: updatedColumns }),
            });
            // Reload columns from backend
            const tablesRes = await fetch(getApiUrl(`/tables`));
            const tables = await tablesRes.json();
            const table = tables.find((t: any) => t.id === tableId);
            if (table) setColumns(table.columns || []);
          }}>Save</Button>
        </DialogActions>
      </Dialog>
      {/* Delete column confirm dialog */}
      <Menu
        open={!!deleteColId}
        onClose={() => setDeleteColId(null)}
        anchorEl={null}
        anchorReference="none"
        PaperProps={{
          sx: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            minWidth: '100vw',
            background: 'rgba(0,0,0,0.08)',
            boxShadow: 'none',
          }
        }}
      >
        <Box sx={{ p: 4, minWidth: 320, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography fontWeight={600} mb={2} align="center">Delete this column?</Typography>
          <Button color="error" variant="contained" fullWidth onClick={async () => {
            if (!deleteColId) return;
            // Remove column from columns
            const updatedColumns = columns.filter(c => c.id !== deleteColId);
            setColumns(updatedColumns);
            setDeleteColId(null);
            // Persist columns to backend
            await fetch(getApiUrl(`/tables/${tableId}/columns`), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ columns: updatedColumns }),
            });
            // Remove column values from all tasks and persist
            const updatedRows = rows.map(row => {
              const newValues = { ...row.values };
              delete newValues[deleteColId];
              return { ...row, values: newValues };
            });
            setRows(updatedRows);
            for (const row of updatedRows) {
              await fetch(getApiUrl(`/tables/${tableId}/tasks`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: row.id, values: row.values }),
              });
            }
          }}>Delete</Button>
        </Box>
      </Menu>
      {/* Column type selector modal */}
      <Menu anchorEl={colSelectorAnchor} open={showColSelector} onClose={() => setShowColSelector(false)}>
        <Box sx={{ p: 1 }}>
          <ColumnTypeSelector onSelect={(type, label) => handleAddColumn(type, label)} />
        </Box>
      </Menu>
    </Box>
  );
}
