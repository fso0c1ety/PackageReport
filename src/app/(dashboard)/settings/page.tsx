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
  Paper
} from "@mui/material";
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

import { getApiUrl, authenticatedFetch, getAvatarUrl } from "../../apiUrl";
import { useThemeContext } from "../../ThemeContext";
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
    security: 3
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

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

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
        </Tabs>

        {/* PROFILE TAB */}
        <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Box sx={{ position: 'relative', mr: 3 }}>
                  <Avatar
                    src={getAvatarUrl(isEditing ? editAvatar : user?.avatar, user?.name)}
                    sx={{ width: 100, height: 100, fontSize: 40 }}
                  >
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  {isEditing && (
                    <IconButton
                      component="label"
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        bgcolor: 'background.paper',
                        boxShadow: 2,
                        '&:hover': { bgcolor: 'grey.100' }
                      }}
                    >
                        <input hidden accept="image/*" type="file" onChange={handleAvatarSelect} />
                        <PhotoCamera fontSize="small" color="primary" />
                    </IconButton>
                  )}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    {isEditing ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, maxWidth: 600 }}>
                            <TextField 
                                label="Full Name" 
                                value={editName} 
                                onChange={(e) => setEditName(e.target.value)} 
                                size="small" 
                                sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}
                            />
                            <TextField 
                                label="Email" 
                                value={editEmail} 
                                size="small" 
                                sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}
                                disabled
                            />
                            <TextField 
                                label="Job Title" 
                                value={editJobTitle} 
                                onChange={(e) => setEditJobTitle(e.target.value)} 
                                size="small" 
                                sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}
                            />
                            <TextField 
                                label="Company" 
                                value={editCompany} 
                                onChange={(e) => setEditCompany(e.target.value)} 
                                size="small" 
                                sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}
                            />
                            <TextField 
                                label="Phone Number" 
                                value={editPhone} 
                                onChange={(e) => setEditPhone(e.target.value)} 
                                size="small" 
                                sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}
                            />
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="h5" fontWeight="bold">{user?.name || "User Name"}</Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>{user?.email || "user@example.com"}</Typography>
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                                {user?.job_title && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                        <WorkIcon fontSize="small" />
                                        <Typography variant="body2">{user.job_title}</Typography>
                                    </Box>
                                )}
                                {user?.company && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                        <BusinessIcon fontSize="small" />
                                        <Typography variant="body2">{user.company}</Typography>
                                    </Box>
                                )}
                                {user?.phone && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                        <CallIcon fontSize="small" />
                                        <Typography variant="body2">{user.phone}</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
                <Box>
                    {isEditing ? (
                        <Box>
                             <IconButton onClick={handleSaveProfile} color="primary"><SaveIcon /></IconButton>
                             <IconButton onClick={() => { setIsEditing(false); setProfileError(""); }} color="error"><CloseIcon /></IconButton>
                        </Box>
                    ) : (
                        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                            Edit
                        </Button>
                    )}
                </Box>
            </Box>

            {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}
            {profileSaved && <Alert severity="success" sx={{ mb: 2 }}>Profile updated successfully!</Alert>}
        </TabPanel>

        {/* APPEARANCE TAB */}
        <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>Theme Preferences</Typography>
            <List>
                <ListItem>
                    <Box sx={{ mr: 2 }}>
                        {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                    </Box>
                    <ListItemText 
                        primary="Dark Mode" 
                        secondary={mode === 'dark' ? "App is currently in dark mode" : "App is currently in light mode"} 
                    />
                    <ListItemSecondaryAction>
                        <Switch 
                            edge="end" 
                            onChange={toggleTheme} 
                            checked={mode === 'dark'} 
                        />
                    </ListItemSecondaryAction>
                </ListItem>
            </List>
        </TabPanel>

        {/* NOTIFICATIONS TAB */}
        <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>Notification Settings</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage how you receive updates and alerts.
            </Typography>
            <List>
                <ListItem>
                    <ListItemText 
                        primary="Email Notifications" 
                        secondary="Receive updates via email" 
                    />
                    <ListItemSecondaryAction>
                        <Switch 
                            edge="end" 
                            onChange={(e) => setEmailNotifications(e.target.checked)}
                            checked={emailNotifications}
                        />
                    </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                    <ListItemText 
                        primary="Push Notifications" 
                        secondary="Receive push notifications on your device" 
                    />
                    <ListItemSecondaryAction>
                        <Switch 
                            edge="end" 
                            onChange={(e) => setPushNotifications(e.target.checked)}
                            checked={pushNotifications}
                        />
                    </ListItemSecondaryAction>
                </ListItem>
            </List>
        </TabPanel>

        {/* SECURITY TAB */}
        <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>Change Password</Typography>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400, mt: 2 }}>
                <TextField 
                    label="Current Password" 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    fullWidth
                    size="small"
                />
                <TextField 
                    label="New Password" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    size="small"
                />
                <TextField 
                    label="Confirm New Password" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    size="small"
                />
                
                {passwordError && <Alert severity="error">{passwordError}</Alert>}
                {passwordSuccess && <Alert severity="success">{passwordSuccess}</Alert>}

                <Button variant="contained" onClick={handleChangePassword} disabled={!currentPassword || !newPassword}>
                    Update Password
                </Button>
            </Box>
        </TabPanel>

      </Paper>
    </Box>
  );
}
