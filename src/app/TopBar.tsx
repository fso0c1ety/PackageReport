"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Box, Avatar, IconButton, Badge, Tooltip, Typography, Menu, MenuItem, ListItemIcon, Button, List, useTheme, Divider, TextField, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions, FormLabel, Select as MuiSelect, FormControl, MenuItem as MuiMenuItem, InputLabel } from "@mui/material";
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CommentIcon from "@mui/icons-material/Comment";
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SendIcon from '@mui/icons-material/Send';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PaletteIcon from '@mui/icons-material/Palette';
import SecurityIcon from '@mui/icons-material/Security';
import GroupIcon from '@mui/icons-material/Group';
import { styled, alpha } from "@mui/material/styles";
import EmailIcon from '@mui/icons-material/Email';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from 'next/navigation';
import { authenticatedFetch, getApiUrl, getAvatarUrl } from "./apiUrl";
import { useThemeContext } from "./ThemeContext";

interface TopBarProps {
  onMenuClick?: () => void;
}

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  transition: "all 0.2s",
  "&:hover": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.action.hover,
    transform: "translateY(-1px)",
  },
}));

type Notification = {
  id: string;
  type: string;
  data: any;
  read: boolean;
  created_at: string;
};

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const router = useRouter();
  const theme = useTheme();
  const { toggleTheme, mode } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<any>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    // Load from localStorage immediately for fast initial render
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    // Then fetch from API to get the freshest data (e.g., after avatar changes in Settings)
    const fetchProfile = async () => {
      try {
        const res = await authenticatedFetch(getApiUrl('users/profile'));
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          // Keep localStorage in sync
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            localStorage.setItem('user', JSON.stringify({ ...parsed, ...data }));
          }
        }
      } catch (e) {
        // Silently fail — localStorage data is a good-enough fallback
      }
    };
    fetchProfile();
    window.addEventListener('profile-updated', fetchProfile);
    return () => window.removeEventListener('profile-updated', fetchProfile);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await authenticatedFetch(getApiUrl('users/fcm'), { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to clear FCM token on server", e);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);

  // Poll notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await authenticatedFetch(getApiUrl('notifications'));
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          setUnreadCount(data.filter((n: Notification) => !n.read).length);
        }
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleInviteAction = async (notifId: string, action: 'accept' | 'decline') => {
    try {
      const res = await authenticatedFetch(getApiUrl(`notifications/${notifId}/${action}`), { method: 'POST' });
      if (res.ok) {
        // Remove notification from list immediately
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        setUnreadCount(prev => Math.max(0, prev - 1));

        if (action === 'accept') {
          // Maybe refresh page or redirect? Or just let user discover the table.
          // alert("Invite accepted! Check your workspace.");
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} invite`, error);
    }
  };

  const handleNotifOpen = async (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(e.currentTarget);

    if (unreadCount > 0) {
      try {
        // Mark all as read on server
        await authenticatedFetch(getApiUrl('notifications/mark-read'), { method: 'POST' });
        // Update local state
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch (error) {
        console.error("Failed to mark notifications read", error);
      }
    }
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleNotificationClick = (notif: Notification) => {
    handleNotifClose();
    // Mark as read is handled on open, but we could mark specific one here if needed.

    const { type, data } = notif;
    if (!data) return;

    // Construct navigation URL
    let url = "";

    // If we have workspaceId, we can navigate to workspace view
    if (data.workspaceId) {
      url = `/workspace?id=${data.workspaceId}`;
      if (data.tableId) {
        url += `&tableId=${data.tableId}`;
      }
    } else if (data.tableId) {
      // If workspaceId is missing but we have tableId, we might need to fetch it or guess?
      // For now, let's assume valid notifications include workspaceId.
      // Or if the app supports /board/[tableId] (which it doesn't seem to, explicitly)
      // We can try to rely on "last workspace" logic if user was there? Unreliable.
      console.warn("Notification missing workspaceId", notif);
    }

    // Add task and tab context
    if (url) {
      if (data.taskId) {
        url += `&taskId=${data.taskId}`;
      }

      if (type === 'chat_message' || type === 'task_chat') {
        url += `&tab=chat`;
      } else if (type === 'file_comment') {
        url += `&tab=files`;
      } else if (type === 'automation') {
        // Automation usually related to a task
      }

      router.push(url);
    }
  };


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invite': return <PersonIcon sx={{ fontSize: 16 }} />;
      case 'automation': return <NotificationsNoneIcon sx={{ fontSize: 16 }} />;
      case 'chat_message': return <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />;
      case 'file_comment': return <CommentIcon sx={{ fontSize: 16 }} />;
      case 'task_chat': return <CommentIcon sx={{ fontSize: 16 }} />;
      default: return <NotificationsNoneIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'invite': return '#6366f1'; // Indigo
      case 'automation': return '#10b981'; // Emerald
      case 'chat_message': return '#ec4899'; // Pink
      case 'file_comment': return '#f59e0b'; // Amber
      case 'task_chat': return '#8b5cf6'; // Violet
      default: return theme.palette.text.secondary; // Slate
    }
  };

  const renderNotificationContent = (notif: Notification) => {
    const { type, data } = notif;

    if (type === 'invite' && data) {
      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>Table Invite</Typography>
          <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
            User requested to share table <strong>{data.tableName}</strong> with you.
          </Box>
        </>
      );
    }

    if (type === 'automation' && data) {
      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>Automation Alert</Typography>
          <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
            {data.subject}
          </Box>
          {data.body && (
            <Box component="pre" sx={{
              color: theme.palette.text.secondary,
              fontWeight: 500,
              fontSize: '0.7rem',
              mt: 0.5,
              mb: 0,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              maxHeight: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {data.body}
            </Box>
          )}
        </>
      );
    }

    if (type === 'chat_message' && data) {
      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>New Chat Message</Typography>
          <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
            <strong>{data.tableName}</strong>: {data.body}
          </Box>
        </>
      );
    }

    if ((type === 'task_chat' || type === 'file_comment') && data) {
      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>{data.subject}</Typography>
          <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
            {data.body}
          </Box>
        </>
      );
    }

    // Handle legacy or generic notifications
    return (
      <>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>Notification</Typography>
        <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
          {data?.subject || data?.body || 'You have a new notification'}
        </Box>
      </>
    );
  };


  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Search and Actions State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Invite Dialog State
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUserForInvite, setSelectedUserForInvite] = useState<any>(null);
  const [userTables, setUserTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");

  // User Preview Dialog State
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUser, setPreviewUser] = useState<any>(null);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await authenticatedFetch(getApiUrl(`people?q=${encodeURIComponent(searchQuery)}`));
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddFriend = async (friendId: string) => {
    try {
      const res = await authenticatedFetch(getApiUrl('friends/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId })
      });
      if (res.ok) {
        alert("Friend request sent!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send friend request");
      }
    } catch (err) {
      console.error("Add friend failed", err);
    }
  };

  const handleOpenInvite = async (user: any) => {
    setSelectedUserForInvite(user);
    try {
      const res = await authenticatedFetch(getApiUrl('tables'));
      if (res.ok) {
        const data = await res.json();
        setUserTables(data);
        setInviteDialogOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch tables", err);
    }
  };

  const handleSendInvite = async () => {
    if (!selectedTableId || !selectedUserForInvite) return;
    try {
      const res = await authenticatedFetch(getApiUrl(`tables/${selectedTableId}/share`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserForInvite.id, permission: 'edit' })
      });
      if (res.ok) {
        alert("Invitation sent!");
        setInviteDialogOpen(false);
      }
    } catch (err) {
      console.error("Invite failed", err);
    }
  };


  return (
    <Box
      component="header"
      sx={{
        width: "100%",
        height: { xs: 60, sm: 72 },
        bgcolor: theme.palette.background.default,
        display: "flex",
        alignItems: "center",
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: { xs: 2, md: 4, lg: 6 },
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        // Glass effect if scrolled could be nice, but stick to solid for now to match request
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {onMenuClick && (
          <IconButton
            onClick={onMenuClick}
            sx={{
              color: theme.palette.text.primary,
              display: { md: 'none' },
              mr: 1
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {/* Right Side Options */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
          bgcolor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
          p: 0.5,
          pl: 2,
          pr: 1,
          borderRadius: "30px",
          border: `1px solid ${theme.palette.divider}`
        }}
      >

        {/* Theme Toggle */}
        <Tooltip title={mode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          <StyledIconButton size="small" onClick={toggleTheme}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </StyledIconButton>
        </Tooltip>

        <Box sx={{ width: 1, height: 24, bgcolor: theme.palette.divider, mx: 0.5 }} />

        <Autocomplete
          freeSolo
          options={searchResults}
          getOptionLabel={(option: any) => option.name || ""}
          inputValue={searchQuery}
          onInputChange={(e, newValue) => setSearchQuery(newValue)}
          onChange={(event, newValue: any) => {
            if (newValue) {
              setPreviewUser(newValue);
              setPreviewDialogOpen(true);
              setSearchQuery("");
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Search users..."
              variant="standard"
              sx={{ width: { xs: 150, sm: 250 }, px: 1 }}
              InputProps={{
                ...params.InputProps,
                disableUnderline: true,
                startAdornment: (
                  <SearchIcon fontSize="small" sx={{ mr: 1, color: theme.palette.text.secondary }} />
                ),
              }}
            />
          )}
          renderOption={(props, option: any) => {
            const { key, ...optionProps } = props;
            return (
              <li key={key} {...optionProps} style={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, py: 1, px: 1 }}>
                  <Avatar
                    src={option.avatar}
                    sx={{
                      width: 40, height: 40,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="text.primary">{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5 }}>{option.email}</Typography>
                  </Box>
                </Box>
              </li>
            );
          }}
        />

        <Tooltip title="Notifications">
          <IconButton
            size="small"
            onClick={handleNotifOpen}
            sx={{
              color: theme.palette.text.secondary,
              transition: "all 0.2s",
              "&:hover": { color: theme.palette.text.primary, backgroundColor: theme.palette.action.hover }
            }}
          >
            <Badge badgeContent={unreadCount} max={99} color="error" invisible={unreadCount === 0}>
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={notifAnchorEl}
          open={Boolean(notifAnchorEl)}
          onClose={handleNotifClose}
          PaperProps={{
            sx: {
              width: 380,
              maxHeight: 500,
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
              mt: 1,
              overflowY: 'auto'
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight={600}>Updates & Messages</Typography>
            {unreadCount > 0 && <Box component="span" sx={{ fontSize: '0.7rem', color: theme.palette.primary.main }}>Marked as read</Box>}
          </Box>
          <List sx={{ p: 0 }}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <NotificationsNoneIcon sx={{ color: theme.palette.text.disabled, fontSize: 40 }} />
                <Typography variant="body2" color="text.secondary">You're all caught up!</Typography>
              </Box>
            ) : (
              notifications.map((notif) => (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 1,
                    py: 2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    whiteSpace: 'normal',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: theme.palette.action.hover }
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                    <Avatar sx={{
                      width: 32,
                      height: 32,
                      bgcolor: getNotificationColor(notif.type),
                      color: 'text.primary',
                      border: `2px solid ${theme.palette.background.paper}`
                    }}>
                      {getNotificationIcon(notif.type)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      {renderNotificationContent(notif)}
                      <Typography variant="caption" sx={{ color: theme.palette.text.disabled, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
                        {new Date(notif.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    {!notif.read && (
                      <Box sx={{ width: 8, height: 8, bgcolor: theme.palette.primary.main, borderRadius: '50%', mt: 1 }} />
                    )}
                  </Box>

                  {notif.type === 'invite' && (
                    <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-end', mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={(e) => { e.stopPropagation(); handleInviteAction(notif.id, 'decline'); }}
                        sx={{ fontSize: '0.75rem', py: 0.25, minWidth: 70 }}
                      >
                        Decline
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={(e) => { e.stopPropagation(); handleInviteAction(notif.id, 'accept'); }}
                        sx={{ fontSize: '0.75rem', py: 0.25, minWidth: 70 }}
                      >
                        Accept
                      </Button>
                    </Box>
                  )}
                </MenuItem>
              ))
            )}
          </List>
        </Menu>

        <Tooltip title="Messages">
          <StyledIconButton size="small" onClick={() => router.push('/chat')}>
            <MailOutlineIcon fontSize="small" />
          </StyledIconButton>
        </Tooltip>

        <Tooltip title="Help">
          <StyledIconButton size="small">
            <HelpOutlineIcon fontSize="small" />
          </StyledIconButton>
        </Tooltip>

        <Box sx={{ width: 1, height: 24, bgcolor: theme.palette.divider, mx: 0.5 }} />

        <Tooltip title="Account settings">
          <IconButton
            onClick={handleClick}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={open ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <Avatar
              src={getAvatarUrl(user?.avatar, user?.name)}
              sx={{
                width: 36,
                height: 36,
                bgcolor: theme.palette.primary.main,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                border: `2px solid ${theme.palette.background.default}`,
                boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
                transition: "all 0.2s",
                "&:hover": {
                  transform: "scale(1.05)"
                }
              }}
            />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: theme.palette.background.paper,
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => router.push('/settings?tab=profile')}>
            <ListItemIcon>
              <PersonIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => router.push('/settings?tab=appearance')}>
            <ListItemIcon>
              <PaletteIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            </ListItemIcon>
            Appearance
          </MenuItem>
          <MenuItem onClick={() => router.push('/settings?tab=notifications')}>
            <ListItemIcon>
              <NotificationsNoneIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            </ListItemIcon>
            Notifications
          </MenuItem>
          <MenuItem onClick={() => router.push('/settings?tab=security')}>
            <ListItemIcon>
              <SecurityIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            </ListItemIcon>
            Security
          </MenuItem>
          <MenuItem onClick={() => router.push('/settings?tab=team')}>
            <ListItemIcon>
              <GroupIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            </ListItemIcon>
            Team
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Box>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Invite to Table</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select a table to invite <strong>{selectedUserForInvite?.name}</strong> to.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Table</InputLabel>
            <MuiSelect
              value={selectedTableId}
              label="Table"
              onChange={(e) => setSelectedTableId(e.target.value)}
            >
              {userTables.map((table) => (
                <MuiMenuItem key={table.id} value={table.id}>
                  {table.name}
                </MuiMenuItem>
              ))}
            </MuiSelect>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSendInvite} variant="contained" disabled={!selectedTableId}>
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            bgcolor: theme.palette.background.paper
          }
        }}
      >
        <Box sx={{
          position: 'relative',
          height: 120,
          background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
        }}>
          <IconButton
            size="small"
            onClick={() => setPreviewDialogOpen(false)}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              color: '#fff',
              bgcolor: alpha('#000', 0.2),
              '&:hover': { bgcolor: alpha('#000', 0.3) }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 0, pb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: -7 }}>
            <Avatar
              src={previewUser?.avatar}
              sx={{
                width: 120,
                height: 120,
                border: `6px solid ${theme.palette.background.paper}`,
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
              }}
            />
            <Typography variant="h5" sx={{ mt: 2, fontWeight: 800, color: theme.palette.text.primary }}>
              {previewUser?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 4, fontWeight: 500 }}>
              <EmailIcon sx={{ fontSize: 16 }} /> {previewUser?.email}
            </Typography>

            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => handleAddFriend(previewUser.id)}
                sx={{
                  borderRadius: 3,
                  py: 1.2,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                }}
              >
                Add Friend
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ChatBubbleOutlineIcon />}
                onClick={() => {
                  setPreviewDialogOpen(false);
                  router.push(`/chat?userId=${previewUser.id}`);
                }}
                sx={{
                  borderRadius: 3,
                  py: 1.2,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Send Message
              </Button>
              <Button
                fullWidth
                variant="text"
                startIcon={<GroupAddIcon />}
                onClick={() => {
                  setPreviewDialogOpen(false);
                  handleOpenInvite(previewUser);
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: theme.palette.text.secondary
                }}
              >
                Invite to Table
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
export default TopBar;
