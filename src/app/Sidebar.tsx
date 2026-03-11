"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // Added Image import
import { usePathname, useRouter } from "next/navigation";
import { authenticatedFetch, getApiUrl, getAvatarUrl } from "./apiUrl";
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
  Avatar,
  alpha,
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
import GroupIcon from "@mui/icons-material/Group";
import AddLinkIcon from "@mui/icons-material/AddLink";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WorkspaceDropdown from "./(dashboard)/workspaces/WorkspaceDropdown";
import appLogo from "./icon.png";
import { useNotification } from "./NotificationContext";

// --- Components ---

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon, label, href, isActive, onClick }: SidebarItemProps) {
  const theme = useTheme();
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
          bgcolor: isActive ? theme.palette.action.selected : "transparent",
          color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            bgcolor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            transform: "translateX(4px)",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 36,
            color: isActive ? theme.palette.primary.main : "inherit",
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
  const { showNotification } = useNotification();
  const [currentUser, setCurrentUser] = useState<any>(null); // Added state for user


  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCodeValue, setInviteCodeValue] = useState("");


  const currentWorkspaceId = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('id');

  // Fetch workspaces and user
  useEffect(() => {
    // Load local user immediately for fast render
    let storedUserStr: string | null = null;
    try {
      storedUserStr = localStorage.getItem("user");
      if (storedUserStr) {
        setCurrentUser(JSON.parse(storedUserStr));
      }
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
    }

    // Fetch fresh profile from API so avatar is always up-to-date
    authenticatedFetch(getApiUrl("users/profile"))
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setCurrentUser(data);
          if (storedUserStr) {
            try {
              const parsed = JSON.parse(storedUserStr);
              localStorage.setItem("user", JSON.stringify({ ...parsed, ...data }));
            } catch (e) {}
          }
        }
      })
      .catch(() => {}); // Silently fail — localStorage data is a good fallback

    authenticatedFetch(getApiUrl("workspaces"))
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch workspaces");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setWorkspaces(data);
      })
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
      showNotification("Workspace created successfully!", "success");
    } catch (err) {
      showNotification("Failed to create workspace. Please try again.", "error");
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
      setEditingWorkspace(null);
      // Trigger a refresh of the dropdown or reload if needed
      window.dispatchEvent(new CustomEvent('workspaceUpdated'));
      showNotification("Workspace renamed successfully!", "success");
    } catch (err) {
      showNotification("Failed to rename workspace. Please try again.", "error");
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
      showNotification("Successfully joined board!", "success");
      setJoinDialogOpen(false);
      setInviteCodeValue("");

      // Dispatch event for components to refresh (like WorkspaceDropdown)
      window.dispatchEvent(new CustomEvent('workspaceUpdated'));

      // Redirect to the new workspace
      router.push(`/workspace?id=${data.workspaceId}`);
    } catch (err: any) {
      showNotification(err.message || "Error joining board. Please check the code.", "error");
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.paper, 
        color: theme.palette.text.primary,
        borderRight: `1px solid ${theme.palette.divider}`,
        paddingTop: { xs: "env(safe-area-inset-top)", md: 0 },
      }}
    >
      {/* Brand Header */}
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
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
            color: theme.palette.text.primary,
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
            bgcolor: alpha(theme.palette.text.primary, 0.05),
            borderRadius: "8px",
            px: 1.5,
            py: 0.8,
            border: "1px solid",
            borderColor: searchFocused ? theme.palette.primary.main : "transparent",
            transition: "all 0.2s",
          }}
        >
          <SearchIcon sx={{ fontSize: 20, color: theme.palette.text.secondary, mr: 1 }} />
          <input
            placeholder="Search..."
            style={{
              background: "transparent",
              border: "none",
              color: theme.palette.text.primary,
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
            icon={<GroupIcon fontSize="small" />}
            label="Team"
            href="#"
            onClick={() => {
              window.location.href = '/settings?tab=team';
              if (onClose) onClose();
            }}
          />
          <SidebarItem
            icon={<SettingsIcon fontSize="small" />}
            label="Settings"
            href="/settings"
            isActive={pathname === "/settings"}
            onClick={onClose}
          />
        </Box>

        <Divider sx={{ borderColor: theme.palette.divider, mx: 3, mb: 3 }} />

        {/* AI Tools Section */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{
              px: 3,
              mb: 1.5,
              display: "block",
              color: theme.palette.text.secondary,
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
                color: theme.palette.text.secondary,
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
                  color: theme.palette.text.secondary,
                  "&:hover": { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover },
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ px: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <WorkspaceDropdown />
          </Box>
          {/* Actions */}
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddLinkIcon />}
              onClick={() => setJoinDialogOpen(true)}
              sx={{
                color: theme.palette.text.primary,
                borderColor: theme.palette.divider,
                '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1) },
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
      <Divider sx={{ borderColor: theme.palette.divider }} />
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1,
            borderRadius: 2,
            cursor: "pointer",
            "&:hover": { bgcolor: theme.palette.action.hover },
          }}
        >
          <Avatar
            src={getAvatarUrl(currentUser?.avatar, currentUser?.name)}
            alt={currentUser?.name || "User"}
            sx={{
              width: 32,
              height: 32,
              bgcolor: theme.palette.primary.main,
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          />
          <Box sx={{ overflow: "hidden" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2, color: theme.palette.text.primary }}>
              {currentUser?.name || "Loading..."}
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {currentUser?.job_title || "Pro Plan"}
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
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none'
          }
        }}
        BackdropProps={{
          sx: {
            bgcolor: alpha(theme.palette.common.black, 0.5),
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, fontWeight: 600, pb: 1, borderBottom: 'none' }}>
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
              sx: { color: theme.palette.text.secondary, '&.Mui-focused': { color: theme.palette.primary.main } }
            }}
            InputProps={{
              sx: {
                color: theme.palette.text.primary,
                bgcolor: theme.palette.action.hover,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.text.secondary },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: 'none' }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateWorkspace}
            disabled={!newWorkspaceName.trim()}
            variant="contained"
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark },
              '&.Mui-disabled': { bgcolor: theme.palette.action.disabledBackground, color: theme.palette.text.disabled },
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
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none'
          }
        }}
        BackdropProps={{
          sx: {
            bgcolor: alpha(theme.palette.common.black, 0.5),
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, fontWeight: 600, pb: 1, borderBottom: 'none' }}>
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
              sx: { color: theme.palette.text.secondary, '&.Mui-focused': { color: theme.palette.primary.main } }
            }}
            InputProps={{
              sx: {
                color: theme.palette.text.primary,
                bgcolor: theme.palette.action.hover,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.text.secondary },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: 'none' }}>
          <Button
            onClick={() => setRenameDialogOpen(false)}
            sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameWorkspace}
            disabled={!renameValue.trim() || renameValue.trim() === editingWorkspace?.name}
            variant="contained"
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark },
              '&.Mui-disabled': { bgcolor: theme.palette.action.disabledBackground, color: theme.palette.text.disabled },
              boxShadow: 'none',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog Removed - Centralized in Settings */}

      {/* Join Boards Dialog */}
      <Dialog
        open={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none'
          }
        }}
        BackdropProps={{
          sx: {
            bgcolor: alpha(theme.palette.common.black, 0.5),
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, fontWeight: 600, pb: 1, borderBottom: 'none' }}>
          Join Board with Code
        </DialogTitle>
        <DialogContent sx={{ pb: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
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
              sx: { color: theme.palette.text.secondary, '&.Mui-focused': { color: theme.palette.primary.main } }
            }}
            InputProps={{
              sx: {
                color: theme.palette.text.primary,
                bgcolor: theme.palette.action.hover,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.text.secondary },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }
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
            sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary, bgcolor: theme.palette.action.hover } }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinBoard}
            disabled={!inviteCodeValue.trim()}
            variant="contained"
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark },
              '&.Mui-disabled': { bgcolor: theme.palette.action.disabledBackground, color: theme.palette.text.disabled },
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
            bgcolor: theme.palette.background.default,
            borderRight: `1px solid ${theme.palette.divider}`,
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
            boxShadow: theme.shadows[8], // Shadow
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}