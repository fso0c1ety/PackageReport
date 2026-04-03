"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  AvatarGroup,
  IconButton,
  Button,
  Chip,
  Skeleton,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { authenticatedFetch, getApiUrl, getAvatarUrl } from "../../apiUrl";
import { v4 as uuidv4 } from "uuid";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import NotificationsnoneIcon from "@mui/icons-material/NotificationsNone";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder"; // Placeholder for workspace icon
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LogoutIcon from "@mui/icons-material/Logout";

// --- Styled Components ---

const DashboardContainer = styled(Box)(({ theme }) => ({
  minHeight: "100%",
  backgroundColor: theme.palette.background.default, // Matches app background
  color: theme.palette.text.primary,
  fontFamily: "'Inter', sans-serif",
  padding: theme.spacing(4),
  width: '100%',
  boxSizing: 'border-box',
  overflowX: 'hidden',
  [theme.breakpoints.up("md")]: {
    padding: theme.spacing(3, 4), // More horizontal padding
  },
  [theme.breakpoints.up("lg")]: {
    width: "100%", // Limit max width on very large screens for better readability
    maxWidth: "100%",
    margin: "0 auto",
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "1.1rem",
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  [theme.breakpoints.up("md")]: {
    fontSize: "1.25rem", // Larger title on desktop
    marginBottom: theme.spacing(3),
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.primary,
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
    borderColor: "#6366f1", // Indigo accent on hover
  },
}));

const RecentCard = styled(StyledCard)(({ theme }) => ({
  cursor: "pointer",
  height: "100%",
  display: "flex",
  flexDirection: "row", // Horizontal layout everywhere
  alignItems: "stretch", // Stretch image and content
  overflow: "hidden",
}));

const WorkspaceCard = styled(StyledCard)(({ theme }) => ({
  cursor: "pointer",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: theme.spacing(2),
  gap: theme.spacing(1),
  [theme.breakpoints.up("md")]: {
    flexDirection: "row",
    textAlign: "left",
    gap: theme.spacing(2.5), // Increased gap
    padding: theme.spacing(3), // Increased padding
    justifyContent: "flex-start"
  }
}));

const InboxItem = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  "&:last-child": {
    borderBottom: "none",
  },
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
}));

// --- Helper Functions ---

function getLastWorkspace() {
  if (typeof window === "undefined") return null;
  try {
    const userJson = localStorage.getItem("user");
    if (!userJson) return null;
    const user = JSON.parse(userJson);
    const userId = user.id;
    if (!userId) return null;

    const ws = localStorage.getItem(`lastWorkspace_${userId}`);
    return ws ? JSON.parse(ws) : null;
  } catch {
    return null;
  }
}

// --- Main Component ---


const TEMPLATES = [
  {
    title: "Project Tracker",
    color: "#e11d48",
    icon: "📊",
    columns: [
      { name: "Priority", type: "Dropdown", options: [{value: "High"}, {value: "Medium"}, {value: "Low"}] },
      { name: "Due Date", type: "Date" },
      { name: "Owner", type: "People" },
      { name: "Status", type: "Status", options: [{value: "Stuck"}, {value: "Working on it"}, {value: "Done"}] },
    ]
  },
  {
    title: "CRM & Sales",
    color: "#2563eb",
    icon: "💼",
    columns: [
      { name: "Stage", type: "Status", options: [{value: "Lead"}, {value: "Contacted"}, {value: "Negotiation"}, {value: "Won"}, {value: "Lost"}] },
      { name: "Deal Value", type: "Numbers" },
      { name: "Sales Rep", type: "People" },
      { name: "Last Contact", type: "Date" },
    ]
  },
  {
    title: "Content Calendar",
    color: "#d97706",
    icon: "📅",
    columns: [
      { name: "Platform", type: "Dropdown", options: [{value: "Blog"}, {value: "LinkedIn"}, {value: "Twitter"}, {value: "Instagram"}] },
      { name: "Author", type: "People" },
      { name: "Publish Date", type: "Date" },
      { name: "Status", type: "Status", options: [{value: "Idea"}, {value: "Drafting"}, {value: "Scheduled"}, {value: "Published"}] },
    ]
  },
  {
    title: "Software Development",
    color: "#10b981",
    icon: "🖥️",
    columns: [
      { name: "Assignee", type: "People" },
      { name: "Type", type: "Dropdown", options: [{value: "Feature"}, {value: "Bug"}, {value: "Task"}] },
      { name: "Priority", type: "Status", options: [{value: "Critical"}, {value: "High"}, {value: "Normal"}, {value: "Low"}] },
      { name: "Status", type: "Status", options: [{value: "Backlog"}, {value: "In Progress"}, {value: "Code Review"}, {value: "Done"}] },
    ]
  },
  {
    title: "Event Planning",
    color: "#8b5cf6",
    icon: "🎉",
    columns: [
      { name: "Date", type: "Date" },
      { name: "Location", type: "Text" },
      { name: "Budget", type: "Numbers" },
      { name: "Status", type: "Status", options: [{value: "Planning"}, {value: "Booked"}, {value: "Confirmed"}, {value: "Done"}] },
    ]
  },
  {
    title: "HR & Recruiting",
    color: "#ec4899",
    icon: "👥",
    columns: [
      { name: "Position", type: "Dropdown", options: [{value: "Engineering"}, {value: "Product"}, {value: "Sales"}, {value: "Marketing"}] },
      { name: "Candidate", type: "Text" },
      { name: "Interviewer", type: "People" },
      { name: "Status", type: "Status", options: [{value: "Applied"}, {value: "Screening"}, {value: "Interview"}, {value: "Offer"}, {value: "Hired"}] },
    ]
  },
  {
    title: "Agile Sprint",
    color: "#3b82f6",
    icon: "🔄",
    columns: [
      { name: "Story Points", type: "Numbers" },
      { name: "Sprint", type: "Dropdown", options: [{value: "Sprint 1"}, {value: "Sprint 2"}, {value: "Sprint 3"}] },
      { name: "Assignee", type: "People" },
      { name: "Status", type: "Status", options: [{value: "To Do"}, {value: "In Progress"}, {value: "Blocked"}, {value: "Done"}] },
    ]
  },
  {
    title: "Personal Finance",
    color: "#22c55e", 
    icon: "💰",
    columns: [
       { name: "Category", type: "Dropdown", options: [{value: "Housing"}, {value: "Food"}, {value: "Transport"}, {value: "Entertainment"}] },
       { name: "Amount", type: "Numbers" },
       { name: "Due Date", type: "Date" },
       { name: "Status", type: "Status", options: [{value: "Pending"}, {value: "Paid"}] },
    ]
  },
  {
    title: "Marketing Campaign",
    color: "#f59e0b",
    icon: "📢",
    columns: [
       { name: "Channel", type: "Dropdown", options: [{value: "Social Media"}, {value: "Email"}, {value: "SEO"}, {value: "PPC"}] },
       { name: "Budget", type: "Numbers" },
       { name: "Launch Date", type: "Date" },
       { name: "Status", type: "Status", options: [{value: "Planning"}, {value: "Active"}, {value: "Paused"}, {value: "Completed"}] },
    ]
  },
];

export default function HomeDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [isWorkspacePickerOpen, setIsWorkspacePickerOpen] = useState(false);
  const [templateTargetWorkspace, setTemplateTargetWorkspace] = useState<string>("");

  const handleOpenTemplatePicker = (template: typeof TEMPLATES[0]) => {
    setPendingTemplate(template);
    setTemplateTargetWorkspace(workspaces[0]?.id || "");
    setIsWorkspacePickerOpen(true);
  };

  const handleConfirmTemplateCreate = async () => {
    if (!pendingTemplate || !templateTargetWorkspace) return;
    setIsWorkspacePickerOpen(false);

    try {
      setIsCreatingTemplate(pendingTemplate.title);

      const newTablePayload = {
        name: pendingTemplate.title,
        workspaceId: templateTargetWorkspace,
        columns: pendingTemplate.columns.map((col, idx) => ({
          id: uuidv4(),
          name: col.name,
          type: col.type,
          order: idx,
          options: (col as any).options || undefined
        }))
      };

      const res = await authenticatedFetch(getApiUrl("/tables"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTablePayload),
      });

      if (res.ok) {
        const newTable = await res.json();
        router.push(`/board/${newTable.id}`);
      } else {
        console.error("Failed to create template table");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingTemplate(null);
      setPendingTemplate(null);
    }
  };

  const [emailUpdates, setEmailUpdates] = useState<any[]>([]);
  // Start with null to prevent hydration mismatch
  const [lastWorkspace, setLastWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Good morning");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // State for Rename/Delete
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [renameName, setRenameName] = useState("");

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, ws: any) => {
    event.stopPropagation();
    event.preventDefault();
    setAnchorEl(event.currentTarget);
    setSelectedWorkspace(ws);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkspace(null);
  };

  const handleRenameStart = () => {
    setRenameName(selectedWorkspace?.name || "");
    setIsRenameOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteStart = () => {
    setIsDeleteOpen(true);
    setAnchorEl(null);
  };

  const handleRenameSubmit = async () => {
    if (!selectedWorkspace || !renameName.trim()) return;

    try {
      const res = await authenticatedFetch(getApiUrl(`workspaces/${selectedWorkspace.id}`), {
        method: 'PUT',
        body: JSON.stringify({ name: renameName })
      });

      if (res.ok) {
        setWorkspaces(prev => prev.map(w => w.id === selectedWorkspace.id ? { ...w, name: renameName } : w));
        setIsRenameOpen(false);
        handleMenuClose();
      }
    } catch (err) {
      console.error("Failed to rename workspace", err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedWorkspace) return;

    try {
      const res = await authenticatedFetch(getApiUrl(`workspaces/${selectedWorkspace.id}`), {
        method: 'DELETE'
      });

      if (res.ok) {
        setWorkspaces(prev => prev.filter(w => w.id !== selectedWorkspace.id));
        setIsDeleteOpen(false);
        handleMenuClose();
      }
    } catch (err) {
      console.error("Failed to delete workspace", err);
    }
  };

  const handleLeaveStart = () => {
    setIsLeaveOpen(true);
    setAnchorEl(null);
  };

  const handleLeaveConfirm = async () => {
    if (!selectedWorkspace) return;

    try {
      const res = await authenticatedFetch(getApiUrl(`workspaces/${selectedWorkspace.id}/leave`), {
        method: 'DELETE'
      });

      if (res.ok) {
        setWorkspaces(prev => prev.filter(w => w.id !== selectedWorkspace.id));
        setIsLeaveOpen(false);
        handleMenuClose();
      }
    } catch (err) {
      console.error("Failed to leave workspace", err);
    }
  };

  // Load client-only data once mounted
  useEffect(() => {
    setLastWorkspace(getLastWorkspace());
    
    // Set Current User
    const userJson = localStorage.getItem("user");
    if (userJson) { 
        try { setCurrentUser(JSON.parse(userJson)); } catch(e){}
    }

    // Set greeting based on client time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const wsRes = await authenticatedFetch(getApiUrl("workspaces"));
        if (!wsRes.ok) {
            throw new Error(`Failed to fetch workspaces: ${wsRes.status}`);
        }
        const wsData = await wsRes.json();
        
        if (Array.isArray(wsData)) {
            setWorkspaces(wsData);
            setError(null);
        } else {
            // If API returns an error object, treat it as an error, not empty array
            console.error("Workspace API returned non-array:", wsData);
            setError("Could not load workspaces.");
        }
      } catch (err) {
        console.error("Failed to load workspaces", err);
        setError("Failed to load workspaces. Please simplify your network settings or check your connection.");
      } finally {
        setLoading(false);
      }
    };

    const fetchUpdates = async () => {
      try {
        const updatesRes = await authenticatedFetch(getApiUrl("email-updates"));
        if (!updatesRes.ok) throw new Error("Failed to fetch email updates");
        const updatesData = await updatesRes.json();
        setEmailUpdates(Array.isArray(updatesData) ? updatesData : []);
      } catch (err) {
        console.error("Failed to load email updates", err);
      }
    };

    // Initial fetches (independent to avoid blocking UI)
    fetchWorkspaces();
    fetchUpdates();

    // Poll for updates (optional)
    const interval = setInterval(() => {
        fetchWorkspaces();
        fetchUpdates();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handler = () => setLastWorkspace(getLastWorkspace());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);



  return (
    <DashboardContainer>
      {/* Header */}
      <Box sx={{ mb: { xs: 7, md: 5 }, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1, letterSpacing: "-0.02em", fontSize: { md: "2.25rem" } }}>
            {greeting}, {currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontSize: { md: "1.1rem" } }}>
            Here's what's happening with your projects today.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content Column */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Recently Visited */}
          <Box sx={{ mb: 5 }}>
            <SectionTitle>
              <AccessTimeIcon sx={{ color: "#6366f1", fontSize: 20 }} />
              Recently Visited
            </SectionTitle>
            <Grid container spacing={3} alignItems="stretch">
              {/* Dashboard Card - Takes 12 on mobile, 6 on desktop (half width) */}
              <Grid size={{ xs: 12, sm: 6, md: 6 }} sx={{ display: 'flex' }}>
                <Link href="/dashboard" style={{ textDecoration: 'none', width: '100%', display: 'flex' }}>
                  <RecentCard sx={{ width: '100%' }}>
                    <Box
                      sx={{
                        height: 'auto',
                        minHeight: { xs: 120, md: 140 }, // Reduced from 160
                        width: { xs: 120, sm: 180, md: 210 }, // Reduced from 240
                        flexShrink: 0,
                        bgcolor: "#35365a",
                        backgroundImage: "url(/dashboard.svg)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        position: "relative",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: "linear-gradient(to top, rgba(44, 45, 74, 0.9) 0%, transparent 100%)",
                        }}
                      />
                      <Chip
                        label="Main Workspace"
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          bgcolor: "rgba(0,0,0,0.4)",
                          color: theme.palette.text.primary,
                          backdropFilter: "blur(4px)",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                        }}
                      />
                    </Box>
                    <CardContent sx={{ flex: 1, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ fontSize: { md: "1.15rem" } }}>
                        Dashboard & Reporting
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: { md: "0.85rem" } }}>
                        Overview of all project metrics
                      </Typography>
                    </CardContent>
                  </RecentCard>
                </Link>
              </Grid>

              {/* Last Workspace Card - Takes 12 on mobile, 6 on desktop (half width) */}
              {lastWorkspace && (
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                  <Link href={`/workspace?id=${lastWorkspace.id}`} style={{ textDecoration: 'none', width: '100%', display: 'flex' }}>
                    <RecentCard sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          height: 'auto',
                          minHeight: { xs: 120, md: 140 }, // Reduced from 160
                          width: { xs: 140, sm: 200, md: 250 }, // Reduced from 240
                          flexShrink: 0,
                          bgcolor: "#3b3c5a",
                          backgroundImage: "url(/Group.svg)",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          position: "relative",
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "linear-gradient(to top, rgba(44, 45, 74, 0.9) 0%, transparent 100%)",
                          }}
                        />
                        <Chip
                          label="Recent"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            bgcolor: "rgba(99, 102, 241, 0.8)", // Accent color
                            color: theme.palette.text.primary,
                            fontWeight: 600,
                            fontSize: "0.7rem",
                          }}
                        />
                      </Box>
                      <CardContent sx={{ flex: 1, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ fontSize: { md: "1.15rem" } }}>
                          {lastWorkspace.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: { md: "0.85rem" } }}>
                          Continue where you left off
                        </Typography>
                      </CardContent>
                    </RecentCard>
                  </Link>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* My Workspaces */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <SectionTitle sx={{ mb: 0 }}>
                <FolderIcon sx={{ color: "#6366f1", fontSize: 20 }} />
                My Workspaces
              </SectionTitle>
              <Button
                size="small"
                variant="text"
                disableRipple
                sx={{
                  color: theme.palette.text.secondary,
                  background: "transparent",
                  backgroundColor: "transparent",
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    maxHeight: "none",
                    background: "transparent",
                    backgroundColor: "transparent",
                    color: "#6366f1",
                    boxShadow: "none"
                  },
                  "&.MuiButton-root": {
                    background: "transparent",
                    backgroundColor: "transparent"
                  }
                }}
                endIcon={<ArrowForwardIcon fontSize="small" />}
              >
                View all
              </Button>
            </Box>

            <Grid container spacing={{ xs: 1, md: 3 }}>
              {loading ? (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <CircularProgress size={32} sx={{ color: "#6366f1" }} />
                  </Box>
                </Grid>
              ) : error ? (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ 
                    p: 4, 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    borderRadius: 2,
                    bgcolor: 'rgba(239, 68, 68, 0.05)',
                    textAlign: 'center'
                  }}>
                    <Typography color="error">{error}</Typography>
                    <Button 
                        size="small" 
                        onClick={() => window.location.reload()} 
                        sx={{ mt: 2, color: "#6366f1" }}
                    >
                        Retry
                    </Button>
                  </Box>
                </Grid>
              )
                : workspaces.length === 0 ? (
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      p: 4,
                      border: '1px dashed rgba(255,255,255,0.1)',
                      borderRadius: 4
                    }}>
                      <FolderIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
                      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>
                        No workspaces found. Use the "+" button in the sidebar to create one.
                      </Typography>
                    </Box>
                  </Grid>
                )
                : workspaces.map((ws) => {
                  const isShared = currentUser && ws.owner_id && ws.owner_id !== currentUser.id;
                  return (
                  <Grid size={{ xs: 6, sm: 6, md: 6 }} key={ws.id}>
                    <WorkspaceCard 
                        onClick={() => router.push(`/workspace?id=${ws.id}`)} 
                        sx={{ 
                            position: "relative",
                            border: isShared ? '1px dashed rgba(99, 102, 241, 0.5)' : undefined,
                            bgcolor: isShared ? 'rgba(99, 102, 241, 0.03)' : undefined
                        }}
                    >
                      {isShared && (
                        <Chip 
                            label="Shared" 
                            size="small" 
                            sx={{ 
                                position: 'absolute', 
                                top: 12, 
                                left: 12, 
                                height: 20, 
                                fontSize: '0.65rem',
                                bgcolor: 'rgba(99, 102, 241, 0.2)',
                                color: '#a5b4fc',
                                backdropFilter: 'blur(4px)'
                            }} 
                        />
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, ws)}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          color: theme.palette.text.secondary,
                          "&:hover": { color: theme.palette.text.primary, bgcolor: "rgba(255,255,255,0.1)" }
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      
                      {/* User Avatars instead of Workspace Icon */}
                      <AvatarGroup 
                        max={4}
                        sx={{ 
                            justifyContent: { xs: 'center', md: 'flex-start' },
                            mr: { md: 1 },
                            '& .MuiAvatar-root': {
                                width: 36, 
                                height: 36, 
                                fontSize: 13,
                                border: '2px solid #2c2d4a',
                                bgcolor: '#3a3b5a'
                            }
                        }}
                      >
                         {/* Owner */}
                         <Avatar
                            src={getAvatarUrl(ws.owner_avatar, ws.owner_name || ws.name)}
                            alt={ws.owner_name}
                            title={`Owner: ${ws.owner_name}`}
                            sx={{ bgcolor: '#6366f1' }}
                         />

                         {/* Members */}
                         {ws.members && ws.members.map((m: any) => (
                             <Avatar
                                key={m.id}
                                src={getAvatarUrl(m.avatar, m.name)}
                                alt={m.name}
                                title={m.name}
                                sx={{ bgcolor: '#4f46e5' }}
                             >
                                 {m.name ? m.name[0] : '?'}
                             </Avatar>
                         ))}
                      </AvatarGroup>

                      <Box sx={{ overflow: "hidden", textAlign: { xs: 'center', md: 'left' } }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ fontSize: { md: "1rem" } }}>
                          {ws.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: { md: "0.80rem" } }} noWrap>
                          {isShared ? `Owned by ${ws.owner_name || 'Verify'}` : (ws.type || "General Workspace")}
                        </Typography>
                      </Box>
                    </WorkspaceCard>
                  </Grid>
                )})}
            </Grid>
          </Box>

      {/* Menus and Dialogs */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        {selectedWorkspace?.owner_id === currentUser?.id ? [
            <MenuItem key="rename" onClick={handleRenameStart}>
            <ListItemIcon sx={{ color: theme.palette.text.secondary }}>
                <EditIcon fontSize="small" />
            </ListItemIcon>
            Rename
            </MenuItem>,
            <MenuItem key="delete" onClick={handleDeleteStart} sx={{ color: "#ef4444" }}>
            <ListItemIcon sx={{ color: "#ef4444" }}>
                <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            Delete
            </MenuItem>
        ] : (
            <MenuItem onClick={handleLeaveStart} sx={{ color: "#ef4444" }}>
            <ListItemIcon sx={{ color: "#ef4444" }}>
                <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Disconnect
            </MenuItem>
        )}
      </Menu>

      <Dialog
        open={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <DialogTitle>Rename Workspace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Workspace Name"
            type="text"
            fullWidth
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            sx={{
              input: { color: theme.palette.text.primary },
              label: { color: theme.palette.text.secondary },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRenameOpen(false)} sx={{ color: theme.palette.text.secondary }}>Cancel</Button>
          <Button onClick={handleRenameSubmit} sx={{ color: "#6366f1" }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <DialogTitle>Delete Workspace?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: theme.palette.text.secondary }}>
            Are you sure you want to delete this workspace? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteOpen(false)} sx={{ color: theme.palette.text.secondary }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} sx={{ color: "#ef4444" }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <DialogTitle>Leave Shared Workspace?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: theme.palette.text.secondary }}>
            Are you sure you want to disconnect from this shared workspace?<br/><br/>
            You will lose access to all shared tables within this workspace. You will need to be re-invited to access them again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLeaveOpen(false)} sx={{ color: theme.palette.text.secondary }}>Cancel</Button>
          <Button onClick={handleLeaveConfirm} color="error" variant="contained" sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#af3434" } }}>
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>

          {/* Templates Section - Desktop Only */}
          <Box sx={{ display: { xs: "none", lg: "block" }, mt: 5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <SectionTitle sx={{ mb: 0 }}>
                <DashboardIcon sx={{ color: "#6366f1", fontSize: 20 }} />
                Start with a Template (Top 3)
              </SectionTitle>
              <Button
                size="small"
                variant="text"
                disableRipple
                onClick={() => setIsGalleryOpen(true)}
                sx={{
                  color: theme.palette.text.secondary,
                  background: "transparent",
                  backgroundColor: "transparent",
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    maxHeight: "none",
                    background: "transparent",
                    backgroundColor: "transparent",
                    color: "#6366f1",
                    boxShadow: "none"
                  },
                  "&.MuiButton-root": {
                    background: "transparent",
                    backgroundColor: "transparent"
                  }
                }}
                endIcon={<ArrowForwardIcon fontSize="small" />}
              >
                Browse gallery
              </Button>
            </Box>

            <Grid container spacing={3}>
              {TEMPLATES.slice(0, 3).map((template) => (
                <Grid size={{ md: 6, lg: 4 }} key={template.title}>
                  <StyledCard
                    onClick={() => handleOpenTemplatePicker(template)}
                    sx={{
                      cursor: "pointer",
                      height: "100%",
                      p: 3, 
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: 2, 
                      border: "1px dashed rgba(255,255,255,0.1)",
                      "&:hover": { borderColor: "#6366f1", bgcolor: "rgba(99, 102, 241, 0.05)" },
                      opacity: isCreatingTemplate ? 0.5 : 1,
                      pointerEvents: isCreatingTemplate ? "none" : "auto",
                      position: "relative"
                    }}
                  >
                    {isCreatingTemplate === template.title && (
                        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", zIndex: 10, borderRadius: 2 }}>
                            <CircularProgress size={24} color="inherit" />
                        </Box>
                    )}
                    <Avatar
                      sx={{
                        bgcolor: `${template.color}20`,
                        color: template.color,
                        width: 64, 
                        height: 64,
                        fontSize: "1.75rem",
                        mb: 1
                      }}
                    >
                      {template.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: "1.1rem" }}>
                        {template.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: "block", mt: 0.5, fontSize: "0.85rem" }}>
                        Ready-to-use template
                      </Typography>
                    </Box>
                  </StyledCard>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>

        {/* Right Sidebar - Inbox */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ position: "sticky", top: 24, height: { xs: 'auto', lg: 'calc(100vh - 100px)' }, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <SectionTitle>
              <NotificationsnoneIcon sx={{ color: "#6366f1", fontSize: 20 }} />
              Inbox & Updates
            </SectionTitle>
            <StyledCard sx={{ flex: 1, display: "flex", flexDirection: "column", height: '100%', maxHeight: { xs: '400px', md: 'none' } }}>
              {/* Inbox Header */}
              <Box sx={{ p: { xs: 2, md: 2.5 }, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: "rgba(0,0,0,0.1)" }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ color: theme.palette.text.secondary, fontSize: { md: "0.95rem" } }}>
                  Recent Activity
                </Typography>
              </Box>

              {/* Updates List */}
              <Box sx={{ overflowY: "auto", flex: 1, "::-webkit-scrollbar": { width: 4 }, "::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 } }}>
                {emailUpdates.length === 0 && !loading && (
                  <Box sx={{ p: 4, textAlign: "center", color: theme.palette.text.secondary }}>
                    <Typography variant="body2">No recent updates</Typography>
                  </Box>
                )}
                {emailUpdates.map((update, idx) => (
                  <InboxItem key={idx} sx={{ p: { md: 2 } }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ width: { xs: 24, md: 28 }, height: { xs: 24, md: 28 }, fontSize: { xs: 10, md: 11 }, bgcolor: "#6366f1" }}>
                        {update.tableId ? update.tableId[0].toUpperCase() : 'T'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary, display: "block", mb: 0.5, fontSize: { xs: "0.75rem", md: "0.85rem" } }}>
                          {update.subject || "Task Update"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: "block", fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                          {update.timestamp ? new Date(Number(update.timestamp)).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </Typography>
                      </Box>
                      {update.badge && (
                        <Chip label={update.badge} size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#22c55e", color: theme.palette.text.primary, fontWeight: 700 }} />
                      )}
                      {update.status && (
                        <Chip
                          label={update.status.toUpperCase()}
                          size="small"
                          color={update.status === 'sent' ? 'success' : update.status === 'error' ? 'error' : 'warning'}
                          sx={{ height: 16, fontSize: "0.5rem", fontWeight: 700, ml: 0.5 }}
                        />
                      )}
                    </Box>

                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: "rgba(0,0,0,0.2)",
                        borderRadius: 2,
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        "& h2": { fontSize: "0.85rem", fontWeight: 700, mt: 0, mb: 0.5, color: "#e2e8f0" },
                        "& ul": { m: 0, pl: 2, fontSize: "0.75rem", color: theme.palette.text.secondary },
                        "& li": { mb: 0.25 },
                        "& b": { color: "#cbd5e1" } // lighter text for labels
                      }}
                    >
                      <div dangerouslySetInnerHTML={{ __html: update.html }} />
                      {update.error_message && (
                        <Typography variant="caption" sx={{ color: "#ef4444", display: "block", mt: 1, p: 0.5, bgcolor: "rgba(239, 68, 68, 0.1)", borderRadius: 1 }}>
                          Error: {update.error_message}
                        </Typography>
                      )}
                    </Box>
                  </InboxItem>
                ))}
              </Box>

              <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}`, textAlign: "center" }}>
                <Button
                  size="small"
                  variant="text"
                  disableRipple
                  sx={{
                    color: "#6366f1",
                    background: "transparent",
                    backgroundColor: "transparent",
                    textTransform: "none",
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: "transparent",
                      background: "transparent",
                      backgroundColor: "transparent",
                      textDecoration: "underline",
                      boxShadow: "none"
                    },
                    "&.MuiButton-root": {
                      background: "transparent",
                      backgroundColor: "transparent"
                    }
                  }}>
                  View all notifications
                </Button>
              </Box>
            </StyledCard>
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Template Gallery</Typography>
            <Typography variant="caption" color="text.secondary">Choose a template to start with</Typography>
          </Box>
          <Button onClick={() => setIsGalleryOpen(false)} color="inherit" size="small">Close</Button>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {TEMPLATES.map((template) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.title}>
                  <StyledCard
                    onClick={() => {
                        handleOpenTemplatePicker(template);
                        setIsGalleryOpen(false);
                    }}
                    sx={{
                      cursor: "pointer",
                      height: "100%",
                      p: 2, 
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: 1.5, 
                      border: "1px dashed rgba(255,255,255,0.1)",
                      transition: "all 0.2s",
                      "&:hover": { borderColor: "#6366f1", bgcolor: "rgba(99, 102, 241, 0.05)", transform: "translateY(-2px)" },
                      opacity: isCreatingTemplate === template.title ? 1 : (isCreatingTemplate ? 0.5 : 1),
                      pointerEvents: isCreatingTemplate ? "none" : "auto",
                      position: "relative"
                    }}
                  >
                    {isCreatingTemplate === template.title && (
                        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", zIndex: 10, borderRadius: 2 }}>
                            <CircularProgress size={24} color="inherit" />
                        </Box>
                    )}
                    <Avatar
                      sx={{
                        bgcolor: `${template.color}20`,
                        color: template.color,
                        width: 50, 
                        height: 50,
                        fontSize: "1.5rem",
                        mb: 0.5
                      }}
                    >
                      {template.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {template.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mt: 0.5, lineHeight: 1.2, display: "block" }}>
                        {template.columns.length} columns pre-configured
                      </Typography>
                    </Box>
                  </StyledCard>
                </Grid>
              ))}
            </Grid>
        </DialogContent>
      </Dialog>

      {/* Workspace Picker for Templates */}
      <Dialog
        open={isWorkspacePickerOpen}
        onClose={() => setIsWorkspacePickerOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {pendingTemplate && (
              <Avatar
                sx={{
                  bgcolor: `${pendingTemplate.color}20`,
                  color: pendingTemplate.color,
                  width: 44,
                  height: 44,
                  fontSize: '1.3rem'
                }}
              >
                {pendingTemplate.icon}
              </Avatar>
            )}
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem' }}>
                Create &ldquo;{pendingTemplate?.title}&rdquo;
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Choose a workspace for this board
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {workspaces.map((ws) => (
              <Card
                key={ws.id}
                onClick={() => setTemplateTargetWorkspace(ws.id)}
                sx={{
                  cursor: 'pointer',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  borderRadius: 3,
                  border: templateTargetWorkspace === ws.id
                    ? '2px solid #6366f1'
                    : `1px solid ${theme.palette.divider}`,
                  bgcolor: templateTargetWorkspace === ws.id
                    ? 'rgba(99, 102, 241, 0.08)'
                    : theme.palette.action.hover,
                  transition: 'all 0.15s',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#6366f1',
                    bgcolor: 'rgba(99, 102, 241, 0.05)'
                  }
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: templateTargetWorkspace === ws.id ? '#6366f1' : '#3a3b5a',
                    width: 40,
                    height: 40,
                    fontSize: 14,
                    fontWeight: 700,
                    transition: 'all 0.15s'
                  }}
                >
                  {ws.name?.[0] || 'W'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} noWrap>
                    {ws.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ws.tables?.length || 0} boards
                  </Typography>
                </Box>
                {templateTargetWorkspace === ws.id && (
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      bgcolor: '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700
                    }}
                  >
                    &#10003;
                  </Box>
                )}
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => setIsWorkspacePickerOpen(false)}
            sx={{ color: theme.palette.text.secondary, textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmTemplateCreate}
            disabled={!templateTargetWorkspace || isCreatingTemplate !== null}
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#4f46e5' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3
            }}
          >
            {isCreatingTemplate ? <CircularProgress size={18} color="inherit" /> : 'Create Board'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContainer>
  );
}
