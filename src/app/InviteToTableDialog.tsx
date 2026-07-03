"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Typography,
  Box,
  useTheme,
  alpha
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { authenticatedFetch, getApiUrl } from "./apiUrl";
import { useNotification } from "./NotificationContext";

interface Table {
  id: string;
  name: string;
  workspace_id: string;
}

interface Workspace {
  id: string;
  name: string;
}

interface InviteToTableDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export default function InviteToTableDialog({ open, onClose, userId, userName }: InviteToTableDialogProps) {
  const theme = useTheme();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tablesByWorkspace, setTablesByWorkspace] = useState<Record<string, Table[]>>({});
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchWorkspacesAndTables();
    }
  }, [open]);

  const fetchWorkspacesAndTables = async () => {
    setLoading(true);
    try {
      const wsRes = await authenticatedFetch(getApiUrl("workspaces"));
      if (!wsRes.ok) throw new Error("Failed to fetch workspaces");
      const wsData: Workspace[] = await wsRes.json();
      setWorkspaces(wsData);

      const tablesMap: Record<string, Table[]> = {};
      for (const ws of wsData) {
        const tableRes = await authenticatedFetch(getApiUrl(`workspaces/${ws.id}/tables`));
        if (tableRes.ok) {
          tablesMap[ws.id] = await tableRes.json();
        }
      }
      setTablesByWorkspace(tablesMap);
    } catch (err) {
      console.error(err);
      showNotification("Failed to load your tables", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (tableId: string) => {
    setInviting(tableId);
    try {
      const res = await authenticatedFetch(getApiUrl(`tables/${tableId}/invite`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: userId, permission: "edit" }),
      });

      if (!res.ok) throw new Error("Invite failed");
      showNotification(`Invitation sent to ${userName}!`, "success");
      onClose();
    } catch (err) {
      showNotification("Failed to send invitation", "error");
    } finally {
      setInviting(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Invite {userName} to Table</DialogTitle>
      <DialogContent sx={{ minHeight: 300, py: 1 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
            <CircularProgress size={32} />
          </Box>
        ) : workspaces.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            You don't have any workspaces yet.
          </Typography>
        ) : (
          <List sx={{ pt: 0 }}>
            {workspaces.map((ws) => (
              <Box key={ws.id} sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1,
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {ws.name}
                </Typography>
                {(tablesByWorkspace[ws.id] || []).length === 0 ? (
                  <Typography variant="body2" color="text.disabled" sx={{ px: 1, py: 0.5 }}>
                    No tables in this workspace
                  </Typography>
                ) : (
                  tablesByWorkspace[ws.id].map((table) => (
                    <ListItemButton
                      key={table.id}
                      onClick={() => handleInvite(table.id)}
                      disabled={inviting === table.id}
                      sx={{
                        borderRadius: 2,
                        mt: 0.5,
                        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: theme.palette.primary.main }}>
                        <DashboardIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={table.name}
                        primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                      />
                      {inviting === table.id && <CircularProgress size={16} />}
                    </ListItemButton>
                  ))
                )}
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: theme.palette.text.secondary }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
