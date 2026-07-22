"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TableBoard from "../../TableBoard";
import { Box, IconButton, Tabs, Tab, CircularProgress, Menu, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { authenticatedFetch, getApiUrl, navigateToAppRoute } from "../../apiUrl";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = searchParams.get('id');
  const tableIdParam = searchParams.get('tableId');
  const taskIdParam = searchParams.get('taskId');
  const tabParam = searchParams.get('tab');
  const moduleParam = searchParams.get('module');
  const viewParam = searchParams.get('view');
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
        .then(res => {
          if (!res.ok) {
            throw new Error(`Workspace fetch failed (${res.status})`);
          }
          return res.json();
        })
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
  const [selected, setSelected] = useState<string>(tableIdParam || ""); // Init with param if present

  // Update selected if param changes
  useEffect(() => {
    if (tableIdParam) {
        setSelected(tableIdParam);
    }
  }, [tableIdParam]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTableId, setMenuTableId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceId || typeof window === 'undefined') return;

    let cancelled = false;
    const resolveWorkspace = async () => {
      setLoading(true);
      try {
        const response = await authenticatedFetch(getApiUrl('workspaces'));
        if (!response.ok) throw new Error(`Failed to load workspaces (${response.status})`);
        const availableWorkspaces = await response.json();
        if (!Array.isArray(availableWorkspaces) || availableWorkspaces.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }

        let preferredId = '';
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            const storedWorkspace = user?.id ? localStorage.getItem(`lastWorkspace_${user.id}`) : null;
            const parsedWorkspace = storedWorkspace ? JSON.parse(storedWorkspace) : null;
            if (parsedWorkspace?.id && availableWorkspaces.some((workspace: any) => workspace.id === parsedWorkspace.id)) {
              preferredId = parsedWorkspace.id;
            }
          } catch {
            // Fall back to the first accessible workspace below.
          }
        }

        const targetId = preferredId || availableWorkspaces[0].id;
        if (!cancelled && targetId) {
          navigateToAppRoute(`/workspace?id=${encodeURIComponent(targetId)}`, router, true);
        }
      } catch (error) {
        console.error('Failed to resolve default workspace', error);
        if (!cancelled) setLoading(false);
      }
    };

    void resolveWorkspace();
    return () => {
      cancelled = true;
    };
  }, [router, workspaceId]);
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
    setSelected("");
    fetchTables();
  };

  const fetchTables = async () => {
    if (!workspaceId) return;
    setLoading(true);
    const [res, modulesRes] = await Promise.all([
      authenticatedFetch(getApiUrl(`workspaces/${workspaceId}/tables`)),
      authenticatedFetch(getApiUrl(`workspaces/${workspaceId}/modules`), { suppressNativeErrorAlert: true }),
    ]);
    if (!res.ok) {
      throw new Error(`Failed to fetch tables (${res.status})`);
    }
    const allTables = await res.json();
    const modulesData = modulesRes.ok ? await modulesRes.json() : null;
    const enabledModules = Array.isArray(modulesData?.modules) ? modulesData.modules : null;
    const patterns: Record<string, RegExp> = {
      crm: /lead|deal|pipeline|contact|compan/i, customers: /customer|client/i,
      finance: /invoice|expense|payment|revenue|finance|account/i, inventory: /product|stock|inventory|material|warehouse/i,
      hr: /employee|leave|staff|human resource/i, fleet: /truck|driver|trip|vehicle|fleet|fuel/i,
      logistics: /load|carrier|freight|dispatch/i, documents: /document|file|pod|contract/i,
      tasks: /task|work item|todo/i, maintenance: /maintenance|service|repair|oil|tire|insurance|registration|tachograph/i,
    };
    const boardModule = (name: string) => Object.entries(patterns).find(([, pattern]) => pattern.test(name))?.[0];
    const data = Array.isArray(allTables) && enabledModules
      ? allTables.filter((table: any) => {
          const requiredModule = boardModule(String(table.name || ""));
          if (moduleParam) return requiredModule === moduleParam;
          return !requiredModule || enabledModules.includes(requiredModule);
        })
      : allTables;
    setTables(data);
    setSelected((prev) => {
      if (tableIdParam && data.some((table: any) => table.id === tableIdParam)) return tableIdParam;
      if (prev && data.some((table: any) => table.id === prev)) return prev;
      return data[0]?.id || "";
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchTables().catch(err => {
      console.error('Failed to fetch workspace tables', err);
      setTables([]);
      setLoading(false);
    });
    // Reset selected tab on workspace change
    setSelected("");

    const handleUpdate = () => {
      fetchTables().catch(err => {
        console.error('Failed to refresh workspace tables', err);
        setLoading(false);
      });
    };
    window.addEventListener('workspaceUpdated', handleUpdate);
    return () => {
      window.removeEventListener('workspaceUpdated', handleUpdate);
    };
  }, [moduleParam, workspaceId]);

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

  const selectedTableId = tables.some((table) => table.id === selected) ? selected : (tables[0]?.id || "");

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
          value={selectedTableId}
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
              color: theme.palette.text.secondary,
              mr: 2,
              '&:hover': {
                color: theme.palette.text.primary,
                bgcolor: theme.palette.action.hover
              },
              '&.Mui-selected': {
                color: theme.palette.primary.main,
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
        <Tooltip title="Add Table">
          <IconButton
            onClick={handleAddTable}
            disabled={creating}
            size="small"
            sx={{
              ml: 1,
              bgcolor: '#0073ea',
              color: 'text.primary',
              '&:hover': { bgcolor: '#0060c2' },
              width: 32,
              height: 32
            }}
          >
            <AddIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
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
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderRadius: 3,
            border: '1px solid '+theme.palette.divider+'',
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
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 600, pb: 1 }}>Rename Table</DialogTitle>
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
              sx: { color: 'text.secondary', '&.Mui-focused': { color: '#6366f1' } }
            }}
            InputProps={{
              sx: {
                color: 'text.primary',
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
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.05)' } }}
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
      <TableBoard 
        tableId={selectedTableId || null} 
        taskId={selectedTableId === tableIdParam ? taskIdParam : undefined}
        initialTab={selectedTableId === tableIdParam ? tabParam : undefined}
        initialView={selectedTableId === tableIdParam && viewParam === 'map' ? 'map' : undefined}
      />
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
