"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  useTheme,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Tab,
  Tabs,
  Paper,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  Tooltip,
  Stack,
  Autocomplete,
  Chip,
  FormControlLabel,
  Checkbox
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SecurityIcon from "@mui/icons-material/Security";
import PaletteIcon from "@mui/icons-material/Palette";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import WorkIcon from "@mui/icons-material/Work";
import BusinessIcon from "@mui/icons-material/Business";
import CallIcon from "@mui/icons-material/Call";
import GroupIcon from "@mui/icons-material/Group";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LanguageIcon from "@mui/icons-material/Language";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DevicesIcon from "@mui/icons-material/Devices";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import InsightsIcon from "@mui/icons-material/Insights";
import BoltIcon from "@mui/icons-material/Bolt";

import { getApiUrl, authenticatedFetch, getAvatarUrl } from "../../apiUrl";
import { useThemeContext } from "../../ThemeContext";
import { useNotification } from "../../NotificationContext";
import { useSearchParams, useRouter } from "next/navigation";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mode, toggleTheme } = useThemeContext();
  
  const tabMap: Record<string, number> = {
    profile: 0,
    appearance: 1,
    notifications: 2,
    security: 3,
    team: 4
  };

  const initialTab = searchParams.get("tab");
  const [tabValue, setTabValue] = useState(tabMap[initialTab || ""] || 0);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tabMap[tab] !== undefined) {
      setTabValue(tabMap[tab]);
    }
  }, [searchParams]);

  // Profile State
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Notifications State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [mentionNotifications, setMentionNotifications] = useState(true);
  const [digestNotifications, setDigestNotifications] = useState(false);
  const [taskReminderNotifications, setTaskReminderNotifications] = useState(true);

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionAlertsEnabled, setSessionAlertsEnabled] = useState(true);

  // Appearance State
  const [compactMode, setCompactMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showAvatarsInDenseViews, setShowAvatarsInDenseViews] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [preferredTimezone, setPreferredTimezone] = useState("Europe/Budapest");

  // Teammates State
  const [teammates, setTeammates] = useState<any[]>([]);
  const [loadingTeammates, setLoadingTeammates] = useState(false);
  const [lastWorkspaceId, setLastWorkspaceId] = useState<string | null>(null);
  
  // Invite Dialog State
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWorkspaces, setInviteWorkspaces] = useState<any[]>([]);
  const [selectedInviteWs, setSelectedInviteWs] = useState<string>("");
  const [inviteTables, setInviteTables] = useState<any[]>([]);
  const [selectedInviteTable, setSelectedInviteTable] = useState<string>("");
  const [invitePermission, setInvitePermission] = useState<'edit' | 'read' | 'admin'>('edit');
  const [currentTableInviteCode, setCurrentTableInviteCode] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [peopleSuggestions, setPeopleSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedTeammateForAccess, setSelectedTeammateForAccess] = useState<any | null>(null);
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const { showNotification } = useNotification();

  useEffect(() => {
    if (user?.id) {
        const stored = localStorage.getItem(`lastWorkspace_${user.id}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.id) setLastWorkspaceId(parsed.id);
            } catch (e) {}
        }
    }
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
        try {
            const res = await authenticatedFetch(getApiUrl('users/profile'));
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setEditName(data.name || "");
                setEditEmail(data.email || "");
                setEditAvatar(data.avatar || "");
                setEditJobTitle(data.job_title || "");
                setEditCompany(data.company || "");
                setEditPhone(data.phone || "");
                
                // Keep local storage in sync
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    localStorage.setItem("user", JSON.stringify({ ...parsed, ...data }));
                }
            }
        } catch (e) {
            console.error("Failed to fetch profile", e);
        }
    };
    
    fetchProfile();
  }, []);

  useEffect(() => {
    if (tabValue === 4) {
      const fetchTeammates = async () => {
        setLoadingTeammates(true);
        try {
          const res = await authenticatedFetch(getApiUrl('teammates'));
          if (res.ok) {
            const data = await res.json();
            setTeammates(data);
          }
        } catch (e) {
          console.error("Failed to fetch teammates", e);
        } finally {
          setLoadingTeammates(false);
        }
      };
      fetchTeammates();
    }
  }, [tabValue]);

  const fetchWorkspaces = async () => {
    try {
      const res = await authenticatedFetch(getApiUrl('workspaces'));
      if (res.ok) {
        const data = await res.json();
        const ownedWorkspaces = data.filter((ws: any) => ws.owner_id === user?.id);
        setInviteWorkspaces(ownedWorkspaces);
        if (ownedWorkspaces.length > 0) {
            setSelectedInviteWs(ownedWorkspaces[0].id);
            fetchTablesForInvite(ownedWorkspaces[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch workspaces", e);
    }
  };

  const fetchTablesForInvite = async (wsId: string) => {
    try {
      const res = await authenticatedFetch(getApiUrl(`workspaces/${wsId}/tables`));
      if (res.ok) {
        const data = await res.json();
        setInviteTables(data);
        if (data.length > 0) setSelectedInviteTable(data[0].id);
        else setSelectedInviteTable("");
      }
    } catch (e) {
      console.error("Failed to fetch tables", e);
    }
  };

  useEffect(() => {
    if (selectedInviteTable) {
        const fetchInviteCode = async () => {
            try {
                const res = await authenticatedFetch(getApiUrl(`tables/${selectedInviteTable}`));
                if (res.ok) {
                    const data = await res.json();
                    setCurrentTableInviteCode(data.invite_code || null);
                }
            } catch (e) {
                console.error("Failed to fetch invite code", e);
            }
        };
        fetchInviteCode();
    } else {
        setCurrentTableInviteCode(null);
    }
  }, [selectedInviteTable]);

  const fetchPeopleSuggestions = async (query: string) => {
    if (!query.trim()) {
      setPeopleSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const res = await authenticatedFetch(getApiUrl(`people?q=${encodeURIComponent(query)}`));
      if (res.ok) {
        const data = await res.json();
        setPeopleSuggestions(data);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleRemoveTeammate = async (teammateId: string) => {
    if (!confirm("Are you sure you want to remove this teammate? They will lose access to all boards you own.")) return;
    
    try {
        const res = await authenticatedFetch(getApiUrl(`teammates/${teammateId}`), {
            method: 'DELETE'
        });
        
        if (res.ok) {
            showNotification("Teammate removed successfully", "success");
            // Refresh list
            const teamRes = await authenticatedFetch(getApiUrl('teammates'));
            if (teamRes.ok) setTeammates(await teamRes.json());
        } else {
            showNotification("Failed to remove teammate", "error");
        }
    } catch (e) {
        console.error("Remove error", e);
        showNotification("Error removing teammate", "error");
    }
  };

  const handleUpdateGranularPermission = async (teammateId: string, tableId: string, newPermission: string) => {
    try {
        const res = await authenticatedFetch(getApiUrl(`tables/${tableId}/teammates/${teammateId}/permission`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permission: newPermission })
        });
        
        if (res.ok) {
            showNotification(`Updated access level to ${newPermission}`, "success");
            // Refresh local state to reflect change in the dialog
            if (selectedTeammateForAccess) {
              const updatedAccess = selectedTeammateForAccess.access.map((a: any) => 
                a.tableId === tableId ? { ...a, permission: newPermission } : a
              );
              setSelectedTeammateForAccess({ ...selectedTeammateForAccess, access: updatedAccess });
            }
            // Refresh main list
            const teamRes = await authenticatedFetch(getApiUrl('teammates'));
            if (teamRes.ok) setTeammates(await teamRes.json());
        } else {
            showNotification("Failed to update permission", "error");
        }
    } catch (e) {
        console.error("Update granular permission error", e);
        showNotification("Error updating access", "error");
    }
  };

  const handleInviteTeammate = async () => {
    if (!selectedUser || !selectedInviteTable) {
        showNotification("Please select a teammate and a board", "error");
        return;
    }
    
    setIsInviting(true);
    try {
        const res = await authenticatedFetch(getApiUrl(`tables/${selectedInviteTable}/share`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedUser.id, permission: invitePermission })
        });
        
        if (res.ok) {
            showNotification(`Successfully invited ${selectedUser.name} to the board!`, "success");
            setInviteDialogOpen(false);
            setInviteEmail("");
            setSelectedUser(null);
            // Refresh teammates
            const teamRes = await authenticatedFetch(getApiUrl('teammates'));
            if (teamRes.ok) setTeammates(await teamRes.json());
        } else {
            const err = await res.json();
            showNotification(err.error || "Failed to invite teammate", "error");
        }
    } catch (e) {
        console.error("Invite error", e);
        showNotification("Error inviting teammate", "error");
    } finally {
        setIsInviting(false);
    }
  };

  const handleCreateNewUser = () => {
    // If no user exists, create a default one
    const newUser = {
      name: "New User",
      email: "user@example.com",
      avatar: ""
    };
    localStorage.setItem("user", JSON.stringify(newUser));
    setUser(newUser);
    setEditName(newUser.name);
    setEditEmail(newUser.email);
    setEditAvatar(newUser.avatar);
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setProfileError("Name is required");
      return;
    }

    try {
      const res = await authenticatedFetch(getApiUrl('users/profile'), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: editName, 
          avatar: editAvatar,
          job_title: editJobTitle,
          company: editCompany,
          phone: editPhone
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile on server");
      
      const updatedUser = await res.json();
      
      // Update local state and localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setProfileSaved(true);
      setProfileError("");
      // Notify other components to refresh user data (e.g., TableBoard)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profile-updated'));
      }
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e: any) {
      console.error(e);
      setProfileError(e.message || "Failed to save profile");
    }
  };

   const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const tabName = Object.keys(tabMap).find(key => tabMap[key] === newValue);
    if (tabName) {
      router.push(`/settings?tab=${tabName}`, { scroll: false });
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const res = await authenticatedFetch(getApiUrl('upload'), {
          method: 'POST',
          body: formData,
        });
        
        if (res.ok) {
          const data = await res.json();
          // data.url is a relative path like /uploads/filename.jpg
          setEditAvatar(data.url);
          setProfileError("");

          const saveRes = await authenticatedFetch(getApiUrl('users/profile'), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: editName,
              avatar: data.url,
              job_title: editJobTitle,
              company: editCompany,
              phone: editPhone
            }),
          });

          if (!saveRes.ok) {
            throw new Error("Failed to save uploaded image to profile");
          }

          const updatedUser = await saveRes.json();
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
          setEditAvatar(updatedUser.avatar || data.url);
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 3000);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('profile-updated'));
          }
        } else {
          setProfileError("Failed to upload image");
        }
      } catch (err) {
        console.error("Upload failed", err);
        setProfileError(err instanceof Error ? err.message : "Error uploading image");
      }
    }
  };

  const handleChangePassword = () => {
      if (newPassword !== confirmPassword) {
          setPasswordError("Passwords do not match");
          return;
      }
      if (newPassword.length < 6) {
          setPasswordError("Password must be at least 6 characters");
          return;
      }
      setPasswordError("");
      setPasswordSuccess("Password updated successfully! (Simulation)");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 3000);
  };

  const settingsPanelSx = {
    p: { xs: 2, md: 2.5 },
    borderRadius: 4,
    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
    bgcolor: theme.palette.background.paper,
    backgroundImage: theme.palette.mode === "dark"
      ? "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.00) 100%)"
      : "linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(99,102,241,0.00) 100%)",
    boxShadow: theme.palette.mode === "dark" ? "0 18px 40px rgba(0,0,0,0.22)" : "0 14px 30px rgba(15,23,42,0.07)"
  } as const;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
        Account Settings
      </Typography>

      <Paper sx={{ mb: 4, overflow: 'hidden', borderRadius: 2 }}>
        <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="Profile" />
          <Tab icon={<PaletteIcon />} iconPosition="start" label="Appearance" />
          <Tab icon={<NotificationsIcon />} iconPosition="start" label="Notifications" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
          <Tab icon={<GroupIcon />} iconPosition="start" label="Team" />
        </Tabs>

        {/* PROFILE TAB */}
        <TabPanel value={tabValue} index={0}>
            <Stack spacing={2.5}>
              <Box
                sx={{
                  ...settingsPanelSx,
                  p: { xs: 2.25, md: 3 },
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "auto 1fr auto" },
                  gap: 3,
                  alignItems: "center"
                }}
              >
                <Box sx={{ position: 'relative', display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <Avatar
                    src={getAvatarUrl(isEditing ? editAvatar : user?.avatar, user?.name)}
                    sx={{
                      width: 110,
                      height: 110,
                      fontSize: 42,
                      border: `3px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                      boxShadow: `0 18px 32px ${alpha(theme.palette.primary.main, 0.18)}`
                    }}
                  >
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  {isEditing && (
                    <IconButton
                      component="label"
                      sx={{
                        position: 'absolute',
                        right: 2,
                        bottom: 2,
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: 3,
                        '&:hover': { bgcolor: theme.palette.action.hover }
                      }}
                    >
                      <input hidden accept="image/*" type="file" onChange={handleAvatarSelect} />
                      <PhotoCamera fontSize="small" color="primary" />
                    </IconButton>
                  )}
                </Box>

                <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
                  <Stack direction="row" spacing={1} justifyContent={{ xs: "center", md: "flex-start" }} sx={{ mb: 1.5, flexWrap: "wrap" }}>
                    <Chip icon={<VerifiedUserIcon />} label="Verified account" size="small" sx={{ borderRadius: 999, bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main, fontWeight: 700 }} />
                    <Chip icon={<BoltIcon />} label="Active workspace member" size="small" sx={{ borderRadius: 999, bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main, fontWeight: 700 }} />
                  </Stack>
                  <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.03em" }}>
                    {user?.name || "User Name"}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                    {user?.email || "user@example.com"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1.5, color: theme.palette.text.secondary, maxWidth: 520, mx: { xs: "auto", md: 0 } }}>
                    Manage your identity, communication preferences, and team access from one place.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 2, flexWrap: "wrap" }}>
                    {user?.job_title && <Chip icon={<WorkIcon />} label={user.job_title} sx={{ borderRadius: 999 }} />}
                    {user?.company && <Chip icon={<BusinessIcon />} label={user.company} sx={{ borderRadius: 999 }} />}
                    {user?.phone && <Chip icon={<CallIcon />} label={user.phone} sx={{ borderRadius: 999 }} />}
                  </Stack>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' }, gap: 1, flexWrap: "wrap" }}>
                  {isEditing ? (
                    <>
                      <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveProfile} sx={{ borderRadius: 999, textTransform: "none", px: 2.25, boxShadow: "none" }}>
                        Save changes
                      </Button>
                      <Button variant="outlined" color="inherit" startIcon={<CloseIcon />} onClick={() => { setIsEditing(false); setProfileError(""); }} sx={{ borderRadius: 999, textTransform: "none", px: 2.25 }}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setIsEditing(true)} sx={{ borderRadius: 999, textTransform: "none", px: 2.25 }}>
                        Edit profile
                      </Button>
                      <Button variant="text" startIcon={<InsightsIcon />} onClick={() => setTabValue(3)} sx={{ borderRadius: 999, textTransform: "none", px: 2 }}>
                        Security
                      </Button>
                    </>
                  )}
                </Box>
              </Box>

              {profileError && <Alert severity="error">{profileError}</Alert>}
              {profileSaved && <Alert severity="success">Profile updated successfully!</Alert>}

              <Box sx={{ ...settingsPanelSx }}>
                <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1 }}>Identity</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 1.5 }}>
                  <TextField label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} size="small" fullWidth disabled={!isEditing} />
                  <TextField label="Email" value={editEmail} size="small" fullWidth disabled />
                  <TextField label="Job Title" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} size="small" fullWidth disabled={!isEditing} />
                  <TextField label="Company" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} size="small" fullWidth disabled={!isEditing} />
                  <TextField label="Phone Number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} size="small" fullWidth disabled={!isEditing} />
                  <TextField label="Timezone" value={preferredTimezone} onChange={(e) => setPreferredTimezone(e.target.value)} size="small" fullWidth disabled={!isEditing} />
                </Box>
              </Box>

              <Box sx={{ ...settingsPanelSx }}>
                <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1 }}>Quick Controls</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5, mt: 1.5 }}>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.08), border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}` }}>
                    <Typography variant="subtitle2" fontWeight={700}>Theme</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{mode === "dark" ? "Dark mode enabled" : "Light mode enabled"}</Typography>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.08), border: `1px solid ${alpha(theme.palette.success.main, 0.18)}` }}>
                    <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{pushNotifications ? "Real-time alerts on" : "Push alerts paused"}</Typography>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, 0.08), border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}` }}>
                    <Typography variant="subtitle2" fontWeight={700}>Team Access</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{teammates.length} teammates connected</Typography>
                  </Box>
                </Box>
              </Box>
            </Stack>
        </TabPanel>

        {/* APPEARANCE TAB */}
        <TabPanel value={tabValue} index={1}>
            <Stack spacing={2.5}>
              <Box sx={{ ...settingsPanelSx }}>
                <Typography variant="h6" gutterBottom fontWeight={800}>Workspace Style</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Personalize how PackageReport feels across boards, chats, and dashboards.
                </Typography>
                <List>
                  <ListItem>
                    <Box sx={{ mr: 2 }}>{mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}</Box>
                    <ListItemText primary="Dark Mode" secondary={mode === 'dark' ? "The app is currently using the darker workspace theme." : "The app is currently using the lighter workspace theme."} />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={toggleTheme} checked={mode === 'dark'} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <Box sx={{ mr: 2 }}><AutoAwesomeIcon /></Box>
                    <ListItemText primary="Compact Layout" secondary="Reduce visual spacing to fit more information on screen." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setCompactMode(e.target.checked)} checked={compactMode} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <Box sx={{ mr: 2 }}><BoltIcon /></Box>
                    <ListItemText primary="Reduced Motion" secondary="Minimize animation and transitions for a calmer interface." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setReducedMotion(e.target.checked)} checked={reducedMotion} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <Box sx={{ mr: 2 }}><PersonIcon /></Box>
                    <ListItemText primary="Show Avatars In Dense Views" secondary="Keep profile avatars visible in compact tables and cards." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setShowAvatarsInDenseViews(e.target.checked)} checked={showAvatarsInDenseViews} />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Box>

              <Box sx={{ ...settingsPanelSx }}>
                <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1 }}>Regional Preferences</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 1.5 }}>
                  <TextField select label="Language" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} size="small" SelectProps={{ native: true }}>
                    <option value="English">English</option>
                    <option value="German">German</option>
                    <option value="Albanian">Albanian</option>
                    <option value="Hungarian">Hungarian</option>
                  </TextField>
                  <TextField select label="Timezone" value={preferredTimezone} onChange={(e) => setPreferredTimezone(e.target.value)} size="small" SelectProps={{ native: true }}>
                    <option value="Europe/Budapest">Europe/Budapest</option>
                    <option value="Europe/Berlin">Europe/Berlin</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                  </TextField>
                </Box>
              </Box>
            </Stack>
        </TabPanel>

        {/* NOTIFICATIONS TAB */}
        <TabPanel value={tabValue} index={2}>
            <Stack spacing={2.5}>
              <Box sx={{ ...settingsPanelSx }}>
                <Typography variant="h6" gutterBottom fontWeight={800}>Notification Settings</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Decide which updates deserve your attention and which ones can wait.
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Email Notifications" secondary="Receive important updates via email." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setEmailNotifications(e.target.checked)} checked={emailNotifications} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText primary="Push Notifications" secondary="Receive push notifications on your device." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setPushNotifications(e.target.checked)} checked={pushNotifications} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText primary="Mentions & Replies" secondary="Highlight comments and replies where you are directly involved." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setMentionNotifications(e.target.checked)} checked={mentionNotifications} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText primary="Daily Digest" secondary="Receive a summary of board activity once per day." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setDigestNotifications(e.target.checked)} checked={digestNotifications} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText primary="Task Reminders" secondary="Send reminders for scheduled messages and approaching due dates." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setTaskReminderNotifications(e.target.checked)} checked={taskReminderNotifications} />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Box>
            </Stack>
        </TabPanel>

        {/* SECURITY TAB */}
        <TabPanel value={tabValue} index={3}>
            <Stack spacing={2.5}>
              <Box sx={{ ...settingsPanelSx }}>
                <Typography variant="h6" gutterBottom fontWeight={800}>Change Password</Typography>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 460, mt: 2 }}>
                  <TextField label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth size="small" />
                  <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth size="small" />
                  <TextField label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth size="small" />
                  {passwordError && <Alert severity="error">{passwordError}</Alert>}
                  {passwordSuccess && <Alert severity="success">{passwordSuccess}</Alert>}
                  <Button variant="contained" onClick={handleChangePassword} disabled={!currentPassword || !newPassword} sx={{ alignSelf: "flex-start", borderRadius: 999, textTransform: "none", px: 2.5, boxShadow: "none" }}>
                    Update Password
                  </Button>
                </Box>
              </Box>

              <Box sx={{ ...settingsPanelSx }}>
                <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1 }}>Protection</Typography>
                <List sx={{ mt: 1 }}>
                  <ListItem>
                    <Box sx={{ mr: 2 }}><VerifiedUserIcon /></Box>
                    <ListItemText primary="Two-Factor Authentication" secondary="Add an extra verification step when signing in." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setTwoFactorEnabled(e.target.checked)} checked={twoFactorEnabled} />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <Box sx={{ mr: 2 }}><DevicesIcon /></Box>
                    <ListItemText primary="New Session Alerts" secondary="Get warned when your account is opened on a new browser or device." />
                    <ListItemSecondaryAction>
                      <Switch edge="end" onChange={(e) => setSessionAlertsEnabled(e.target.checked)} checked={sessionAlertsEnabled} />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 2 }}>
                  <Chip icon={<ScheduleIcon />} label="Last password update: Today" sx={{ borderRadius: 999 }} />
                  <Chip icon={<LanguageIcon />} label={`Primary timezone: ${preferredTimezone}`} sx={{ borderRadius: 999 }} />
                </Stack>
              </Box>
            </Stack>
        </TabPanel>

        {/* TEAM TAB */}
        <TabPanel value={tabValue} index={4}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 },
                textAlign: { xs: 'center', sm: 'left' }
              }}
            >
              <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Team Members</Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Manage who has access to your boards
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => {
                  setInviteDialogOpen(true);
                  fetchWorkspaces();
                }}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Invite Teammate
              </Button>
            </Box>
            
            {loadingTeammates ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={40} />
                </Box>
            ) : teammates.length > 0 ? (
                <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {teammates.map((teammate) => (
                      <Paper
                        key={teammate.id}
                        onClick={() => {
                          if (teammate.status === 'joined') {
                            setSelectedTeammateForAccess(teammate);
                            setAccessDialogOpen(true);
                          }
                        }}
                        sx={{
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 3,
                          border: `1px solid ${theme.palette.divider}`,
                          transition: 'all 0.2s',
                          cursor: teammate.status === 'joined' ? 'pointer' : 'default',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: { xs: 2, sm: 0 },
                          '&:hover': teammate.status === 'joined' ? {
                            borderColor: theme.palette.primary.main,
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                            transform: 'translateY(-2px)'
                          } : {}
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                          <Avatar
                            src={getAvatarUrl(teammate.avatar)}
                            sx={{ width: 48, height: 48, border: teammate.status === 'pending' ? `2px solid #fdab3d` : 'none', mx: { xs: 'auto', sm: 0 } }}
                          />
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                              <Typography variant="subtitle1" fontWeight={700}>{teammate.name}</Typography>
                              {teammate.status === 'pending' && (
                                <Box sx={{
                                  bgcolor: 'rgba(253, 171, 61, 0.1)',
                                  color: '#fdab3d',
                                  px: 1,
                                  py: 0.2,
                                  borderRadius: 1,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  border: '1px solid rgba(253, 171, 61, 0.2)',
                                  mt: { xs: 1, sm: 0 }
                                }}>
                                  Pending
                                </Box>
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">{teammate.email}</Typography>
                            {teammate.status === 'joined' && (
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                    color: theme.palette.success.main,
                                    px: 1,
                                    py: 0.2,
                                    borderRadius: 1,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    mb: { xs: 1, sm: 0 }
                                  }}
                                >
                                  Active
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    px: 1,
                                    py: 0.2,
                                    borderRadius: 1,
                                    fontWeight: 600
                                  }}
                                >
                                  {teammate.access?.length || 0} boards
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-end' }, mt: { xs: 2, sm: 0 } }}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTeammate(teammate.id);
                            }}
                            sx={{ borderRadius: 2, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
                          >
                            Remove
                          </Button>
                        </Box>
                      </Paper>
                    ))}
                </List>
            ) : (
                <Box sx={{ p: 6, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                    <GroupIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h5" fontWeight={700} gutterBottom>Build Your Team</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 450, mx: 'auto' }}>
                        You haven't added any teammates yet. Start collaborating by inviting members to your boards.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button 
                            variant="contained" 
                            startIcon={<PersonAddIcon />} 
                            onClick={() => { setInviteDialogOpen(true); fetchWorkspaces(); }}
                            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, px: 3 }}
                        >
                            Invite First Teammate
                        </Button>
                    </Box>
                </Box>
            )}
        </TabPanel>

      </Paper>

      {/* Invite Teammate Dialog */}
      <Dialog 
        open={inviteDialogOpen} 
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Invite Teammate</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Centralized teammate management: add members to any of your boards.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Autocomplete
                    fullWidth
                    options={peopleSuggestions}
                    getOptionLabel={(option: any) => `${option.name} (${option.email})`}
                    loading={loadingSuggestions}
                    onInputChange={(event, value) => fetchPeopleSuggestions(value)}
                    onChange={(event, value) => setSelectedUser(value)}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={option.avatar} sx={{ width: 32, height: 32 }} />
                            <Box>
                                <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{option.email}</Typography>
                            </Box>
                        </Box>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Teammate Name or Email"
                            placeholder="Type to search..."
                            size="small"
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <React.Fragment>
                                        {loadingSuggestions ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ),
                            }}
                        />
                    )}
                />

                <TextField
                    select
                    label="Select Workspace"
                    fullWidth
                    value={selectedInviteWs}
                    onChange={(e) => {
                        setSelectedInviteWs(e.target.value);
                        fetchTablesForInvite(e.target.value);
                    }}
                    SelectProps={{ native: true }}
                    size="small"
                >
                    {inviteWorkspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Select Board"
                    fullWidth
                    value={selectedInviteTable}
                    onChange={(e) => setSelectedInviteTable(e.target.value)}
                    SelectProps={{ native: true }}
                    size="small"
                    disabled={!selectedInviteWs || inviteTables.length === 0}
                >
                    {inviteTables.length > 0 ? (
                        inviteTables.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))
                    ) : (
                        <option value="">No boards in this workspace</option>
                    )}
                </TextField>

                {/* Permission Selection */}
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block', textTransform: 'uppercase' }}>
                    Permission Level
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      fullWidth
                      onClick={() => setInvitePermission('edit')}
                      sx={{
                        bgcolor: invitePermission === 'edit' ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                        color: invitePermission === 'edit' ? theme.palette.primary.main : theme.palette.text.secondary,
                        border: `1px solid ${invitePermission === 'edit' ? theme.palette.primary.main : theme.palette.divider}`,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                      }}
                    >
                      Editable
                    </Button>
                    <Button
                      size="small"
                      fullWidth
                      onClick={() => setInvitePermission('read')}
                      sx={{
                        bgcolor: invitePermission === 'read' ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                        color: invitePermission === 'read' ? theme.palette.primary.main : theme.palette.text.secondary,
                        border: `1px solid ${invitePermission === 'read' ? theme.palette.primary.main : theme.palette.divider}`,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                      }}
                    >
                      Read-only
                    </Button>
                    <Button
                      size="small"
                      fullWidth
                      onClick={() => setInvitePermission('admin')}
                      sx={{
                        bgcolor: invitePermission === 'admin' ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                        color: invitePermission === 'admin' ? theme.palette.primary.main : theme.palette.text.secondary,
                        border: `1px solid ${invitePermission === 'admin' ? theme.palette.primary.main : theme.palette.divider}`,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                      }}
                    >
                      Admin
                    </Button>
                  </Box>
                </Box>

                {/* Invite Code Display */}
                {selectedInviteTable && (
                  <Box sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      INVITE CODE FOR THIS BOARD
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h5" sx={{ color: theme.palette.primary.main, fontWeight: 700, letterSpacing: 4 }}>
                        {currentTableInviteCode || "------"}
                      </Typography>
                      <Tooltip title="Copy Code">
                        <IconButton size="small" onClick={() => {
                          if (currentTableInviteCode) {
                            navigator.clipboard.writeText(currentTableInviteCode);
                            showNotification("Code copied!", "success");
                          }
                        }} sx={{ color: theme.palette.primary.main }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                      Share this code with teammates so they can join this board.
                    </Typography>
                  </Box>
                )}
            </Box>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={() => setInviteDialogOpen(false)}
                    sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
                >
                    Cancel
                </Button>
                <Button 
                    variant="contained" 
                    fullWidth 
                    onClick={handleInviteTeammate}
                    disabled={isInviting || !selectedUser || !selectedInviteTable}
                    sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
                >
                    {isInviting ? <CircularProgress size={24} color="inherit" /> : "Send Invite"}
                </Button>
            </Box>
        </Box>
      </Dialog>

      {/* Granular Access Management Dialog */}
      <Dialog
        open={accessDialogOpen}
        onClose={() => {
            setAccessDialogOpen(false);
            setBoardSearchQuery("");
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
            sx: { borderRadius: 4, height: '80vh', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar 
                    src={getAvatarUrl(selectedTeammateForAccess?.avatar)} 
                    sx={{ width: 56, height: 56, border: `2px solid ${theme.palette.divider}` }} 
                />
                <Box>
                    <Typography variant="h6" fontWeight={800}>{selectedTeammateForAccess?.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedTeammateForAccess?.email}</Typography>
                </Box>
            </Box>
            <Divider sx={{ mt: 2 }} />
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 0, flex: 1, overflowY: 'auto' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Shared Access
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Filter workspaces and boards..."
                    value={boardSearchQuery}
                    onChange={(e) => setBoardSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 18 }} />
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'action.hover' }
                    }}
                />
            </Box>

            <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {selectedTeammateForAccess?.access?.filter((a: any) => 
                    a.tableName?.toLowerCase().includes(boardSearchQuery.toLowerCase()) || 
                    a.workspaceName?.toLowerCase().includes(boardSearchQuery.toLowerCase())
                ).map((a: any) => (
                    <Paper 
                        key={a.tableId} 
                        variant="outlined" 
                        sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${theme.palette.divider}` }}
                    >
                        <Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', mb: 0.2 }}>
                                {a.workspaceName}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={700}>{a.tableName}</Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                select
                                size="small"
                                value={a.permission}
                                onChange={(e) => handleUpdateGranularPermission(selectedTeammateForAccess.id, a.tableId, e.target.value)}
                                SelectProps={{ native: true }}
                                sx={{ 
                                    minWidth: 100,
                                    '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.8rem', fontWeight: 600 }
                                }}
                            >
                                <option value="read">Read Only</option>
                                <option value="edit">Editor</option>
                                <option value="admin">Admin</option>
                            </TextField>
                        </Box>
                    </Paper>
                ))}
            </List>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => setAccessDialogOpen(false)}
                sx={{ borderRadius: 3, py: 1.2, fontWeight: 700, textTransform: 'none' }}
            >
                Close
            </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
