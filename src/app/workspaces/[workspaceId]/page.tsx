"use client";

import { use, useState, useEffect } from "react";
import TableBoard from "../../TableBoard";
import { Box, IconButton, Tabs, Tab, CircularProgress, Menu, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";

export default function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const [tables, setTables] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTableId, setMenuTableId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, idx: number) => {
    setMenuAnchor(event.currentTarget);
    setMenuTableId(tables[idx]?.id || null);
  };
  const handleMenuClose = () => {
    setMenuAnchor(null);
    // Do not clear menuTableId here; clear it after dialog closes
  };
  const handleRename = () => {
    if (!menuTableId) return;
    const table = tables.find(t => t.id === menuTableId);
    if (!table) return;
    setRenameValue(table.name);
    setRenameDialogOpen(true);
    handleMenuClose();
  };
  const handleRenameSave = async () => {
    console.log('Save clicked', { menuTableId, renameValue });
    setRenameError(null);
    if (!menuTableId) {
      setRenameError('No table selected.');
      return;
    }
    try {
      const res = await fetch(`http://192.168.0.29:4000/api/tables/${menuTableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      if (!res.ok) throw new Error('Failed to rename table');
      await fetchTables();
      setSelected(menuTableId);
      setRenameDialogOpen(false);
    } catch (err) {
      setRenameError('Rename failed. Please try again.');
      console.error('Rename error', err);
    }
  };
  const handleRenameCancel = () => {
    setRenameDialogOpen(false);
    setMenuTableId(null);
  };
  const handleDelete = async () => {
    if (!menuTableId) return;
    await fetch(`http://19200/api/tables/${menuTableId}`, {
      method: "DELETE",
    });
    handleMenuClose();
    setSelected(null);
    fetchTables();
  };

  const fetchTables = async () => {
    setLoading(true);
    const res = await fetch(`http://192.168.0.29:4000/api/workspaces/${workspaceId}/tables`);
    const data = await res.json();
    setTables(data);
    // If no tab is selected, select the first one
    if (!selected && data.length > 0) setSelected(data[0].id);
    setLoading(false);
  };

  useEffect(() => {
    fetchTables();
    // Reset selected tab on workspace change
    setSelected(null);
  }, [workspaceId]);

  const handleAddTable = async () => {
    setCreating(true);
    const res = await fetch(`http://192.0/api/workspaces/${workspaceId}/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `New Group ${tables.length + 1}` }),
    });
    setCreating(false);
    const newTable = await res.json();
    await fetchTables();
    setSelected(newTable.id);
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} />;
  if (!tables.length) return (
    <Box sx={{ p: 4 }}>
      <div>No tables found in this workspace.</div>
      <IconButton onClick={handleAddTable} color="primary" sx={{ ml: 2 }} disabled={creating}>
        <AddIcon />
      </IconButton>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tabs
            value={selected}
            onChange={(_, v) => setSelected(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tables.map((table) => (
              <Tab
                key={table.id}
                value={table.id}
                label={
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {table.name}
                    <span
                      style={{ marginLeft: 6, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); handleMenuOpen(e, tables.findIndex(t => t.id === table.id)); }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </span>
                  </span>
                }
              />
            ))}
          </Tabs>
          <IconButton onClick={handleAddTable} color="primary" sx={{ ml: 1 }} disabled={creating}>
            <AddIcon />
          </IconButton>
        </Box>
        {/* Table menu */}
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={handleMenuClose}>
          <MenuItem onClick={handleRename}>Rename</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'red' }}>Delete</MenuItem>
        </Menu>
        {/* Rename dialog */}
        <Dialog open={renameDialogOpen} onClose={handleRenameCancel}>
          <DialogTitle>Rename Table</DialogTitle>
          <DialogContent>
            <TextField
              value={renameValue}
              onChange={e => {
                setRenameValue(e.target.value);
                setRenameError(null);
                console.log('TextField changed', e.target.value);
              }}
              fullWidth
              autoFocus
              error={!!renameError}
              helperText={renameError}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleRenameCancel}>Cancel</Button>
            <Button onClick={handleRenameSave} disabled={!renameValue.trim()} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
      <TableBoard tableId={selected || (tables[0]?.id ?? null)} />
    </Box>
  );
}
