"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getApiUrl, authenticatedFetch } from "./apiUrl";
import { v4 as uuidv4 } from "uuid";
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, MenuItem, Select, TextField, InputAdornment } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Column, ColumnType, Row } from "../types";
import { hasNextTaskPage, mergeTaskPage, normalizeTaskPage, taskPageRequest } from "./todoListPaging";



interface TodoListProps {
  columns: Column[];
  tableId: string;
}


export function TodoList({ columns, tableId }: TodoListProps) {
  const [tasks, setTasks] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const tableGenerationRef = useRef(0);
  const nextPageRef = useRef(0);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (nextPage: number, append = true) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const controller = new AbortController();
    requestRef.current = controller;
    const sequence = ++requestSequenceRef.current;
    try {
      const res = await authenticatedFetch(getApiUrl(taskPageRequest(tableId, nextPage)), { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch tasks (${res.status})`);
      const rows = normalizeTaskPage(await res.json());
      if (sequence !== requestSequenceRef.current) return;
      setTasks((current) => append ? mergeTaskPage(current, rows, nextPage) : rows);
      nextPageRef.current = nextPage + 1;
      setHasNextPage(hasNextTaskPage(rows));
      setPageError(null);
      return rows;
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "";
      if (sequence === requestSequenceRef.current && errorName !== "AbortError") {
        setPageError("Some tasks could not be loaded. Scroll down to retry.");
      }
      throw error;
    } finally {
      if (sequence === requestSequenceRef.current) loadingRef.current = false;
    }
  }, [tableId]);

  useEffect(() => {
    tableGenerationRef.current += 1;
    setSaving(false);
    setLoading(true);
    nextPageRef.current = 0;
    loadPage(0, false)
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error('Failed to fetch tasks:', err);
          setTasks([]);
        }
      })
      .finally(() => setLoading(false));
    return () => { requestRef.current?.abort(); loadingRef.current = false; };
  }, [loadPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        loadPage(nextPageRef.current).catch((error) => {
          const errorName = error instanceof Error ? error.name : "";
          if (errorName !== "AbortError") console.error("Failed to load more tasks", error);
        });
      }
    }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadPage, pageError]);

  const addTask = async () => {
    const newTask = { id: uuidv4(), values: {} };
    const generation = tableGenerationRef.current;
    setSaving(true);
    try {
      const response = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (!response.ok) throw new Error(`Failed to add task (${response.status})`);
      const created = await response.json().catch(() => null);
      if (generation === tableGenerationRef.current && created?.id) {
        setTasks((current) => [created, ...current]);
      }
    } catch (error) {
      console.error("Failed to add task", error);
    } finally {
      if (generation === tableGenerationRef.current) setSaving(false);
    }
  };

  const handleCellSave = async (taskId: string, columnId: string, value: any) => {
    const generation = tableGenerationRef.current;
    setSaving(true);
    const updatedTask = tasks.find((t) => t.id === taskId);
    try {
      if (updatedTask) {
        const newValues = { ...updatedTask.values, [columnId]: value };
        const response = await authenticatedFetch(getApiUrl(`/tables/${tableId}/tasks`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, values: newValues }),
        });
        if (!response.ok) throw new Error(`Failed to save task (${response.status})`);
        const saved = await response.json().catch(() => null);
        if (generation === tableGenerationRef.current) {
          setTasks((current) => current.map((row) => (
            row.id === taskId ? (saved?.task || saved || { ...row, values: newValues }) : row
          )));
        }
      }
    } catch (error) {
      console.error("Failed to save task", error);
    } finally {
      if (generation === tableGenerationRef.current) {
        setEditingCell(null);
        setSaving(false);
      }
    }
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
      <Box ref={sentinelRef} sx={{ height: 1 }} aria-hidden="true" />
      {pageError && <Typography role="status" color="error" sx={{ mt: 1 }}>{pageError}</Typography>}
      {saving && <Typography role="status" sx={{ mt: 1 }}>Saving…</Typography>}
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
