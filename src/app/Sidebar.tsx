import Link from "next/link";
function SidebarItem({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }} passHref>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: 1.2,
          px: 1.5,
          borderRadius: 2,
          cursor: "pointer",
          color: "#323338",
          fontWeight: 500,
          fontSize: 16,
          transition: "background 0.2s",
          '&:hover': {
            bgcolor: "#f6f7fb",
          },
        }}
      >
        {icon}
        <span>{label}</span>
      </Box>
    </Link>
  );
}
import React from "react";
import { Box, Typography, IconButton, Avatar, Divider, Drawer } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import SettingsIcon from "@mui/icons-material/Settings";

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  // Drawer for mobile, Box for desktop
  const sidebarContent = (
    <Box
      sx={{
        width: 240,
        height: '100vh',
        bgcolor: '#23243a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        gap: 2,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Top navigation */}
      <Box sx={{ mb: 1 }}>
        <SidebarItem icon={<HomeIcon sx={{ color: '#fff' }} />} label={<span style={{ color: '#fff', fontWeight: 700 }}>Home</span>} href="/home" />
        <SidebarItem icon={null} label={<span style={{ color: '#bfc8e0' }}>My work</span>} href="#" />
        <SidebarItem icon={null} label={<span style={{ color: '#bfc8e0' }}>More</span>} href="#" />
      </Box>
      <Divider sx={{ bgcolor: '#35365a', my: 1 }} />
      {/* monday AI section */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ color: '#bfc8e0', pl: 1, mb: 0.5 }}>monday AI</Typography>
        <SidebarItem icon={<span style={{ color: '#4f51c0' }}>★</span>} label={<span style={{ color: '#fff' }}>AI Sidekick</span>} href="#" />
        <SidebarItem icon={<span style={{ color: '#fd397a' }}>♥</span>} label={<span style={{ color: '#fff' }}>Vibe</span>} href="#" />
        <SidebarItem icon={<span style={{ color: '#4f51c0' }}>🧠</span>} label={<span style={{ color: '#fff' }}>AI Workflows</span>} href="#" />
        <SidebarItem icon={<span style={{ color: '#4f51c0' }}>🤖</span>} label={<span style={{ color: '#fff' }}>AI Agents</span>} href="#" />
        <SidebarItem icon={<span style={{ color: '#4f51c0' }}>📝</span>} label={<span style={{ color: '#fff' }}>AI Notetaker</span>} href="#" />
      </Box>
      <Divider sx={{ bgcolor: '#35365a', my: 1 }} />
      {/* Favorites section */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ color: '#bfc8e0', pl: 1, mb: 0.5 }}>Favorites</Typography>
      </Box>
      {/* Workspaces section */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ color: '#bfc8e0', pl: 1, mb: 0.5 }}>Workspaces</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, mb: 1 }}>
          <Avatar sx={{ bgcolor: '#4f51c0', width: 32, height: 32 }}>M</Avatar>
          <Typography fontWeight={600} sx={{ color: '#fff' }}>Main workspace...</Typography>
          <IconButton size="small" sx={{ color: '#fff', bgcolor: '#35365a', borderRadius: 1 }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ pl: 6 }}>
          <Typography sx={{ color: '#fff', fontSize: 15, mb: 0.5 }}>Name of the Group</Typography>
          <Typography sx={{ color: '#fff', fontSize: 15 }}>Dashboard and reporting</Typography>
        </Box>
      </Box>
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
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 220 } }}
      >
        {sidebarContent}
      </Drawer>
    </>
  );
}
