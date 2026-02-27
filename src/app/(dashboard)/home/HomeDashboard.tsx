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
  IconButton,
  Button,
  Chip,
  Skeleton,
  Divider,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import NotificationsnoneIcon from "@mui/icons-material/NotificationsNone";
import AddIcon from "@mui/icons-material/Add";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder"; // Placeholder for workspace icon

// --- Styled Components ---

const DashboardContainer = styled(Box)(({ theme }) => ({
  minHeight: "100%",
  backgroundColor: "#23243a", // Matches app background
  color: "#fff",
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
  color: "#fff",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  [theme.breakpoints.up("md")]: {
    fontSize: "1.25rem", // Larger title on desktop
    marginBottom: theme.spacing(3),
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: "#2c2d4a",
  color: "#fff",
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

export default function HomeDashboard() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [emailUpdates, setEmailUpdates] = useState<any[]>([]);
  // Start with null to prevent hydration mismatch
  const [lastWorkspace, setLastWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Good morning");

  // Load client-only data once mounted
  useEffect(() => {
    setLastWorkspace(getLastWorkspace());

    // Set greeting based on client time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wsRes, updatesRes] = await Promise.all([
          authenticatedFetch(getApiUrl("workspaces")),
          authenticatedFetch(getApiUrl("email-updates")),
        ]);
        const wsData = await wsRes.json();
        const updatesData = await updatesRes.json();

        setWorkspaces(Array.isArray(wsData) ? wsData : []);
        setEmailUpdates(Array.isArray(updatesData) ? updatesData.reverse() : []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Poll for updates (optional)
    const interval = setInterval(fetchData, 30000);
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
            {greeting}, Valon
          </Typography>
          <Typography variant="body1" sx={{ color: "#94a3b8", fontSize: { md: "1.1rem" } }}>
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
                          color: "#fff",
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
                      <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: { md: "0.85rem" } }}>
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
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.7rem",
                          }}
                        />
                      </Box>
                      <CardContent sx={{ flex: 1, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ fontSize: { md: "1.15rem" } }}>
                          {lastWorkspace.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: { md: "0.85rem" } }}>
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
                  color: "#94a3b8",
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
              {loading
                ? [1, 2, 3].map((n) => (
                  <Grid size={{ xs: 6, sm: 6, md: 6 }} key={n}>
                    <Skeleton variant="rectangular" height={100} sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2 }} />
                  </Grid>
                ))
                : workspaces.map((ws) => (
                  <Grid size={{ xs: 6, sm: 6, md: 6 }} key={ws.id}>
                    <WorkspaceCard onClick={() => router.push(`/workspace?id=${ws.id}`)}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          bgcolor: "rgba(99, 102, 241, 0.15)",
                          color: "#818cf8",
                          width: { xs: 48, md: 52 }, // Reduced from 56
                          height: { xs: 48, md: 52 },
                          fontWeight: 700,
                          fontSize: { md: "1.35rem" },
                        }}
                      >
                        {ws.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ overflow: "hidden" }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ fontSize: { md: "1rem" } }}>
                          {ws.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: { md: "0.80rem" } }} noWrap>
                          {ws.type || "General Workspace"}
                        </Typography>
                      </Box>
                    </WorkspaceCard>
                  </Grid>
                ))}
            </Grid>
          </Box>

          {/* Templates Section - Desktop Only */}
          <Box sx={{ display: { xs: "none", lg: "block" }, mt: 5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <SectionTitle sx={{ mb: 0 }}>
                <DashboardIcon sx={{ color: "#6366f1", fontSize: 20 }} />
                Start with a Template
              </SectionTitle>
              <Button
                size="small"
                variant="text"
                disableRipple
                sx={{
                  color: "#94a3b8",
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
              {[
                { title: "Project Tracker", color: "#e11d48", icon: "📊" },
                { title: "CRM & Sales", color: "#2563eb", icon: "💼" },
                { title: "Content Calendar", color: "#d97706", icon: "📅" },
              ].map((template) => (
                <Grid size={{ lg: 4 }} key={template.title}>
                  <StyledCard
                    sx={{
                      cursor: "pointer",
                      height: "100%",
                      p: 3, // Reduced padding
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: 2, // Reduced gap
                      border: "1px dashed rgba(255,255,255,0.1)",
                      "&:hover": { borderColor: "#6366f1", bgcolor: "rgba(99, 102, 241, 0.05)" }
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: `${template.color}20`,
                        color: template.color,
                        width: 64, // Reduced from 72
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
                      <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mt: 0.5, fontSize: "0.85rem" }}>
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
              <Box sx={{ p: { xs: 2, md: 2.5 }, borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "rgba(0,0,0,0.1)" }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ color: "#94a3b8", fontSize: { md: "0.95rem" } }}>
                  Recent Activity
                </Typography>
              </Box>

              {/* Updates List */}
              <Box sx={{ overflowY: "auto", flex: 1, "::-webkit-scrollbar": { width: 4 }, "::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.1)", borderRadius: 2 } }}>
                {emailUpdates.length === 0 && !loading && (
                  <Box sx={{ p: 4, textAlign: "center", color: "#94a3b8" }}>
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
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "#fff", display: "block", mb: 0.5, fontSize: { xs: "0.75rem", md: "0.85rem" } }}>
                          {update.subject || "Task Update"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                          {update.timestamp ? new Date(update.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </Typography>
                      </Box>
                      {update.badge && (
                        <Chip label={update.badge} size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#22c55e", color: "#fff", fontWeight: 700 }} />
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
                        "& ul": { m: 0, pl: 2, fontSize: "0.75rem", color: "#94a3b8" },
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

              <Box sx={{ p: 1.5, borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
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
    </DashboardContainer>
  );
}
