"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Autocomplete
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

import { getApiUrl, authenticatedFetch, getAvatarUrl, navigateToAppRoute } from "../../apiUrl";
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
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

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
                setEmailNotifications(data.email_notifications !== false);
                setPushNotifications(data.push_notifications !== false);
                
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
                // Use POST to get OR generate the code
                const res = await authenticatedFetch(getApiUrl(`tables/${selectedInviteTable}/invite-code`), {
                    method: 'POST'
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentTableInviteCode(data.invite_code || null);
                }
            } catch (e) {
                console.error("Failed to fetch/generate invite code", e);
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
        const res = await authenticatedFetch(getApiUrl(`tables/${selectedInviteTable}/invite`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientId: selectedUser.id,
              userId: selectedUser.id,
              permission: invitePermission,
            })
        });

        const payload = await res.json().catch(() => null);
        
        if (res.ok) {
            showNotification(`Successfully invited ${selectedUser.name} to the board!`, "success");
            setInviteDialogOpen(false);
            setInviteEmail("");
            setSelectedUser(null);
            // Refresh teammates
            const teamRes = await authenticatedFetch(getApiUrl('teammates'));
            if (teamRes.ok) setTeammates(await teamRes.json());
        } else {
            showNotification(payload?.error || "Failed to invite teammate", "error");
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

  const handleNotificationToggle = async (
    setting: "email_notifications" | "push_notifications",
    checked: boolean
  ) => {
    const previousEmail = emailNotifications;
    const previousPush = pushNotifications;

    if (setting === "email_notifications") {
      setEmailNotifications(checked);
    } else {
      setPushNotifications(checked);
    }

    setSavingNotificationSettings(true);

    try {
      const nextEmail = setting === "email_notifications" ? checked : previousEmail;
      const nextPush = setting === "push_notifications" ? checked : previousPush;

      const res = await authenticatedFetch(getApiUrl("users/profile"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_notifications: nextEmail,
          push_notifications: nextPush,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update notification settings");
      }

      const updatedUser = await res.json();
      setUser((prev: any) => ({ ...(prev || {}), ...updatedUser }));
      setEmailNotifications(updatedUser.email_notifications !== false);
      setPushNotifications(updatedUser.push_notifications !== false);

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        localStorage.setItem("user", JSON.stringify({ ...parsed, ...updatedUser }));
      } else {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profile-updated'));
      }

      showNotification(
        `${setting === "email_notifications" ? "Email" : "Push"} notifications ${checked ? "enabled" : "disabled"}`,
        "success"
      );
    } catch (e) {
      console.error("Failed to update notification settings", e);
      setEmailNotifications(previousEmail);
      setPushNotifications(previousPush);
      showNotification("Failed to update notification settings", "error");
    } finally {
      setSavingNotificationSettings(false);
    }
  };

   const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const tabName = Object.keys(tabMap).find(key => tabMap[key] === newValue);
    if (tabName) {
      navigateToAppRoute(`/settings?tab=${tabName}`, router, false, { scroll: false });
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
          // Optionally notify immediately after avatar upload (before save)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('profile-updated'));
          }
        } else {
          setProfileError("Failed to upload image");
        }
      } catch (err) {
        console.error("Upload failed", err);
        setProfileError("Error uploading image");
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

  const surfaceBg = theme.palette.mode === 'dark' ? 'rgba(20, 20, 20, 0.42)' : 'rgba(255, 255, 255, 0.68)';
  const panelBg = theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.5)';
  const inputBg = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.82)';
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      bgcolor: inputBg,
      boxShadow: theme.palette.mode === 'dark'
        ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
        : 'inset 0 1px 0 rgba(255,255,255,0.7)',
      '& fieldset': { border: 'none' },
      '&:hover fieldset': { border: 'none' },
      '&.Mui-focused fieldset': { border: 'none' },
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 4, letterSpacing: '-0.5px' }}>
        Account Settings
      </Typography>

      <Paper sx={{ 
        mb: 4, 
        overflow: 'hidden', 
        borderRadius: 4, 
        bgcolor: surfaceBg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: theme.palette.mode === 'dark' ? '0 24px 64px rgba(0,0,0,0.4)' : '0 24px 64px rgba(0,0,0,0.06)',
        backgroundImage: 'none',
        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
      }}>
        <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ style: { display: "none" } }} // Hide the standard underline
            sx={{ 
              p: 1.5,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.18)',
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 999,
                margin: '0 4px',
                padding: '8px 20px',
                color: theme.palette.text.secondary,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  color: theme.palette.text.primary,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                },
                '&.Mui-selected': {
                  color: theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.dark,
                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.1),
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                }
              }
            }}
        >
          <Tab icon={<PersonIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Profile" />
          <Tab icon={<PaletteIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Appearance" />
          <Tab icon={<NotificationsIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Notifications" />
          <Tab icon={<SecurityIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Security" />
          <Tab icon={<GroupIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Team" />
        </Tabs>

        {/* PROFILE TAB */}
        <TabPanel value={tabValue} index={0}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                mb: 4,
                gap: { xs: 4, sm: 5 },
                p: { xs: 3, sm: 4 },
                borderRadius: 4,
                bgcolor: panelBg,
                boxShadow: theme.palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'inset 0 1px 0 rgba(255,255,255,0.55)',
              }}
            >
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', ml: { sm: 2 } }}>
                <Box sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.3)} 0%, transparent 70%)`,
                  zIndex: 0,
                }} />
                <Avatar
                  src={getAvatarUrl(isEditing ? editAvatar : user?.avatar, user?.name)}
                  sx={{ 
                    width: 110, height: 110, fontSize: 44, fontWeight: 700, 
                    mx: { xs: 'auto', sm: 0 }, zIndex: 1, 
                    boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.25)}` 
                  }}
                >
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                {isEditing && (
                  <IconButton
                    component="label"
                    sx={{
                      position: 'absolute',
                      bottom: -4,
                      right: { xs: 'calc(50% - 30px)', sm: -8 },
                      bgcolor: theme.palette.primary.main,
                      color: '#fff',
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.5)}`,
                      zIndex: 2,
                      '&:hover': { bgcolor: theme.palette.primary.dark, transform: 'scale(1.05)' },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input hidden accept="image/*" type="file" onChange={handleAvatarSelect} />
                    <PhotoCamera fontSize="small" />
                  </IconButton>
                )}
              </Box>
              
              <Box sx={{ flexGrow: 1, width: '100%' }}>
                {isEditing ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600, mx: { xs: 'auto', sm: 0 } }}>
                    <TextField
                      label="Full Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      size="small"
                      sx={{ width: '100%', ...fieldSx }}
                    />
                    <TextField
                      label="Email"
                      value={editEmail}
                      size="small"
                      sx={{ width: '100%', ...fieldSx }}
                      disabled
                    />
                    <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <TextField
                        label="Job Title"
                        value={editJobTitle}
                        onChange={(e) => setEditJobTitle(e.target.value)}
                        size="small"
                        sx={{ width: '100%', ...fieldSx }}
                      />
                      <TextField
                        label="Company"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        size="small"
                        sx={{ width: '100%', ...fieldSx }}
                      />
                    </Box>
                    <TextField
                      label="Phone Number"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      size="small"
                      sx={{ width: '100%', ...fieldSx }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                    <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.5px' }}>{user?.name || "User Name"}</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontSize: 15, fontWeight: 500 }}>{user?.email || "user@example.com"}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: 2, mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                      {user?.job_title && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 999, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                          <WorkIcon fontSize="small" />
                          <Typography variant="body2" fontWeight={600}>{user.job_title}</Typography>
                        </Box>
                      )}
                      {user?.company && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 999, bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main }}>
                          <BusinessIcon fontSize="small" />
                          <Typography variant="body2" fontWeight={600}>{user.company}</Typography>
                        </Box>
                      )}
                      {user?.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 999, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}>
                          <CallIcon fontSize="small" />
                          <Typography variant="body2" fontWeight={600}>{user.phone}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mt: { xs: 2, sm: 0 }, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, minWidth: 120 }}>
                {isEditing ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={() => { setIsEditing(false); setProfileError(""); }} color="inherit" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: 'transparent', bgcolor: alpha(theme.palette.text.primary, 0.06) }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveProfile} color="primary" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}` }}>Save</Button>
                  </Box>
                ) : (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setIsEditing(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: 'transparent', bgcolor: alpha(theme.palette.text.primary, 0.06), '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) } }}>
                    Edit Profile
                  </Button>
                )}
              </Box>
            </Box>

            {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}
            {profileSaved && <Alert severity="success" sx={{ mb: 2 }}>Profile updated successfully!</Alert>}
        </TabPanel>

        {/* APPEARANCE TAB */}
        <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.5px' }}>Theme Preferences</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Choose how the platform looks to you.</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
                <Paper sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: panelBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.1)}` }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, width: 44, height: 44 }}>
                            {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Dark Mode</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {mode === 'dark' ? "App is currently in dark mode" : "App is currently in light mode"}
                            </Typography>
                        </Box>
                    </Box>
                    <Switch edge="end" onChange={toggleTheme} checked={mode === 'dark'} color="primary" />
                </Paper>
            </Box>
        </TabPanel>

        {/* NOTIFICATIONS TAB */}
        <TabPanel value={tabValue} index={2}>
            <Typography variant="h5" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.5px' }}>Notification Settings</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Manage how you receive updates and alerts.
            </Typography>
            
            {savingNotificationSettings && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Saving notification settings...
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
                <Paper sx={{
                  p: 2.5, borderRadius: 3,
                  bgcolor: panelBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.1)}` }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main, width: 44, height: 44 }}>
                            <NotificationsIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Email Notifications</Typography>
                            <Typography variant="body2" color="text.secondary">Receive updates via email</Typography>
                        </Box>
                    </Box>
                    <Switch
                      edge="end"
                      onChange={(e) => handleNotificationToggle("email_notifications", e.target.checked)}
                      checked={emailNotifications}
                      color="info"
                      disabled={savingNotificationSettings}
                    />
                </Paper>
                
                <Paper sx={{
                  p: 2.5, borderRadius: 3,
                  bgcolor: panelBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.1)}` }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main, width: 44, height: 44 }}>
                            <NotificationsIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Push Notifications</Typography>
                            <Typography variant="body2" color="text.secondary">Receive push notifications on your device</Typography>
                        </Box>
                    </Box>
                    <Switch
                      edge="end"
                      onChange={(e) => handleNotificationToggle("push_notifications", e.target.checked)}
                      checked={pushNotifications}
                      color="warning"
                      disabled={savingNotificationSettings}
                    />
                </Paper>
            </Box>
        </TabPanel>

        {/* SECURITY TAB */}
        <TabPanel value={tabValue} index={3}>
            <Typography variant="h5" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.5px' }}>Change Password</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Ensure your account is using a long, random password to stay secure.</Typography>
            
            <Paper component="form" sx={{ 
              p: { xs: 3, sm: 4 }, 
              borderRadius: 4, 
              display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 500,
              bgcolor: panelBg,
            }}>
                <TextField 
                    label="Current Password" type="password" 
                    value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    fullWidth size="small"
                    sx={fieldSx}
                />
                <TextField 
                    label="New Password" type="password" 
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth size="small"
                    sx={fieldSx}
                />
                <TextField 
                    label="Confirm New Password" type="password" 
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth size="small"
                    sx={fieldSx}
                />
                
                {passwordError && <Alert severity="error" sx={{ borderRadius: 2 }}>{passwordError}</Alert>}
                {passwordSuccess && <Alert severity="success" sx={{ borderRadius: 2 }}>{passwordSuccess}</Alert>}

                <Button 
                  variant="contained" onClick={handleChangePassword} disabled={!currentPassword || !newPassword}
                  sx={{ mt: 1, py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: 'none', boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}` }}
                >
                    Update Password
                </Button>
            </Paper>
        </TabPanel>

        {/* TEAM TAB */}
        <TabPanel value={tabValue} index={4}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 4,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 },
                textAlign: { xs: 'center', sm: 'left' }
              }}
            >
              <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.5px' }}>Team Members</Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
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
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 1,
                  px: 3,
                  width: { xs: '100%', sm: 'auto' },
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
                }}
              >
                Invite Teammate
              </Button>
            </Box>
            
            {loadingTeammates ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                    <CircularProgress size={48} thickness={4} />
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
                          p: { xs: 2.5, sm: 3 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 4,
                          bgcolor: panelBg,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: teammate.status === 'joined' ? 'pointer' : 'default',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: { xs: 2.5, sm: 0 },
                          '&:hover': teammate.status === 'joined' ? {
                            boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
                            transform: 'translateY(-3px)'
                          } : {}
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                          <Box sx={{ position: 'relative' }}>
                            <Avatar
                              src={getAvatarUrl(teammate.avatar)}
                              sx={{ width: 56, height: 56, mx: { xs: 'auto', sm: 0 }, boxShadow: 1 }}
                            />
                            {teammate.status === 'pending' && (
                              <Box sx={{ position: 'absolute', bottom: -4, right: -4, width: 16, height: 16, borderRadius: '50%', bgcolor: theme.palette.warning.main }} />
                            )}
                            {teammate.status === 'joined' && (
                              <Box sx={{ position: 'absolute', bottom: -4, right: -4, width: 16, height: 16, borderRadius: '50%', bgcolor: theme.palette.success.main }} />
                            )}
                          </Box>
                          
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                              <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.3px' }}>{teammate.name}</Typography>
                              {teammate.status === 'pending' && (
                                <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.warning.main, 0.15), color: theme.palette.warning.dark, px: 1.5, py: 0.25, borderRadius: 999, fontWeight: 800, textTransform: 'uppercase', mt: { xs: 1, sm: 0 } }}>
                                  Pending Invite
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>{teammate.email}</Typography>
                            
                            {teammate.status === 'joined' && (
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                                <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, px: 1.5, py: 0.5, borderRadius: 2, fontWeight: 700 }}>
                                  Has access to {teammate.access?.length || 0} boards
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
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, width: { xs: '100%', sm: 'auto' }, borderColor: 'transparent', bgcolor: alpha(theme.palette.error.main, 0.08), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.14) } }}
                          >
                            Remove
                          </Button>
                        </Box>
                      </Paper>
                    ))}
                </List>
            ) : (
                <Box sx={{ p: 8, textAlign: 'center', bgcolor: panelBg, borderRadius: 4, boxShadow: theme.palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'inset 0 1px 0 rgba(255,255,255,0.55)' }}>
                    <GroupIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
                    <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.3px' }}>Build Your Team</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 450, mx: 'auto' }}>
                        You haven't added any teammates yet. Start collaborating by inviting members to your boards.
                    </Typography>
                    <Button 
                        variant="contained" 
                        size="large"
                        startIcon={<PersonAddIcon />} 
                        onClick={() => { setInviteDialogOpen(true); fetchWorkspaces(); }}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 4, boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}` }}
                    >
                        Invite First Teammate
                    </Button>
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
        slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.4)' } }
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(24,24,24,0.9)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px)',
            boxShadow: `0 32px 64px ${alpha(theme.palette.common.black, 0.3)}`,
            backgroundImage: 'none',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
          }
        }}
      >
        <Box sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.3px' }}>Invite Teammate</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Centralized teammate management: add members to any of your boards securely.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Autocomplete
                    fullWidth
                    options={peopleSuggestions}
                    getOptionLabel={(option: any) => `${option.name} (${option.email})`}
                    loading={loadingSuggestions}
                    onInputChange={(event, value) => fetchPeopleSuggestions(value)}
                    onChange={(event, value) => setSelectedUser(value)}
                    renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={getAvatarUrl(option.avatar)} sx={{ width: 32, height: 32 }} />
                            <Box>
                                <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{option.email}</Typography>
                            </Box>
                        </Box>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Search Name or Email"
                            placeholder="Type to search..."
                            size="small"
                            sx={fieldSx}
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
                    sx={fieldSx}
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
                    sx={fieldSx}
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
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Permission Level
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      fullWidth
                      onClick={() => setInvitePermission('edit')}
                      sx={{
                        bgcolor: invitePermission === 'edit' ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.action.hover, 0.5),
                        color: invitePermission === 'edit' ? theme.palette.primary.main : theme.palette.text.secondary,
                        borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                        boxShadow: invitePermission === 'edit' ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                      }}
                    >
                      Editable
                    </Button>
                    <Button
                      size="small"
                      fullWidth
                      onClick={() => setInvitePermission('read')}
                      sx={{
                        bgcolor: invitePermission === 'read' ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.action.hover, 0.5),
                        color: invitePermission === 'read' ? theme.palette.primary.main : theme.palette.text.secondary,
                        borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                        boxShadow: invitePermission === 'read' ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                      }}
                    >
                      Read-only
                    </Button>
                    <Button
                      size="small"
                      fullWidth
                      onClick={() => setInvitePermission('admin')}
                      sx={{
                        bgcolor: invitePermission === 'admin' ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.action.hover, 0.5),
                        color: invitePermission === 'admin' ? theme.palette.primary.main : theme.palette.text.secondary,
                        borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 1,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                        boxShadow: invitePermission === 'admin' ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                      }}
                    >
                      Admin
                    </Button>
                  </Box>
                </Box>

                {/* Invite Code Display */}
                {selectedInviteTable && (
                  <Box sx={{
                    mt: 1, p: 2.5, borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1
                  }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.5px' }}>
                      BOARD INVITE CODE
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 800, letterSpacing: 6 }}>
                        {currentTableInviteCode || "------"}
                      </Typography>
                      <Tooltip title="Copy Code">
                        <IconButton size="small" onClick={() => {
                          if (currentTableInviteCode) {
                            navigator.clipboard.writeText(currentTableInviteCode);
                            showNotification("Code copied!", "success");
                          }
                        }} sx={{ color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
            </Box>

            <Box sx={{ mt: 5, display: 'flex', gap: 2 }}>
                <Button 
                    variant="outlined" fullWidth onClick={() => setInviteDialogOpen(false)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1.2, borderColor: 'transparent', bgcolor: alpha(theme.palette.text.primary, 0.06) }}
                >
                    Cancel
                </Button>
                <Button 
                    variant="contained" fullWidth onClick={handleInviteTeammate}
                    disabled={isInviting || !selectedUser || !selectedInviteTable}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1.2, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}` }}
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
        slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.4)' } }
        }}
        PaperProps={{
            sx: { 
                borderRadius: 4, height: '80vh', display: 'flex', flexDirection: 'column',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(24,24,24,0.9)' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(24px)',
                boxShadow: `0 32px 64px ${alpha(theme.palette.common.black, 0.3)}`,
                backgroundImage: 'none',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
            }
        }}
      >
        <DialogTitle sx={{ p: 4, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 1 }}>
                <Avatar 
                    src={getAvatarUrl(selectedTeammateForAccess?.avatar)} 
                    sx={{ width: 64, height: 64, boxShadow: 1 }} 
                />
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>{selectedTeammateForAccess?.name}</Typography>
                    <Typography variant="body1" color="text.secondary">{selectedTeammateForAccess?.email}</Typography>
                </Box>
            </Box>
            <Divider sx={{ mt: 3, opacity: 0.5 }} />
        </DialogTitle>
        <DialogContent sx={{ p: 4, pt: 0, flex: 1, overflowY: 'auto' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
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
                    sx={fieldSx}
                />
            </Box>

            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedTeammateForAccess?.access?.filter((a: any) => 
                    a.tableName?.toLowerCase().includes(boardSearchQuery.toLowerCase()) || 
                    a.workspaceName?.toLowerCase().includes(boardSearchQuery.toLowerCase())
                ).map((a: any) => (
                    <Paper 
                        key={a.tableId} 
                        variant="outlined" 
                        sx={{ p: 2.5, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: panelBg, boxShadow: 'none' }}
                    >
                        <Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5, letterSpacing: '0.5px' }}>
                                {a.workspaceName}
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800}>{a.tableName}</Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                select
                                size="small"
                                value={a.permission}
                                onChange={(e) => handleUpdateGranularPermission(selectedTeammateForAccess.id, a.tableId, e.target.value)}
                                SelectProps={{ native: true }}
                                sx={{ 
                                    minWidth: 120,
                                    '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem', fontWeight: 700, bgcolor: inputBg, '& fieldset': { border: 'none' }, '&:hover fieldset': { border: 'none' }, '&.Mui-focused fieldset': { border: 'none' } }
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
        <DialogActions sx={{ p: 4, pt: 2 }}>
            <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => setAccessDialogOpen(false)}
                sx={{ borderRadius: 2, py: 1.5, fontWeight: 800, textTransform: 'none', borderColor: 'transparent', bgcolor: alpha(theme.palette.text.primary, 0.06) }}
            >
                Close
            </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
