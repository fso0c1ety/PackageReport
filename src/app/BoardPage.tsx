"use client";
import React, { useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { getApiUrl } from "./apiUrl";
import GroupMenu from "./GroupMenu";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import GroupNameModal from "./GroupNameModal";

import TableBoard from "./TableBoard";
import TablesPage from "./TablesPage";
import { Tabs, Tab, IconButton, Tooltip, Box as MuiBox, Menu, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
// Table menu for delete option
function TableMenu({ onDelete }: { onDelete: () => void }) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleDelete = () => { handleClose(); onDelete(); };
  return (
    <>
      <IconButton size="small" onClick={handleClick} aria-label="table menu">
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon fontSize="small" color="error" sx={{ mr: 1 }} />
          Delete table
        </MenuItem>
      </Menu>
    </>
  );
}

interface Table {
  id: string;
  name: string;
  workspaceId: string;
  // ...other fields
}

interface Group {
  id: string;
  name: string;
  color: string;
  completed?: boolean;
}

const initialGroups: Group[] = [
  { id: "default-board", name: "To-Do", color: "#0073ea" },
  { id: "completed", name: "Completed", color: "#00c875", completed: true },
];


function BoardPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);
  const [workspaceNameToDelete, setWorkspaceNameToDelete] = useState<string | null>(null);
  const [tableToDelete, setTableToDelete] = useState<{ id: string, name: string } | null>(null);

  // Workspace delete dialog handlers
  const cancelWorkspaceDelete = () => {
    setWorkspaceToDelete(null);
    setWorkspaceNameToDelete(null);
  };
  const confirmWorkspaceDelete = async () => {
    if (workspaceToDelete) {
      await fetch(getApiUrl(`/workspaces/${workspaceToDelete}`), { method: 'DELETE' });
      setWorkspaceToDelete(null);
      setWorkspaceNameToDelete(null);
      await fetchTables();
    }
  };
  
  // Table delete dialog handlers
  const handleTableDelete = (id: string, name: string) => {
    setTableToDelete({ id, name });
  };
  const cancelTableDelete = () => {
    setTableToDelete(null);
  };
  const confirmTableDelete = async () => {
    if (tableToDelete) {
      await fetch(getApiUrl(`/tables/${tableToDelete.id}`), { method: 'DELETE' });
      setTableToDelete(null);
      await fetchTables();
    }
  };

  // Fetch all tables from backend
  const fetchTables = async () => {
      // Workspace delete handler (to be passed to GroupMenu)
      const handleWorkspaceDelete = (id: string, name: string) => {
        setWorkspaceToDelete(id);
        setWorkspaceNameToDelete(name);
      };

      const confirmWorkspaceDelete = async () => {
        if (workspaceToDelete) {
          await fetch(getApiUrl(`/workspaces/${workspaceToDelete}`), { method: 'DELETE' });
          setWorkspaceToDelete(null);
          setWorkspaceNameToDelete(null);
          await fetchTables();
        }
      };

      const cancelWorkspaceDelete = () => {
        setWorkspaceToDelete(null);
        setWorkspaceNameToDelete(null);
      };
    const res = await fetch(getApiUrl(`/tables`));
    const allTables = await res.json();
    setTables(allTables);
    // Set default to the correct tableId for automation
    const automationTableId = "ca9b23aa-1158-4d78-97ef-4c2caa04e20b";
    const found = allTables.find(t => t.id === automationTableId);
    if (found) {
      setSelectedTableId(automationTableId);
    } else if (allTables.length > 0) {
      setSelectedTableId(allTables[0].id);
    } else {
      setSelectedTableId("");
    }
  };

  // Add workspace logic
  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleModalSubmit = async (name: string) => {
    setModalOpen(false);
    // 1. Create workspace
    const res = await fetch(getApiUrl("/workspaces"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const created = await res.json();
    // 2. Create a default table for the new workspace
    const defaultColumns = [
      { id: "task", name: "Task", type: "Text", order: 0 },
      { id: "status", name: "Status", type: "Status", order: 1, options: [
        { value: "Started", color: "#1976d2" },
        { value: "Working on it", color: "#fdab3d" },
        { value: "Done", color: "#00c875" }
      ] },
      { id: "number", name: "Number", type: "Numbers", order: 2 }
    ];
    await fetch(getApiUrl(`/workspaces/${created.id}/tables`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, columns: defaultColumns }),
    });
    await fetchTables();
  };

  // Fetch all tables on mount
  React.useEffect(() => {
    fetchTables();
  }, []);

  return (
    <Box>
      {/* Table tabs for all tables */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        {tables.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Tabs
              value={selectedTableId}
              onChange={(_, v) => setSelectedTableId(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 0, flex: 1 }}
            >
              {tables.map((table) => (
                <Tab
                  key={table.id}
                  value={table.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{table.name}</span>
                      <TableMenu onDelete={() => handleTableDelete(table.id, table.name)} />
                    </Box>
                  }
                  sx={{ minWidth: 80, pr: 0 }}
                />
              ))}
            </Tabs>
          </Box>
        )}
        <Tooltip title="Add Workspace">
          <IconButton color="primary" onClick={() => setModalOpen(true)} size="small" sx={{ ml: 1 }}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Table delete confirmation dialog */}
      <Dialog open={!!tableToDelete} onClose={cancelTableDelete}>
        <DialogTitle>Delete Table</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the table <b>{tableToDelete?.name}</b>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelTableDelete}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmTableDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Workspace delete confirmation dialog */}
      <Dialog open={!!workspaceToDelete} onClose={cancelWorkspaceDelete}>
        <DialogTitle>Delete Workspace</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the workspace <b>{workspaceNameToDelete}</b>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelWorkspaceDelete}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmWorkspaceDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
      <GroupNameModal open={modalOpen} onClose={handleModalClose} onSubmit={handleModalSubmit} mode="create" />
      {showTables ? (
        <TablesPage />
      ) : (
        <Box>
          {tables.filter((table) => table.id === selectedTableId).map((table) => (
            <Box key={table.id} sx={{ mb: { xs: 2, md: 0 } }}>
              <TableBoard tableId={table.id} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default BoardPage;
