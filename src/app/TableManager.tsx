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
  { value: "Country", label: "Country" },
  { value: "Message", label: "Message" },
];

const essentialsTypes = [
  "Status", "Dropdown", "Text", "Date", "People", "Numbers", "Files", "Doc", "Connect", "Timeline", "Checkbox", "Formula", "Extract", "Priority"
];
const superUsefulTypes = ["Country", "Message"];

// Icon mapping for column types
const columnTypeIcons: Record<string, React.ReactNode> = {
  Status: <svg data-testid="CheckBoxIcon" width={24} height={24}><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2m-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z" /></svg>,
  Text: <svg data-testid="TextFieldsIcon" width={24} height={24}><path d="M2.5 4v3h5v12h3V7h5V4zm19 5h-9v3h3v7h3v-7h3z" /></svg>,
  People: <svg data-testid="PeopleIcon" width={24} height={24}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3m-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3m0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5" /></svg>,
  Dropdown: <svg data-testid="ArrowDropDownCircleIcon" width={24} height={24}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 12-4-4h8z" /></svg>,
  Date: <svg data-testid="DateRangeIcon" width={24} height={24}><path d="M9 11H7v2h2zm4 0h-2v2h2zm4 0h-2v2h2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 16H5V9h14z" /></svg>,
  Numbers: <svg data-testid="NumbersIcon" width={24} height={24}><path d="m20.5 10 .5-2h-4l1-4h-2l-1 4h-4l1-4h-2L9 8H5l-.5 2h4l-1 4h-4L3 16h4l-1 4h2l1-4h4l-1 4h2l1-4h4l.5-2h-4l1-4zm-7 4h-4l1-4h4z" /></svg>,
  Files: <svg data-testid="InsertDriveFileIcon" width={24} height={24}><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm7 7V3.5L18.5 9z" /></svg>,
  Doc: <svg data-testid="DescriptionIcon" width={24} height={24}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z" /></svg>,
  Connect: <svg data-testid="LinkIcon" width={24} height={24}><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1M8 13h8v-2H8zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5" /></svg>,
  Timeline: <svg data-testid="TimelineIcon" width={24} height={24}><path d="M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.51-.07l-3.56 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07l-4.55 4.56c.05.16.07.33.07.51 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.51.07l4.56-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56C19.02 8.35 19 8.18 19 8c0-1.1.9-2 2-2s2 .9 2 2" /></svg>,
  Checkbox: <svg data-testid="CheckBoxIcon" width={24} height={24}><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2m-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z" /></svg>,
  Formula: <svg data-testid="FunctionsIcon" width={24} height={24}><path d="M18 4H6v2l6.5 6L6 18v2h12v-3h-7l5-5-5-5h7z" /></svg>,
  Extract: <svg data-testid="InfoIcon" width={24} height={24}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-6h2zm0-8h-2V7h2z" /></svg>,
  Priority: <svg data-testid="PriorityHighIcon" width={24} height={24}><circle cx="12" cy="19" r="2"></circle><path d="M10 3h4v12h-4z"></path></svg>,
  Country: <svg data-testid="FlagIcon" width={24} height={24}><rect x="2" y="4" width="20" height="16" fill="#1976d2" /><rect x="2" y="10" width="20" height="4" fill="#fff" /></svg>,
  Message: <svg data-testid="ChatIcon" width={24} height={24}><path d="M21 6.5a2.5 2.5 0 0 0-2.5-2.5h-13A2.5 2.5 0 0 0 3 6.5v9A2.5 2.5 0 0 0 5.5 18H6v2l2-2h10.5A2.5 2.5 0 0 0 21 15.5v-9z" /></svg>
};

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
    // Ensure all columns have correct structure
    const safeColumns = columns.map(col => {
      if (["Status", "Dropdown", "People"].includes(col.type) && !col.options) {
        return { ...col, options: [] };
      }
      return col;
    });
    console.log('Creating table with columns:', safeColumns);
    await fetch(getApiUrl("/tables"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, columns: safeColumns }),
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
            {/* Country column: Dropdown of countries */}
            {colType === "Country" && (
              <TextField
                id="country-options"
                name="country-options"
                label="Country (comma separated)"
                value={colOptions}
                onChange={(e) => setColOptions(e.target.value)}
                size="small"
              />
            )}
            {/* Message column: Text input */}
            {colType === "Message" && (
              <TextField
                id="message-default"
                name="message-default"
                label="Default Message"
                value={colOptions}
                onChange={(e) => setColOptions(e.target.value)}
                size="small"
              />
            )}
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
          <Typography variant="subtitle2">Essentials</Typography>
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2}>
              {columnTypes.filter(type => essentialsTypes.includes(type.value)).map(type => (
                <Chip key={type.value} label={type.label} />
              ))}
            </Stack>
          </Box>
          <Typography variant="subtitle2">Super useful</Typography>
          <Box sx={{ mb: 2 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {columnTypes.filter(type => superUsefulTypes.includes(type.value)).map(type => (
                <Box key={type.value} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', p: 1 }}
                  onClick={() => setColType(type.value as ColumnType)}>
                  <Box sx={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {columnTypeIcons[type.value]}
                  </Box>
                  <Typography variant="body1">{type.label}</Typography>
                </Box>
              ))}
            </div>
          </Box>
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
