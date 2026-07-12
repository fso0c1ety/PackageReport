"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch, getApiUrl, getAppHref, getAvatarUrl, navigateToAppRoute } from "./apiUrl";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupIcon from "@mui/icons-material/Group";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddIcon from "@mui/icons-material/Add";
import AddLinkIcon from "@mui/icons-material/AddLink";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import WorkspaceDropdown from "./(dashboard)/workspaces/WorkspaceDropdown";
import appLogo from "./icon.png";
import { useNotification } from "./NotificationContext";
import { WORKSPACE_TEMPLATES, type WorkspaceTemplateKey } from "../workspaceTemplates";

// --- Components ---

interface CurrentUser {
  name?: string;
  avatar?: string;
  job_title?: string;
}

interface BillingStatus {
  plan: "trial" | "basic" | "standard" | "pro" | "enterprise";
  status: "trialing" | "active" | "past_due" | "expired" | "canceled";
  trial_ends_at?: string | null;
  writable?: boolean;
  unlimited?: boolean;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: number;
}

function SidebarItem({ icon, label, href, isActive, onClick, badge = 0 }: SidebarItemProps) {
  const theme = useTheme();
  const resolvedHref = getAppHref(href);

  return (
    <Link href={resolvedHref} style={{ textDecoration: "none", display: "block", width: "100%" }} onClick={onClick}>
      <ListItemButton
        sx={{
          py: 1.1,
          px: 1.35,
          borderRadius: 3.5,
          width: "100%",
          bgcolor: isActive
            ? theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(15,23,42,0.04)"
            : "transparent",
          color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
          border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.18) : "transparent"}`,
          transition: "all 0.18s ease-in-out",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 10,
            bottom: 10,
            width: 3,
            borderRadius: 999,
            bgcolor: isActive ? theme.palette.primary.main : "transparent",
          },
          "&:hover": {
            bgcolor: isActive
              ? alpha(theme.palette.primary.main, 0.12)
              : alpha(theme.palette.text.primary, 0.045),
            color: theme.palette.text.primary,
            transform: "translateX(3px)",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 36,
            color: isActive ? theme.palette.primary.main : "inherit",
            "& > *": {
              p: 0,
              borderRadius: 0,
              bgcolor: "transparent",
            },
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: "0.9rem",
            fontWeight: isActive ? 700 : 600,
            letterSpacing: "-0.01em",
          }}
        />
        {badge > 0 ? <Box sx={{ minWidth: 22, height: 22, px: .65, borderRadius: 99, bgcolor: "#ef4444", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900 }}>{badge > 99 ? "99+" : badge}</Box> : <CircleRoundedIcon sx={{ fontSize: 9, color: isActive ? theme.palette.primary.main : "transparent" }} />}
      </ListItemButton>
    </Link>
  );
}

function InlineHeader({
  label,
  action,
}: {
  label: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        px: 0.2,
        mb: 0.85,
        mt: 1.2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
      }}
    >
      <Typography
        sx={{
          color: theme.palette.text.secondary,
          fontWeight: 800,
          fontSize: "0.67rem",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
        }}
      >
        {label}
      </Typography>
      {action}
    </Box>
  );
}

const drawerWidth = 296;

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const { showNotification } = useNotification();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [calendarReminderCount, setCalendarReminderCount] = useState(0);
  const [maintenanceReminderCount, setMaintenanceReminderCount] = useState(0);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);


  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<WorkspaceTemplateKey>("blank");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  useEffect(() => {
    let active = true;
    const checkCalendarReminders = async () => {
      try {
        const response = await authenticatedFetch(getApiUrl("calendar-events/reminders"), { suppressNativeErrorAlert: true });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setCalendarReminderCount(Number(data.count) || 0);
        for (const event of data.triggered || []) {
          const message = `${event.event_type || "Event"}: ${event.title}`;
          showNotification(message, "info");
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Calendar reminder", { body: message, icon: "/icon.png", tag: `calendar-${event.id}` });
          }
        }
      } catch {
        // Reminder polling should never interrupt navigation.
      }
    };
    void checkCalendarReminders();
    const interval = window.setInterval(checkCalendarReminders, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [showNotification]);

  useEffect(() => {
    let active = true;
    const checkMaintenance = async () => {
      try {
        const response = await authenticatedFetch(getApiUrl("maintenance/reminders"), { suppressNativeErrorAlert: true });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setMaintenanceEnabled(Boolean(data.enabled));
        setMaintenanceReminderCount(Number(data.count) || 0);
      } catch {}
    };
    void checkMaintenance();
    const interval = window.setInterval(checkMaintenance, 5 * 60 * 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCodeValue, setInviteCodeValue] = useState("");


  const currentWorkspaceId = searchParams.get("id");
  // Fetch workspaces and user
  useEffect(() => {
    // Load local user immediately for fast render
    let storedUserStr: string | null = null;
    try {
      storedUserStr = localStorage.getItem("user");
      if (storedUserStr) {
        setCurrentUser(JSON.parse(storedUserStr));
      }
    } catch (error) {
      console.error("Failed to parse user from local storage", error);
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
            } catch {}
          }
        }
      })
      .catch(() => {}); // Silently fail — localStorage data is a good fallback

    authenticatedFetch(getApiUrl("billing/status"))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data && setBillingStatus(data))
      .catch(() => {});
  }, []);

  const billingLabel = React.useMemo(() => {
    if (!billingStatus) return "Loading plan...";
    if (billingStatus.unlimited) return "Internal · Unlimited";
    if (billingStatus.status === "trialing") {
      const remainingMs = billingStatus.trial_ends_at
        ? new Date(billingStatus.trial_ends_at).getTime() - Date.now()
        : 0;
      const daysLeft = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
      return `Free Trial · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
    }
    if (!billingStatus.writable || billingStatus.status === "expired") return "Trial expired · View only";
    return `${billingStatus.plan.charAt(0).toUpperCase()}${billingStatus.plan.slice(1)} Plan`;
  }, [billingStatus]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || isCreatingWorkspace) return;
    setIsCreatingWorkspace(true);
    try {
      const wsRes = await authenticatedFetch(getApiUrl("workspaces"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim(), templateKey: selectedTemplateKey }),
      });

      if (!wsRes.ok) throw new Error("Failed to create workspace");
      const ws = await wsRes.json();

      setDialogOpen(false);
      setNewWorkspaceName("");
      setSelectedTemplateKey("blank");
      window.dispatchEvent(new CustomEvent("workspaceUpdated"));
      if (onClose) onClose();
      navigateToAppRoute(`/workspace?id=${ws.id}`, router);
      showNotification("Workspace created successfully!", "success");
    } catch {
      showNotification("Failed to create workspace. Please try again.", "error");
    } finally {
      setIsCreatingWorkspace(false);
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
      await res.json();

      setRenameDialogOpen(false);
      setEditingWorkspace(null);
      // Trigger a refresh of the dropdown or reload if needed
      setEditingWorkspace(null);
      // Trigger a refresh of the dropdown or reload if needed
      window.dispatchEvent(new CustomEvent('workspaceUpdated'));
      showNotification("Workspace renamed successfully!", "success");
    } catch {
      showNotification("Failed to rename workspace. Please try again.", "error");
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
      navigateToAppRoute(`/workspace?id=${data.workspaceId}`, router);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error joining board. Please check the code.";
      showNotification(message, "error");
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.mode === "dark" ? "#0f1118" : "#f5f7fb",
        color: theme.palette.text.primary,
        paddingTop: { xs: "env(safe-area-inset-top)", md: 0 },
      }}
    >
      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ p: { xs: 2.1, md: 1.35 }, pb: { xs: 1.4, md: 0.9 } }}>
          <Box
            sx={{
              p: { xs: 1.9, md: 1.25 },
              borderRadius: 5,
              border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.08)}`,
              bgcolor: theme.palette.mode === "dark" ? "#151925" : "#ffffff",
              boxShadow: theme.palette.mode === "dark" ? "0 24px 60px rgba(0,0,0,0.28)" : "0 20px 50px rgba(15,23,42,0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.35, md: 1.05 } }}>
              <Box
                sx={{
                  width: { xs: 48, md: 42 },
                  height: { xs: 48, md: 42 },
                  position: "relative",
                  borderRadius: { xs: "16px", md: "14px" },
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: theme.palette.mode === "dark" ? "#0d1320" : "#eef2ff",
                  flexShrink: 0,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                }}
              >
                <Image src={appLogo} alt="App Logo" fill style={{ objectFit: "contain" }} priority />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.2rem", md: "1.06rem" }, lineHeight: 1.05, letterSpacing: "-0.04em" }}>
                  Smart Manage
                </Typography>
                <Typography
                  sx={{
                    mt: { xs: 0.25, md: 0.1 },
                    color: theme.palette.text.secondary,
                    fontWeight: 800,
                    fontSize: { xs: "0.68rem", md: "0.62rem" },
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                  }}
                >
                  Command center
                </Typography>
              </Box>
              <Avatar
                sx={{
                  width: { xs: 30, md: 24 },
                  height: { xs: 30, md: 24 },
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                }}
              >
                <BoltRoundedIcon sx={{ fontSize: { xs: 16, md: 13 } }} />
              </Avatar>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 2.1, pb: 1.4 }}>
          <InlineHeader label="Navigation" />
          <Box sx={{ display: "grid", gap: 0.75 }}>
            <SidebarItem
              icon={<HomeIcon fontSize="small" />}
              label="Home"
              href="/home"
              isActive={pathname === "/home" || pathname === "/"}
              onClick={onClose}
            />
            <SidebarItem
              icon={<CalendarMonthRoundedIcon fontSize="small" />}
              label="Calendar & Deadlines"
              href="/calendar"
              isActive={pathname === "/calendar"}
              badge={calendarReminderCount}
              onClick={() => {
                setCalendarReminderCount(0);
                void authenticatedFetch(getApiUrl("calendar-events"), { method: "PATCH", suppressNativeErrorAlert: true }).catch(() => undefined);
                onClose?.();
              }}
            />
            {maintenanceEnabled && (
              <SidebarItem icon={<BuildRoundedIcon fontSize="small" />} label="Maintenance" href="/maintenance" isActive={pathname === "/maintenance"} badge={maintenanceReminderCount} onClick={onClose} />
            )}
            <SidebarItem
              icon={<GroupIcon fontSize="small" />}
              label="Team"
              href="/settings/?tab=team"
              isActive={pathname === "/settings" && searchParams.get("tab") === "team"}
              onClick={onClose}
            />
            <SidebarItem
              icon={<AutoAwesomeIcon fontSize="small" />}
              label="Nexus Brain"
              href="/nexusbrain-chat"
              isActive={pathname === "/nexusbrain-chat"}
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

          <InlineHeader label="Workspace" />
          <Box
            sx={{
              p: 0.55,
              borderRadius: 4,
              bgcolor: theme.palette.mode === "dark" ? "#0f131d" : "#f8fafc",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <WorkspaceDropdown currentId={currentWorkspaceId || undefined} />
          </Box>

          <Box sx={{ mt: 1.15 }}>
            <Button
              fullWidth
              variant="text"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                justifyContent: "flex-start",
                color: theme.palette.text.primary,
                borderRadius: 3.5,
                fontWeight: 800,
                py: 1.1,
                px: 1.2,
                bgcolor: theme.palette.mode === "dark" ? "#0f131d" : "#f8fafc",
                border: `1px solid ${theme.palette.divider}`,
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
              }}
            >
              New Workspace
            </Button>
          </Box>

          <Box sx={{ mt: 1.15 }}>
            <Button
              fullWidth
              variant="text"
              startIcon={<AddLinkIcon />}
              onClick={() => setJoinDialogOpen(true)}
              sx={{
                justifyContent: "flex-start",
                color: theme.palette.text.primary,
                borderRadius: 3.5,
                fontWeight: 800,
                py: 1.1,
                px: 1.2,
                bgcolor: theme.palette.mode === "dark" ? "#0f131d" : "#f8fafc",
                border: `1px solid ${theme.palette.divider}`,
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
              }}
            >
              Join code
            </Button>
          </Box>

        </Box>

        <Box sx={{ px: 2.1, pb: 2.1 }}>
          <Divider sx={{ borderColor: theme.palette.divider, mb: 1.2 }} />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.4,
              p: 1.25,
              borderRadius: 4,
              bgcolor: theme.palette.mode === "dark" ? "#141925" : "#ffffff",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Avatar
              src={getAvatarUrl(currentUser?.avatar, currentUser?.name)}
              alt={currentUser?.name || "User"}
              sx={{
                width: 42,
                height: 42,
                bgcolor: theme.palette.primary.main,
                fontSize: "0.95rem",
                fontWeight: 700,
              }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
                {currentUser?.name || "Loading..."}
              </Typography>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }} noWrap>
                {billingLabel}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => {
                navigateToAppRoute("/settings?tab=profile", router);
                if (onClose) onClose();
              }}
              sx={{
                color: theme.palette.text.secondary,
                bgcolor: theme.palette.mode === "dark" ? "#0f131d" : "#f8fafc",
                border: `1px solid ${theme.palette.divider}`,
                "&:hover": { color: theme.palette.text.primary, bgcolor: alpha(theme.palette.text.primary, 0.05) },
              }}
            >
              <ArrowOutwardIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Create Workspace Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 4,
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
          Create a workspace
        </DialogTitle>
        <DialogContent sx={{ pb: 3, pt: 1 }}>
          <Typography sx={{ color: "text.secondary", mb: 2.25, fontSize: 14 }}>
            Choose a ready-made setup or start with a blank workspace. You can customize every board later.
          </Typography>
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
            sx={{ mb: 2.5 }}
          />
          <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1.25, letterSpacing: ".02em" }}>
            SELECT A TEMPLATE
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.25 }}>
            {WORKSPACE_TEMPLATES.map((template) => {
              const selected = selectedTemplateKey === template.key;
              return (
                <Button
                  key={template.key}
                  onClick={() => setSelectedTemplateKey(template.key)}
                  aria-pressed={selected}
                  sx={{
                    p: 1.5,
                    minHeight: 92,
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    textAlign: "left",
                    textTransform: "none",
                    borderRadius: 3,
                    color: "text.primary",
                    border: `1px solid ${selected ? template.color : alpha(theme.palette.text.primary, 0.1)}`,
                    bgcolor: selected ? alpha(template.color, 0.13) : alpha(theme.palette.background.default, 0.42),
                    boxShadow: selected ? `0 0 0 1px ${alpha(template.color, 0.3)}` : "none",
                    transition: "transform .18s ease, border-color .18s ease, background-color .18s ease",
                    "&:hover": { bgcolor: alpha(template.color, 0.1), borderColor: alpha(template.color, 0.72), transform: "translateY(-2px)" },
                  }}
                >
                  <Box sx={{ display: "flex", gap: 1.25, width: "100%" }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 2.2, bgcolor: alpha(template.color, 0.16), display: "grid", placeItems: "center", fontSize: 21, flexShrink: 0 }}>
                      {template.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 14, lineHeight: 1.25 }}>{template.name}</Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: 12, mt: .55, lineHeight: 1.35 }}>{template.description}</Typography>
                    </Box>
                  </Box>
                </Button>
              );
            })}
          </Box>
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
            disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
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
            {isCreatingWorkspace ? "Creating..." : "Create workspace"}
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
          disableRestoreFocus: true,
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
