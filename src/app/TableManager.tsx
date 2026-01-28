"use client";

import React, { useState, useEffect } from "react";
import { getApiUrl } from "./apiUrl";
import { v4 as uuidv4 } from "uuid";
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem, Select, Chip, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Column, ColumnType } from "../types";

const columnTypes: { value: ColumnType; label: string }[] = [
  { value: "Status", label: "Status" },
  { value: "Dropdown", label: "Dropdown" },
  { value: "Text", label: "Text" },
  { value: "Date", label: "Date" },
  { value: "People", label: "People" },
  { value: "Numbers", label: "Numbers" },
  { value: "Files", label: "Files" },
  { value: "Doc", label: "monday Doc" },
  { value: "Connect", label: "Connect boards" },
  { value: "Timeline", label: "Timeline" },
  { value: "Checkbox", label: "Checkbox" },
  { value: "Formula", label: "Formula" },
  { value: "Extract", label: "Extract info" },
  { value: "Priority", label: "Priority" },
];

export default function TableManager({ onTableCreated }: { onTableCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [colName, setColName] = useState("");
  const [colType, setColType] = useState<ColumnType>("Text");
  const [colOptions, setColOptions] = useState<string>("");

  const handleAddColumn = () => {
    if (!colName) return;
    setColumns((prev) => [
      ...prev,
      {
        id: uuidv4(),
        name: colName,
        type: colType,
        order: prev.length,
        options: ["Dropdown", "Status", "People"].includes(colType) && colOptions
          ? colOptions.split(",").map((o) => ({ value: o.trim() }))
          : undefined,
      },
    ]);
    setColName("");
    setColType("Text");
    setColOptions("");
  };

  const handleCreateTable = async () => {
    if (!name || columns.length === 0) return;
    console.log('Creating table with columns:', columns);
    await fetch(getApiUrl("/tables"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, columns }),
    });
    setOpen(false);
    setName("");
    setColumns([]);
    onTableCreated();
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
        New Table
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create New Table</DialogTitle>
        <DialogContent>
          <TextField
            id="table-name"
            name="table-name"
            label="Table Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle1">Add Columns</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              id="column-name"
              name="column-name"
              label="Column Name"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              size="small"
            />
            <Select
              value={colType}
              onChange={(e) => setColType(e.target.value as ColumnType)}
              size="small"
            >
              {columnTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
            {["Dropdown", "Status", "People"].includes(colType) && (
              <TextField
                id="column-options"
                name="column-options"
                label="Options (comma separated)"
                value={colOptions}
                onChange={(e) => setColOptions(e.target.value)}
                size="small"
              />
            )}
            <Button onClick={handleAddColumn} variant="outlined">
              Add
            </Button>
          </Stack>
          <Stack direction="row" spacing={1}>
            {columns.map((col) => (
              <Chip key={col.id} label={`${col.name} (${col.type})`} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTable} variant="contained">
            Create Table
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
