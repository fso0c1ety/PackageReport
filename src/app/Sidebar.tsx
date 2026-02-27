"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // Added Image import
import { usePathname, useRouter } from "next/navigation";
import { authenticatedFetch } from "./apiUrl";
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
import WorkspaceDropdown from "./(dashboard)/workspaces/WorkspaceDropdown.tsx";
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

  // Fetch workspaces
  useEffect(() => {
    authenticatedFetch("http://192.168.0.28:4000/api/workspaces")
      .then((res) => res.json())
      .then(setWorkspaces)
      .catch((err) => console.error("Failed to fetch workspaces", err));
  }, []);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      const wsRes = await authenticatedFetch("http://192.168.0.28:4000/api/workspaces", {
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
            `http://192.168.0.28:4000/api/workspaces/${ws.id}/tables`,
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
          SmartManage
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
          <Box sx={{ px: 2 }}>
            <WorkspaceDropdown />
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

      {/* Dialog */}
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
