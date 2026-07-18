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
  LinearProgress,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { authenticatedFetch, getApiUrl, getAppHref, getAvatarUrl, navigateToAppRoute } from "../../apiUrl";
import { WORKSPACE_TEMPLATES, type WorkspaceTemplate } from "../../../workspaceTemplates";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import NotificationsnoneIcon from "@mui/icons-material/NotificationsNone";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder"; // Placeholder for workspace icon
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

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
  display: "grid",
  gridTemplateColumns: "minmax(120px, 40%) minmax(0, 1fr)",
  alignItems: "stretch", // Stretch image and content
  overflow: "hidden",
  minWidth: 0,
  [theme.breakpoints.down("sm")]: {
    gridTemplateColumns: "minmax(110px, 34%) minmax(0, 1fr)",
  },
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


const TEMPLATES = WORKSPACE_TEMPLATES;

export default function HomeDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<WorkspaceTemplate | null>(null);
  const [isWorkspacePickerOpen, setIsWorkspacePickerOpen] = useState(false);
  const [templateWorkspaceName, setTemplateWorkspaceName] = useState("");

  const handleOpenTemplatePicker = (template: WorkspaceTemplate) => {
    setPendingTemplate(template);
    setTemplateWorkspaceName(`${template.name} Workspace`);
    setIsWorkspacePickerOpen(true);
  };

  const handleConfirmTemplateCreate = async () => {
    if (!pendingTemplate || !templateWorkspaceName.trim()) return;
    setIsWorkspacePickerOpen(false);

    try {
      setIsCreatingTemplate(pendingTemplate.name);
      const res = await authenticatedFetch(getApiUrl("workspaces"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateWorkspaceName.trim(),
          templateKey: pendingTemplate.key,
        }),
      });

      if (res.ok) {
        const newWorkspace = await res.json();
        setWorkspaces((current) => [...current, newWorkspace]);
        const firstBoardId = newWorkspace.boards?.[0]?.id;
        navigateToAppRoute(`/workspace?id=${newWorkspace.id}${firstBoardId ? `&tableId=${firstBoardId}` : ""}`, router);
      } else {
        console.error("Failed to create template workspace");
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
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingSteps, setOnboardingSteps] = useState<number[]>([]);

  // State for Rename/Delete
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isWorkspaceGalleryOpen, setIsWorkspaceGalleryOpen] = useState(false);
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
        try {
          const parsedUser = JSON.parse(userJson);
          setCurrentUser(parsedUser);
          const key = `smartManageOnboarding_${parsedUser.id || parsedUser.email || "user"}`;
          const saved = JSON.parse(localStorage.getItem(key) || "{}");
          setOnboardingSteps(Array.isArray(saved.steps) ? saved.steps : []);
          setOnboardingOpen(!saved.dismissed && !saved.completed);
        } catch(e){}
    }

    // Set greeting based on client time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const saveOnboarding = (steps: number[], dismissed = false) => {
    if (!currentUser) return;
    const key = `smartManageOnboarding_${currentUser.id || currentUser.email || "user"}`;
    localStorage.setItem(key, JSON.stringify({
      steps,
      dismissed,
      completed: steps.length === 8,
      updatedAt: new Date().toISOString(),
    }));
    setOnboardingSteps(steps);
    setOnboardingOpen(!dismissed && steps.length < 8);
  };

  const completeOnboardingStep = (step: number, action?: () => void) => {
    const steps = onboardingSteps.includes(step)
      ? onboardingSteps
      : [...onboardingSteps, step].sort((a, b) => a - b);
    saveOnboarding(steps);
    action?.();
  };

  const onboardingItems = [
    { label: "Choose your business type", action: () => setIsGalleryOpen(true) },
    { label: "Choose a workspace template", action: () => setIsGalleryOpen(true) },
    { label: "Preview the template", action: () => setIsGalleryOpen(true) },
    { label: "Name and create the workspace", action: () => setIsGalleryOpen(true) },
    { label: "Choose the modules you need", action: () => navigateToAppRoute("/modules", router) },
    { label: "Import existing data", action: () => workspaces[0] && navigateToAppRoute(`/workspace?id=${workspaces[0].id}`, router) },
    { label: "Invite your team", action: () => navigateToAppRoute("/settings?tab=team", router) },
    { label: "Customize your dashboard", action: () => navigateToAppRoute("/dashboard", router) },
  ];

  // Fetch Data
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const wsRes = await authenticatedFetch(getApiUrl("workspaces"));
        if (wsRes.status === 401 || wsRes.status === 403) {
            setWorkspaces([]);
            return;
        }
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

      {onboardingOpen && (
        <Card sx={{
          mb: 4,
          borderRadius: 4,
          border: "1px solid rgba(99,102,241,.35)",
          background: "linear-gradient(135deg, rgba(99,102,241,.14), rgba(139,92,246,.05))",
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 }, "&:last-child": { pb: { xs: 2, md: 3 } } }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Set up Smart Manage</Typography>
                <Typography variant="body2" color="text.secondary">
                  Follow these steps to prepare your first complete workspace. You can dismiss and restart this guide anytime.
                </Typography>
              </Box>
              <IconButton aria-label="Dismiss onboarding" onClick={() => saveOnboarding(onboardingSteps, true)} sx={{ alignSelf: "flex-start" }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <LinearProgress variant="determinate" value={(onboardingSteps.length / 8) * 100} sx={{ flex: 1, height: 8, borderRadius: 8 }} />
              <Typography variant="caption" fontWeight={700}>{onboardingSteps.length}/8</Typography>
            </Box>
            <Grid container spacing={1}>
              {onboardingItems.map((item, index) => {
                const step = index + 1;
                const done = onboardingSteps.includes(step) || (step === 4 && workspaces.length > 0);
                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
                    <Button
                      fullWidth
                      onClick={() => completeOnboardingStep(step, item.action)}
                      startIcon={<CheckCircleOutlineIcon color={done ? "success" : "inherit"} />}
                      sx={{ justifyContent: "flex-start", textTransform: "none", color: done ? "success.main" : "text.primary" }}
                    >
                      {item.label}
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

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
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', minWidth: 0 }}>
                <Link href={getAppHref('/dashboard')} style={{ textDecoration: 'none', width: '100%', display: 'flex' }}>
                  <RecentCard sx={{ width: '100%' }}>
                    <Box
                      sx={{
                        height: 'auto',
                        minHeight: { xs: 120, md: 140 },
                        width: '100%',
                        minWidth: 0,
                        bgcolor: "#eef2ff",
                        backgroundImage: "url('/dashboard-concept-illustration_114360-4351.avif')",
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
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
                    <CardContent sx={{ minWidth: 0, p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '0.95rem', md: "1.1rem" }, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                        Dashboard & Reporting
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: { md: "0.82rem" }, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                        Overview of all project metrics
                      </Typography>
                    </CardContent>
                  </RecentCard>
                </Link>
              </Grid>

              {/* Last Workspace Card - Takes 12 on mobile, 6 on desktop (half width) */}
              {lastWorkspace && (
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', minWidth: 0 }}>
                  <Link href={getAppHref(`/workspace?id=${lastWorkspace.id}`)} style={{ textDecoration: 'none', width: '100%', display: 'flex' }}>
                    <RecentCard sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          height: 'auto',
                          minHeight: { xs: 120, md: 140 },
                          width: '100%',
                          minWidth: 0,
                          bgcolor: "#eef2ff",
                          backgroundImage: "url('/kanban-illustration.png')",
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
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
                      <CardContent sx={{ minWidth: 0, p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '0.95rem', md: "1.1rem" }, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                          {lastWorkspace.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: { md: "0.82rem" }, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
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
                onClick={() => setIsWorkspaceGalleryOpen(true)}
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
                : workspaces.slice(0, 4).map((ws) => {
                  const isShared = currentUser && ws.owner_id && ws.owner_id !== currentUser.id;
                  return (
                  <Grid size={{ xs: 6, sm: 6, md: 6 }} key={ws.id}>
                    <WorkspaceCard 
                        onClick={() => navigateToAppRoute(`/workspace?id=${ws.id}`, router)} 
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
        open={isWorkspaceGalleryOpen}
        onClose={() => setIsWorkspaceGalleryOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4,
            maxHeight: "86vh",
          }
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Workspace Gallery</Typography>
            <Typography variant="caption" color="text.secondary">
              Browse and open all your workspaces · {workspaces.length} total
            </Typography>
          </Box>
          <Button onClick={() => setIsWorkspaceGalleryOpen(false)} color="inherit" size="small">Close</Button>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2}>
            {workspaces.map((ws) => {
              const isShared = currentUser && ws.owner_id && ws.owner_id !== currentUser.id;
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={ws.id}>
                  <StyledCard
                    onClick={() => {
                      setIsWorkspaceGalleryOpen(false);
                      navigateToAppRoute(`/workspace?id=${ws.id}`, router);
                    }}
                    sx={{
                      cursor: "pointer",
                      height: "100%",
                      minHeight: 170,
                      p: 2.5,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: 1.5,
                      position: "relative",
                      border: isShared ? "1px dashed rgba(99, 102, 241, 0.55)" : `1px solid ${theme.palette.divider}`,
                      transition: "transform .2s, border-color .2s, background-color .2s",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        borderColor: "#6366f1",
                        bgcolor: "rgba(99, 102, 241, 0.06)",
                      },
                    }}
                  >
                    <IconButton
                      size="small"
                      aria-label={`Workspace actions for ${ws.name}`}
                      onClick={(event) => handleMenuOpen(event, ws)}
                      sx={{ position: "absolute", top: 8, right: 8, color: "text.secondary" }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    {isShared && <Chip label="Shared" size="small" sx={{ position: "absolute", top: 10, left: 10, height: 20, fontSize: ".65rem" }} />}
                    <AvatarGroup
                      max={4}
                      sx={{
                        justifyContent: "center",
                        "& .MuiAvatar-root": { width: 38, height: 38, fontSize: 13, border: `2px solid ${theme.palette.background.paper}` },
                      }}
                    >
                      <Avatar src={getAvatarUrl(ws.owner_avatar, ws.owner_name || ws.name)} alt={ws.owner_name || ws.name} />
                      {(ws.members || []).map((member: any) => (
                        <Avatar key={member.id} src={getAvatarUrl(member.avatar, member.name)} alt={member.name}>
                          {member.name?.[0] || "?"}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    <Box sx={{ width: "100%", minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={800} noWrap>{ws.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", mt: .5 }}>
                        {isShared ? `Owned by ${ws.owner_name || "Unknown"}` : (ws.type || "General Workspace")}
                      </Typography>
                    </Box>
                  </StyledCard>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
      </Dialog>

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
                <Grid size={{ md: 6, lg: 4 }} key={template.key}>
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
                    {isCreatingTemplate === template.name && (
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
                        {template.name}
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
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.key}>
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
                      opacity: isCreatingTemplate === template.name ? 1 : (isCreatingTemplate ? 0.5 : 1),
                      pointerEvents: isCreatingTemplate ? "none" : "auto",
                      position: "relative"
                    }}
                  >
                    {isCreatingTemplate === template.name && (
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
                        {template.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mt: 0.5, lineHeight: 1.2, display: "block" }}>
                        {template.boards.length} {template.boards.length === 1 ? "board" : "boards"} pre-configured
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
                Create &ldquo;{pendingTemplate?.name}&rdquo;
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Create a complete workspace with its ready-to-use boards
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Workspace name"
              value={templateWorkspaceName}
              onChange={(event) => setTemplateWorkspaceName(event.target.value)}
              inputProps={{ maxLength: 120 }}
            />
            {pendingTemplate && (
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: theme.palette.action.hover }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {pendingTemplate.description}
                </Typography>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  {pendingTemplate.boards.length} {pendingTemplate.boards.length === 1 ? "BOARD" : "BOARDS"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {pendingTemplate.boards.map((board) => board.name).join(" · ")}
                </Typography>
              </Box>
            )}
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
            disabled={!templateWorkspaceName.trim() || isCreatingTemplate !== null}
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { bgcolor: '#4f46e5' },
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3
            }}
          >
            {isCreatingTemplate ? <CircularProgress size={18} color="inherit" /> : 'Create Workspace'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContainer>
  );
}
