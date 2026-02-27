"use client";

import React, { useState, useEffect } from "react";
import { getApiUrl, authenticatedFetch } from "./apiUrl";
import { v4 as uuidv4 } from "uuid";
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, MenuItem, Select, TextField, InputAdornment } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Column, ColumnType, Row } from "../types";



interface TodoListProps {
  columns: Column[];
  tableId: string;
}


export function TodoList({ columns, tableId }: TodoListProps) {
  const [tasks, setTasks] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState<any>("");

  // Always load tasks from backend
  useEffect(() => {
    setLoading(true);
    authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`))
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .finally(() => setLoading(false));
  }, [tableId]);

  const addTask = async () => {
    const newTask = { id: uuidv4(), values: {} };
    setLoading(true);
    await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
    // Refetch tasks from backend after adding
    authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`))
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .finally(() => setLoading(false));
  };

  const handleCellSave = async (taskId: string, columnId: string, value: any) => {
    setLoading(true);
    const updatedTask = tasks.find((t) => t.id === taskId);
    if (updatedTask) {
      const newValues = { ...updatedTask.values, [columnId]: value };
      await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, values: newValues }),
      });
    }
    // Refetch tasks from backend after editing
    authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`))
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .finally(() => {
        setEditingCell(null);
        setLoading(false);
      });
  };

  const handleCellClick = (taskId: string, colId: string, value: any) => {
    setEditingCell({ rowId: taskId, colId });
    setEditValue(value);
  };

  const handleEditChange = (val: any) => {
    setEditValue(val);
  };

  const handleEditBlur = (taskId: string, colId: string) => {
    handleCellSave(taskId, colId, editValue);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, taskId: string, colId: string) => {
    if (e.key === "Enter") {
      handleCellSave(taskId, colId, editValue);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  return (
    <Box sx={{ width: "100%", mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Todo List
      </Typography>
      {/* Removed Manage Tables button as requested */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id}>{col.name}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No tasks yet.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      onClick={() =>
                        editingCell?.rowId !== task.id || editingCell?.colId !== col.id
                          ? handleCellClick(task.id, col.id, task.values[col.id] ?? "")
                          : undefined
                      }
                      style={{ cursor: "pointer", minWidth: 120 }}
                    >
                      {editingCell && editingCell.rowId === task.id && editingCell.colId === col.id ? (
                        <CellEditor
                          column={col}
                          value={editValue}
                          onChange={handleEditChange}
                          autoFocus
                          onBlur={() => handleEditBlur(task.id, col.id)}
                          onKeyDown={(e: any) => handleEditKeyDown(e, task.id, col.id)}
                        />
                      ) : (
                        renderCellValue(col, task.values[col.id])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

interface CellEditorProps {
  column: Column;
  value: any;
  onChange: (value: any) => void;
  autoFocus?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

function CellEditor({ column, value, onChange, autoFocus, onBlur, onKeyDown }: CellEditorProps) {
  switch (column.type) {
    case "Status":
    case "Dropdown":
    case "People": {
      const options = column.options || [];
      const selectValue = value === undefined || value === null ? "" : value;
      return (
        <Select
          value={selectValue}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          size="small"
          displayEmpty
          autoFocus={autoFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          renderValue={(selected) =>
            selected === "" ? <span style={{ color: '#aaa' }}>Select...</span> : selected
          }
        >
          <MenuItem value="">
            <span style={{ color: '#aaa' }}>Select...</span>
          </MenuItem>
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.value}
            </MenuItem>
          ))}
        </Select>
      );
    }
    case "Text":
      return (
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          size="small"
          autoFocus={autoFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      );
    case "Date":
      return (
        <TextField
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          size="small"
          InputLabelProps={{ shrink: true }}
          autoFocus={autoFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      );
    case "Numbers":
      return (
        <TextField
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start">#</InputAdornment>,
          }}
          autoFocus={autoFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      );
    default:
      return null;
  }
}

function renderCellValue(column: Column, value: any) {
  if (value === undefined || value === null || value === "") {
    return <span style={{ color: '#aaa' }}>Click to edit</span>;
  }
  return value;
}
