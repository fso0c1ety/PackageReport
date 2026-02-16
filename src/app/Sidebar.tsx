import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Drawer,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import SettingsIcon from "@mui/icons-material/Settings";
import WorkspaceDropdown from "./workspaces/WorkspaceDropdown";

function SidebarItem({ icon, label, href }: { icon: React.ReactNode; label: React.ReactNode; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', width: '100%' }} passHref>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: { xs: 0.5, sm: 1 },
          pl: { xs: 0.5, sm: 1 },
          pr: { xs: 0.5, sm: 1 },
          borderRadius: 2,
          cursor: 'pointer',
          color: '#323338',
          fontWeight: 500,
          fontSize: { xs: 14, sm: 16 },
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          transition: 'background 0.2s',
          '&:hover': {
            bgcolor: '#f6f7fb',
          },
        }}
      >
        <Box sx={{ minWidth: { xs: 28, sm: 24 }, width: { xs: 28, sm: 24 }, height: { xs: 28, sm: 24 }, display: 'flex', justifyContent: 'center', alignItems: 'center', mr: 1 }}>{icon}</Box>
        <span style={{ width: '100%', display: 'block', minWidth: 0, maxWidth: '100%' }}>{label}</span>
      </Box>
    </Link>
  );
}

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  // Force router declaration at the very top
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // Fetch workspaces on mount and after creation
  useEffect(() => {
    fetch("http://192.168.0.28:4000/api/workspaces")
      .then((res) => res.json())
      .then(setWorkspaces);
  }, []);

  // Open dialog
  const handleAddWorkspace = () => setDialogOpen(true);

  // Create workspace and auto-create a table, then redirect
  const handleCreateWorkspace = async () => {
    try {
      // 1. Create workspace
      const wsRes = await fetch("http://192.168.0.28:4000/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName }),
      });
      if (!wsRes.ok) throw new Error("Failed to create workspace");
      const ws = await wsRes.json();
      setWorkspaces((prev) => [...prev, ws]);
      setDialogOpen(false);
      setNewWorkspaceName("");
      // 2. Auto-create a table for this workspace, retry if needed
      let table = null;
      let attempts = 0;
      while (!table && attempts < 3) {
        try {
          const tableRes = await fetch(`http://192.168.0.28:4000/api/workspaces/${ws.id}/tables`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: `${ws.name} Table` }),
          });
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
      // 3. Redirect to the new workspace's TableBoard page (adjust route as needed)
      window.location.href = `/table/${table.id}`;
    } catch (err) {
      alert("Failed to create workspace and table. Please try again.");
    }
  };

  const sidebarContent = (
    <Box
      sx={{
        width: { xs: '100%', sm: 220, md: 240 },
        minWidth: 0,
        maxWidth: { xs: '100%', sm: 240 },
        height: '100vh',
        bgcolor: '#23243a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1, sm: 2 },
        gap: 2,
        fontFamily: 'Inter, sans-serif',
        alignItems: 'flex-start',
        overflowX: 'hidden',
      }}
    >
      {/* Top navigation */}
      <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 0, pl: 2 }}>
        <SidebarItem icon={<HomeIcon sx={{ color: '#fff' }} />} label={<span style={{ color: '#fff', fontWeight: 700 }}>Home</span>} href="/home" />
        <SidebarItem icon={null} label={<span style={{ color: '#bfc8e0' }}>My work</span>} href="#" />
        <SidebarItem icon={null} label={<span style={{ color: '#bfc8e0' }}>More</span>} href="#" />
      </Box>
      <Divider sx={{ bgcolor: '#35365a', my: 1 }} />
      {/* monday AI section */}
      <Box sx={{ mb: 1, pl: 2 }}>
        <Typography variant="caption" sx={{ color: '#bfc8e0', mb: 0.5, pl: 1 }}>Smart Manage AI</Typography>
        <SidebarItem icon={<span style={{ color: '#4f51c0' }}>★</span>} label={<span style={{ color: '#fff' }}>AI Sidekick</span>} href="#" />
        <SidebarItem icon={<span style={{ color: '#fd397a' }}>♥</span>} label={<span style={{ color: '#fff' }}>Vibe</span>} href="#" />
        <SidebarItem icon={<span style={{ color: '#4f51c0' }}>🧠</span>} label={<span style={{ color: '#fff' }}>AI Workflows</span>} href="#" />
        <SidebarItem icon={<span style={{ color: '#4f51c0' }}>🤖</span>} label={<span style={{ color: '#fff' }}>AI Agents</span>} href="#" />
        <SidebarItem icon={<span style={{ color: '#4f51c0' }}>📝</span>} label={<span style={{ color: '#fff' }}>AI Notetaker</span>} href="#" />
      </Box>
      <Divider sx={{ bgcolor: '#35365a', my: 1 }} />
      {/* Workspaces section */}
      <Box sx={{ mb: 1, pl: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ color: '#bfc8e0', pl: 0.5, mb: 0.5 }}>Workspaces</Typography>
          <IconButton
            size="small"
            sx={{ color: '#fff', bgcolor: '#35365a', borderRadius: 1, ml: 1, alignSelf: 'center' }}
            onClick={handleAddWorkspace}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ mb: 2 }}>
          <WorkspaceDropdown />
        </Box>
        {/* Workspace buttons replaced by dropdown below */}
      </Box>
      {/* Dialog for new workspace */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            m: 1,
            width: '100%',
            maxWidth: { xs: '100vw', sm: 400 },
            '@media (max-width: 600px)': {
              maxWidth: '100vw',
              m: 0,
            },
          },
        }}
      >
        <DialogTitle>Create New Workspace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateWorkspace}
            disabled={!newWorkspaceName.trim()}
            variant="contained"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
  return (
    <>
      {/* Desktop sidebar */}
      <Box sx={{ display: { xs: 'none', md: 'flex' } }}>{sidebarContent}</Box>
      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={!!mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: { xs: '75vw', sm: 320 },
            maxWidth: { xs: '75vw', sm: 320 },
            p: 1,
            overflowX: 'hidden',
          },
        }}
        PaperProps={{
          sx: {
            bgcolor: '#23243a',
            color: '#fff',
            boxSizing: 'border-box',
            width: { xs: '75vw', sm: 320 },
            maxWidth: { xs: '75vw', sm: 320 },
            p: 1,
            overflowX: 'hidden',
          }
        }}
      >
        {sidebarContent}
      </Drawer>
    </>
  );
}