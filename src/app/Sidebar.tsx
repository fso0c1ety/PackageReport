"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // Added Image import
import { usePathname, useRouter } from "next/navigation";
import { authenticatedFetch, getApiUrl } from "./apiUrl";
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Tooltip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Autocomplete,
  FormControl,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ShareIcon from "@mui/icons-material/Share";
import AddLinkIcon from "@mui/icons-material/AddLink";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WorkspaceDropdown from "./(dashboard)/workspaces/WorkspaceDropdown";
import appLogo from "./icon.png";

// --- Components ---

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon, label, href, isActive, onClick }: SidebarItemProps) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block", width: "100%" }} onClick={onClick}>
      <ListItemButton
        sx={{
          py: 1,
          px: 2,
          mx: 1,
          mb: 0.5,
          borderRadius: 2,
          width: "auto",
          bgcolor: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
          color: isActive ? "#ffffff" : "#94a3b8",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.08)",
            color: "#ffffff",
            transform: "translateX(4px)",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 36,
            color: isActive ? "#818cf8" : "inherit",
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: "0.9rem",
            fontWeight: isActive ? 600 : 500,
            letterSpacing: "0.01em",
          }}
        />
      </ListItemButton>
    </Link>
  );
}

const drawerWidth = 260;

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [usersToShare, setUsersToShare] = useState<any[]>([]);
  const [shareSelectedUser, setShareSelectedUser] = useState<any>(null);
  const [shareSelectedWorkspace, setShareSelectedWorkspace] = useState<any>(null);
  const [tablesInWorkspace, setTablesInWorkspace] = useState<any[]>([]);
  const [shareSelectedTable, setShareSelectedTable] = useState<any>(null);
  const [userSearchInputValue, setUserSearchInputValue] = useState("");

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCodeValue, setInviteCodeValue] = useState("");
  const [sharePermission, setSharePermission] = useState<'read' | 'edit'>('edit');
  const [currentTableInviteCode, setCurrentTableInviteCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  useEffect(() => {
    if (!shareDialogOpen) return;

    // Simple debounce
    const timeoutId = setTimeout(() => {
      const query = userSearchInputValue ? `?q=${encodeURIComponent(userSearchInputValue)}` : '';
      authenticatedFetch(getApiUrl(`people${query}`))
        .then(res => res.ok ? res.json() : [])
        .then(data => setUsersToShare(data || []))
        .catch(err => console.error("Failed to fetch users", err));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchInputValue, shareDialogOpen]);

  const currentWorkspaceId = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('id');

  // Fetch workspaces
  useEffect(() => {
    authenticatedFetch(getApiUrl("workspaces"))
      .then((res) => res.json())
      .then(setWorkspaces)
      .catch((err) => console.error("Failed to fetch workspaces", err));
  }, []);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      const wsRes = await authenticatedFetch(getApiUrl("workspaces"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName }),
      });

      if (!wsRes.ok) throw new Error("Failed to create workspace");
      const ws = await wsRes.json();
      setWorkspaces((prev) => [...prev, ws]);

      // Auto-create table
      let table = null;
      let attempts = 0;
      while (!table && attempts < 3) {
        try {
          const tableRes = await authenticatedFetch(
            getApiUrl(`workspaces/${ws.id}/tables`),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: `${ws.name} Table` }),
            }
          );
          if (tableRes.ok) {
            table = await tableRes.json();
          } else {
            await new Promise((r) => setTimeout(r, 500));
          }
        } catch {
          await new Promise((r) => setTimeout(r, 500));
        }
        attempts++;
      }

      setDialogOpen(false);
      setNewWorkspaceName("");
      if (table && onClose) onClose(); // Close drawer on mobile if open
      if (table) router.push(`/workspace?id=${ws.id}`);
    } catch (err) {
      alert("Failed to create workspace. Please try again.");
    }
  };

  const handleRenameWorkspace = async () => {
    if (!renameValue.trim() || !editingWorkspace) return;
    try {
      const res = await authenticatedFetch(getApiUrl(`workspaces/${editingWorkspace.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });

      if (!res.ok) throw new Error("Failed to rename workspace");
      const updated = await res.json();

      setWorkspaces((prev) =>
        prev.map((ws) => (ws.id === updated.id ? updated : ws))
      );
      setRenameDialogOpen(false);
      setEditingWorkspace(null);
      // Trigger a refresh of the dropdown or reload if needed
      window.dispatchEvent(new CustomEvent('workspaceUpdated'));
    } catch (err) {
      alert("Failed to rename workspace. Please try again.");
    }
  };

  const openRenameDialog = () => {
    const currentWs = workspaces.find(ws => ws.id === currentWorkspaceId);
    if (currentWs) {
      setEditingWorkspace(currentWs);
      setRenameValue(currentWs.name);
      setRenameDialogOpen(true);
    }
  };

  const openShareDialog = async () => {
    setShareDialogOpen(true);
    setUserSearchInputValue("");
    // Initial fetch handled by userSearchInputValue effect
  };

  const handleShareWorkspaceChange = async (ws: any) => {
    setShareSelectedWorkspace(ws);
    setShareSelectedTable(null);
    setCurrentTableInviteCode(null);
    if (!ws) {
      setTablesInWorkspace([]);
      return;
    }
    try {
      const res = await authenticatedFetch(getApiUrl(`workspaces/${ws.id}/tables`));
      if (res.ok) {
        setTablesInWorkspace(await res.json());
      }
    } catch (err) { console.error(err); }
  };

  const fetchInviteCode = async (tableId: string) => {
    setIsGeneratingCode(true);
    try {
      const res = await authenticatedFetch(getApiUrl(`tables/${tableId}/invite-code`), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCurrentTableInviteCode(data.invite_code);
      }
    } catch (err) {
      console.error("Failed to fetch invite code", err);
    } finally {
      setIsGeneratingCode(false);
    }
  };


  const handleShareSubmit = async () => {
    if (!shareSelectedTable || !shareSelectedUser) return;
    try {
      const res = await authenticatedFetch(getApiUrl(`tables/${shareSelectedTable.id}/share`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: shareSelectedUser.id, permission: sharePermission })
      });
      if (!res.ok) throw new Error("Failed to share");
      alert("Successfully shared table!");
      setShareDialogOpen(false);
      setShareSelectedUser(null);
      setShareSelectedWorkspace(null);
      setShareSelectedTable(null);
    } catch (err) {
      alert("Error sharing table. Make sure you are the workspace owner.");
    }
  };

  const handleJoinBoard = async () => {
    if (!inviteCodeValue.trim()) return;
    try {
      const res = await authenticatedFetch(getApiUrl("tables/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCodeValue.trim() })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to join board");
      }
      const data = await res.json();
      alert("Successfully joined board!");
      setJoinDialogOpen(false);
      setInviteCodeValue("");

      // Dispatch event for components to refresh (like WorkspaceDropdown)
      window.dispatchEvent(new CustomEvent('workspaceUpdated'));

      // Redirect to the new workspace
      router.push(`/workspace?id=${data.workspaceId}`);
    } catch (err: any) {
      alert(err.message || "Error joining board. Please check the code.");
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#292a43", // Slightly lighter distinct background
        color: "#ffffff",
        paddingTop: { xs: "env(safe-area-inset-top)", md: 0 }, // Add padding for safe area on mobile
        // Removed borderRight as the container has rounded edges and shadow
      }}
    >
      {/* Brand Header */}
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            position: 'relative',
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src={appLogo}
            alt="App Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontFamily: "var(--font-outfit)",
            fontSize: "1.25rem",
            letterSpacing: "-0.02em",
            background: "linear-gradient(to right, #fff, #cbd5e1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 2px 10px rgba(255,255,255,0.1)",
          }}
        >
          Smart Manage
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: searchFocused ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
            borderRadius: "8px",
            px: 1.5,
            py: 0.8,
            border: "1px solid",
            borderColor: searchFocused ? "#6366f1" : "transparent",
            transition: "all 0.2s",
          }}
        >
          <SearchIcon sx={{ fontSize: 20, color: "#64748b", mr: 1 }} />
          <input
            placeholder="Search..."
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "0.875rem",
              width: "100%",
              outline: "none",
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </Box>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflowY: "auto", "::-webkit-scrollbar": { width: 0 } }}>
        <Box sx={{ mb: 3 }}>
          <SidebarItem
            icon={<HomeIcon fontSize="small" />}
            label="Home"
            href="/home"
            isActive={pathname === "/home" || pathname === "/"}
            onClick={onClose}
          />
          <SidebarItem
            icon={<SettingsIcon fontSize="small" />}
            label="Settings"
            href="/settings"
            isActive={pathname === "/settings"}
            onClick={onClose}
          />
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 3, mb: 3 }} />

        {/* AI Tools Section */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{
              px: 3,
              mb: 1.5,
              display: "block",
              color: "#64748b",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "0.7rem",
              letterSpacing: "0.05em",
            }}
          >
            Smart/Tools AI
          </Typography>
          <SidebarItem icon={<SmartToyIcon fontSize="small" />} label="AI Sidekick" href="#" />
          <SidebarItem icon={<AutoAwesomeIcon fontSize="small" />} label="Vibe" href="#" />
          <SidebarItem icon={<PsychologyIcon fontSize="small" />} label="Reflex" href="#" />
          <SidebarItem
            icon={<RecordVoiceOverIcon fontSize="small" />}
            label="Notetaker"
            href="#"
          />
        </Box>

        {/* Workspaces Section */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              px: 3,
              mb: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#64748b",
                fontWeight: 700,
                textTransform: "uppercase",
                fontSize: "0.7rem",
                letterSpacing: "0.05em",
              }}
            >
              Workspaces
            </Typography>
            <Tooltip title="New Workspace">
              <IconButton
                size="small"
                onClick={() => setDialogOpen(true)}
                sx={{
                  color: "#94a3b8",
                  "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ px: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <WorkspaceDropdown />
            {currentWorkspaceId && (
              <Tooltip title="Rename Workspace">
                <IconButton
                  size="small"
                  onClick={openRenameDialog}
                  sx={{
                    color: "#94a3b8",
                    "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {/* Actions */}
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ShareIcon />}
              onClick={() => setShareDialogOpen(true)}
              sx={{
                bgcolor: '#6366f1',
                '&:hover': { bgcolor: '#5558dd' },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                py: 1
              }}
            >
              Share Boards
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddLinkIcon />}
              onClick={() => setJoinDialogOpen(true)}
              sx={{
                color: '#fff',
                borderColor: '#3a3b5a',
                '&:hover': { borderColor: '#6366f1', bgcolor: 'rgba(99, 102, 241, 0.1)' },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                py: 1
              }}
            >
              Join with Code
            </Button>

          </Box>
        </Box>
      </Box>

      {/* Footer Profile */}
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1,
            borderRadius: 2,
            cursor: "pointer",
            "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            VH
          </Box>
          <Box sx={{ overflow: "hidden" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              Valon Halili
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              Pro Plan
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Create Workspace Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
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
        <DialogTitle sx={{ color: '#fff', fontWeight: 600, pb: 1, borderBottom: 'none' }}>
          Create New Workspace
        </DialogTitle>
        <DialogContent sx={{ pb: 3, pt: 1 }}>
          <TextField
            autoFocus
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            fullWidth
            variant="outlined"
            size="medium"
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
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: 'none' }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ color: '#7d82a8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateWorkspace}
            disabled={!newWorkspaceName.trim()}
            variant="contained"
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#5558dd' },
              '&.Mui-disabled': { bgcolor: 'rgba(99, 102, 241, 0.3)', color: 'rgba(255,255,255,0.3)' },
              boxShadow: 'none',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Workspace Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
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
        <DialogTitle sx={{ color: '#fff', fontWeight: 600, pb: 1, borderBottom: 'none' }}>
          Rename Workspace
        </DialogTitle>
        <DialogContent sx={{ pb: 3, pt: 1 }}>
          <TextField
            autoFocus
            label="New Workspace Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            fullWidth
            variant="outlined"
            size="medium"
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
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: 'none' }}>
          <Button
            onClick={() => setRenameDialogOpen(false)}
            sx={{ color: '#7d82a8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameWorkspace}
            disabled={!renameValue.trim() || renameValue.trim() === editingWorkspace?.name}
            variant="contained"
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#5558dd' },
              '&.Mui-disabled': { bgcolor: 'rgba(99, 102, 241, 0.3)', color: 'rgba(255,255,255,0.3)' },
              boxShadow: 'none',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Boards Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
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
        <DialogTitle sx={{ color: '#fff', fontWeight: 600, pb: 1, borderBottom: 'none' }}>
          Share Board
        </DialogTitle>
        <DialogContent sx={{ pb: 3, pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
            Select a user and choose which table to share with them. They will be able to access the board and chat.
          </Typography>

          <FormControl fullWidth>
            <Autocomplete
              options={usersToShare}
              getOptionLabel={(option) => `${option.name} (${option.email})`}
              value={shareSelectedUser}
              onChange={(e, newValue) => setShareSelectedUser(newValue)}
              inputValue={userSearchInputValue}
              onInputChange={(event, newInputValue) => setUserSearchInputValue(newInputValue)}
              filterOptions={(x) => x} // Disable local filtering, let backend handle it
              renderOption={(props, option) => (
                <li {...props} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {option.avatar && (
                    <Box
                      component="img"
                      src={option.avatar}
                      alt={option.name}
                      sx={{ width: 28, height: 28, borderRadius: '50%' }}
                    />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {option.email}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search user by name or email"
                  variant="outlined"
                  InputLabelProps={{ sx: { color: '#7d82a8', '&.Mui-focused': { color: '#6366f1' } } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      bgcolor: '#26273b',
                      borderRadius: 2,
                      '& fieldset': { borderColor: '#3a3b5a' },
                      '&:hover fieldset': { borderColor: '#4a4b6a' },
                      '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                    },
                    '& .MuiSvgIcon-root': { color: '#7d82a8' } // dropdown icon color
                  }}
                />
              )}
              PaperComponent={({ children }) => (
                <Box sx={{ bgcolor: '#26273b', color: '#fff' }}>{children}</Box>
              )}
            />
          </FormControl>

          <FormControl fullWidth>
            <Autocomplete
              options={workspaces}
              getOptionLabel={(option) => option.name}
              value={shareSelectedWorkspace}
              onChange={(e, newValue) => handleShareWorkspaceChange(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Workspace"
                  variant="outlined"
                  InputLabelProps={{ sx: { color: '#7d82a8', '&.Mui-focused': { color: '#6366f1' } } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      bgcolor: '#26273b',
                      borderRadius: 2,
                      '& fieldset': { borderColor: '#3a3b5a' },
                      '&:hover fieldset': { borderColor: '#4a4b6a' },
                      '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                    },
                    '& .MuiSvgIcon-root': { color: '#7d82a8' }
                  }}
                />
              )}
              PaperComponent={({ children }) => (
                <Box sx={{ bgcolor: '#26273b', color: '#fff' }}>{children}</Box>
              )}
            />
          </FormControl>

          <FormControl fullWidth>
            <Autocomplete
              options={tablesInWorkspace}
              getOptionLabel={(option) => option.name}
              value={shareSelectedTable}
              onChange={(e, newValue) => {
                setShareSelectedTable(newValue);
                if (newValue) fetchInviteCode(newValue.id);
                else setCurrentTableInviteCode(null);
              }}
              disabled={!shareSelectedWorkspace || tablesInWorkspace.length === 0}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Table"
                  variant="outlined"
                  InputLabelProps={{ sx: { color: '#7d82a8', '&.Mui-focused': { color: '#6366f1' } } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      bgcolor: '#26273b',
                      borderRadius: 2,
                      '& fieldset': { borderColor: '#3a3b5a' },
                      '&:hover fieldset': { borderColor: '#4a4b6a' },
                      '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                      '&.Mui-disabled': { opacity: 0.6 }
                    },
                    '& .MuiSvgIcon-root': { color: '#7d82a8' }
                  }}
                />
              )}
              PaperComponent={({ children }) => (
                <Box sx={{ bgcolor: '#26273b', color: '#fff' }}>{children}</Box>
              )}
            />
          </FormControl>

          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1, display: 'block', fontWeight: 600 }}>
              PERMISSION
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                fullWidth
                onClick={() => setSharePermission('edit')}
                sx={{
                  bgcolor: sharePermission === 'edit' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: sharePermission === 'edit' ? '#6366f1' : '#94a3b8',
                  border: `1px solid ${sharePermission === 'edit' ? '#6366f1' : '#3a3b5a'}`,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' }
                }}
              >
                Editable
              </Button>
              <Button
                size="small"
                fullWidth
                onClick={() => setSharePermission('read')}
                sx={{
                  bgcolor: sharePermission === 'read' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: sharePermission === 'read' ? '#6366f1' : '#94a3b8',
                  border: `1px solid ${sharePermission === 'read' ? '#6366f1' : '#3a3b5a'}`,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' }
                }}
              >
                Read-only
              </Button>
            </Box>
          </Box>

          {shareSelectedTable && (
            <Box sx={{
              mt: 1,
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              border: '1px dashed rgba(99, 102, 241, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                INVITE CODE FOR THIS BOARD
              </Typography>
              {isGeneratingCode ? (
                <Typography variant="h6" sx={{ color: '#fff', letterSpacing: 2 }}>Loading...</Typography>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h5" sx={{ color: '#6366f1', fontWeight: 700, letterSpacing: 4 }}>
                    {currentTableInviteCode || "------"}
                  </Typography>
                  <Tooltip title="Copy Code">
                    <IconButton size="small" onClick={() => {
                      if (currentTableInviteCode) {
                        navigator.clipboard.writeText(currentTableInviteCode);
                        alert("Code copied!");
                      }
                    }} sx={{ color: '#6366f1' }}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              <Typography variant="caption" sx={{ color: '#94a3b8', textAlign: 'center' }}>
                Share this code with teammates so they can join this table.
              </Typography>
            </Box>
          )}


        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: 'none' }}>
          <Button
            onClick={() => setShareDialogOpen(false)}
            sx={{ color: '#7d82a8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleShareSubmit}
            disabled={!shareSelectedUser || !shareSelectedTable}
            variant="contained"
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#5558dd' },
              '&.Mui-disabled': { bgcolor: 'rgba(99, 102, 241, 0.3)', color: 'rgba(255,255,255,0.3)' },
              boxShadow: 'none',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Share
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join Boards Dialog */}
      <Dialog
        open={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
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
        <DialogTitle sx={{ color: '#fff', fontWeight: 600, pb: 1, borderBottom: 'none' }}>
          Join Board with Code
        </DialogTitle>
        <DialogContent sx={{ pb: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            Enter the invitation code provided by the board owner to join.
          </Typography>
          <TextField
            autoFocus
            label="Invitation Code"
            value={inviteCodeValue}
            onChange={(e) => setInviteCodeValue(e.target.value)}
            fullWidth
            variant="outlined"
            size="medium"
            placeholder="e.g. ABC-123"
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
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-input': {
                letterSpacing: 4,
                fontWeight: 700,
                textAlign: 'center'
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: 'none' }}>
          <Button
            onClick={() => setJoinDialogOpen(false)}
            sx={{ color: '#7d82a8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinBoard}
            disabled={!inviteCodeValue.trim()}
            variant="contained"
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#5558dd' },
              '&.Mui-disabled': { bgcolor: 'rgba(99, 102, 241, 0.3)', color: 'rgba(255,255,255,0.3)' },
              boxShadow: 'none',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Join
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      aria-label="mailbox folders"
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            bgcolor: "#23243a",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",

            // Adjust width to fit within the container with margins
            width: `calc(${drawerWidth}px - 32px)`,

            bgcolor: "transparent", // Base transparent to show rounded corners
            border: "none", // Remove border

            // Floating margins
            mt: 2,
            mb: 2,
            ml: 2,
            mr: 0, // No right margin needed as container has padding/space

            height: "calc(100vh - 32px)", // Full height minus vertical margins
            borderRadius: "24px", // Rounded corners
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)", // Shadow
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
