"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TableBoard from "../../TableBoard";
import { Box, IconButton, Tabs, Tab, CircularProgress, Menu, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";

import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('id');
  const theme = useTheme();
  // Set last opened workspace in localStorage for HomeDashboard
  useEffect(() => {
    if (typeof window !== 'undefined' && workspaceId) {
      const userJson = localStorage.getItem("user");
      if (!userJson) return;
      const user = JSON.parse(userJson);
      const userId = user.id;
      if (!userId) return;

      const storageKey = `lastWorkspace_${userId}`;

      // Try to get workspace name from API or fallback to id
      authenticatedFetch(getApiUrl(`workspaces/${workspaceId}`))
        .then(res => res.json())
        .then(ws => {
          if (ws && ws.id) {
            localStorage.setItem(storageKey, JSON.stringify({ id: ws.id, name: ws.name || ws.id }));
          }
        })
        .catch(() => {
          localStorage.setItem(storageKey, JSON.stringify({ id: workspaceId, name: workspaceId }));
        });
    }
  }, [workspaceId]);
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
      const res = await authenticatedFetch(getApiUrl(`tables/${menuTableId}`), {
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
    await authenticatedFetch(getApiUrl(`tables/${menuTableId}`), {
      method: "DELETE",
    });
    handleMenuClose();
    setSelected(null);
    fetchTables();
  };

  const fetchTables = async () => {
    setLoading(true);
    const res = await authenticatedFetch(getApiUrl(`workspaces/${workspaceId}/tables`));
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
    // Default columns for new group/table
    const defaultColumns = [
      { id: 'text', name: 'Text', type: 'Text', order: 0 },
      {
        id: 'status', name: 'Status', type: 'Status', order: 1, options: [
          { value: 'Started', color: '#1976d2' },
          { value: 'Working on it', color: '#fdab3d' },
          { value: 'Done', color: '#00c875' }
        ]
      },
      { id: 'date', name: 'Date', type: 'Date', order: 2 }
    ];
    const res = await authenticatedFetch(getApiUrl(`workspaces/${workspaceId}/tables`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `New Group ${tables.length + 1}`, columns: defaultColumns }),
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
    <Box sx={{ p: 0 }}>
      {/* Table tabs and actions - Redesigned */}
      <Box sx={{
        display: "flex",
        alignItems: "center",
        mb: 2,
        px: 3,
        pt: 2
      }}>
        <Tabs
          value={selected}
          onChange={(_, v) => setSelected(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
              height: 3,
              borderRadius: '3px 3px 0 0'
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 48,
              fontWeight: 500,
              fontSize: '0.95rem',
              color: '#ffffff',
              mr: 2,
              '&:hover': {
                color: '#ffffff',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
              },
              '&.Mui-selected': {
                color: '#ffffff',
                fontWeight: 600
              }
            }
          }}
        >
          {tables.map((table) => (
            <Tab
              key={table.id}
              value={table.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{table.name}</span>
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                      color: 'inherit',
                      opacity: selected === table.id ? 1 : 0.5,
                      '&:hover': {
                        bgcolor: theme.palette.action.hover,
                        opacity: 1
                      }
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      handleMenuOpen(e, tables.findIndex(t => t.id === table.id));
                    }}
                  >
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Box>
              }
            />
          ))}
        </Tabs>
        <IconButton
          onClick={handleAddTable}
          disabled={creating}
          size="small"
          sx={{
            ml: 1,
            bgcolor: '#0073ea',
            color: '#fff',
            '&:hover': { bgcolor: '#0060c2' },
            width: 32,
            height: 32
          }}
        >
          <AddIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Table menu */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 2,
            minWidth: 150,
            boxShadow: theme.shadows[4],
            '& .MuiMenuItem-root': {
              fontSize: '0.9rem',
              py: 1,
              '&:hover': { bgcolor: theme.palette.action.hover }
            }
          }
        }}
      >
        <MenuItem onClick={handleRename}>
          <Box component="span" sx={{ flex: 1 }}>Rename</Box>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: '#e2445c' }}>
          <Box component="span" sx={{ flex: 1 }}>Delete</Box>
        </MenuItem>
      </Menu>

      {/* Rename dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={handleRenameCancel}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e1f2b',
            color: '#fff',
            borderRadius: 3,
            border: '1px solid #3a3b5a',
            backgroundImage: 'none'
          }
        }}
        BackdropProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 600, pb: 1 }}>Rename Table</DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Table Name"
            type="text"
            fullWidth
            variant="outlined"
            value={renameValue}
            onChange={e => {
              setRenameValue(e.target.value);
              setRenameError(null);
            }}
            error={!!renameError}
            helperText={renameError}
            InputLabelProps={{
              sx: { color: '#7d82a8', '&.Mui-focused': { color: '#6366f1' } }
            }}
            InputProps={{
              sx: {
                color: '#fff',
                bgcolor: '#26273b',
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3a3b5a' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4a4b6a' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' }
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleRenameCancel}
            sx={{ color: '#7d82a8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameSave}
            disabled={!renameValue.trim()}
            variant="contained"
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#5558dd' },
              '&.Mui-disabled': { bgcolor: 'rgba(99, 102, 241, 0.3)', color: 'rgba(255,255,255,0.3)' }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <TableBoard tableId={selected || (tables[0]?.id ?? null)} />
    </Box>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
      <WorkspaceContent />
    </Suspense>
  );
}
