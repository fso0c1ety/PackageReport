"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Box, Avatar, IconButton, Badge, Tooltip, Typography, Menu, MenuItem, ListItemIcon, Button, List, useTheme, Divider, alpha } from "@mui/material";
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CommentIcon from "@mui/icons-material/Comment";
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PaletteIcon from '@mui/icons-material/Palette';
import SecurityIcon from '@mui/icons-material/Security';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { styled } from "@mui/material/styles";
import { useRouter } from 'next/navigation';
import { authenticatedFetch, getApiUrl, getAvatarUrl } from "./apiUrl";
import { useThemeContext } from "./ThemeContext";
import UserProfileDialog from "./UserProfileDialog";

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
  const [user, setUser] = useState<null | any>(null);
  const open = Boolean(anchorEl);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    const fetchProfile = async () => {
      try {
        const res = await authenticatedFetch(getApiUrl('users/profile'));
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            localStorage.setItem('user', JSON.stringify({ ...parsed, ...data }));
          }
        }
      } catch (e) {}
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
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleInviteAction = async (notifId: string, action: 'accept' | 'decline') => {
      try {
          const res = await authenticatedFetch(getApiUrl(`notifications/${notifId}/${action}`), { method: 'POST' });
          if (res.ok) {
              setNotifications(prev => prev.filter(n => n.id !== notifId));
              setUnreadCount(prev => Math.max(0, prev - 1));
          }
      } catch (error) {
          console.error(`Failed to ${action} invite`, error);
      }
  };

  const handleSocialRequest = async (requestId: string, action: 'accept' | 'reject', notifId: string) => {
    const url = getApiUrl(`friends/requests/${requestId}/${action}`);
    console.log(`[Social] Calling ${action} on ${url}`);
    try {
        const res = await authenticatedFetch(url, { method: 'POST' });
        if (res.ok) {
            setNotifications(prev => prev.filter(n => n.id !== notifId));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
            const errData = await res.json();
            console.error(`[Social] ${action} failed:`, errData);
        }
    } catch (error) {
        console.error(`Failed to ${action} friend request`, error);
    }
  };

  const handleNotifOpen = async (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(e.currentTarget);
    if (unreadCount > 0) {
        try {
            await authenticatedFetch(getApiUrl('notifications/mark-read'), { method: 'POST' });
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
      const { type, data } = notif;
      if (!data) return;

      if (type === 'friend_request' || type === 'friend_accepted') {
          router.push('/chat');
          return;
      }

      let url = "";
      if (data.workspaceId) {
          url = `/workspace?id=${data.workspaceId}`;
          if (data.tableId) url += `&tableId=${data.tableId}`;
      }
      if (url) {
          if (data.taskId) url += `&taskId=${data.taskId}`;
          if (type === 'chat_message' || type === 'task_chat') url += `&tab=chat`;
          else if (type === 'file_comment') url += `&tab=files`;
          router.push(url);
      }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
    }
    const timer = setTimeout(async () => {
        setSearching(true);
        try {
            const res = await authenticatedFetch(getApiUrl(`people?q=${encodeURIComponent(searchQuery)}`));
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            }
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setSearching(false);
        }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUserClick = (targetUser: any) => {
      setSelectedUser(targetUser);
      setProfileOpen(true);
      setSearchQuery("");
      setSearchResults([]);
  };

  const getNotificationIcon = (type: string) => {
      switch (type) {
          case 'invite':
          case 'friend_request': return <PersonAddIcon sx={{ fontSize: 18 }} />;
          case 'friend_accepted': return <CheckCircleIcon sx={{ fontSize: 18 }} />;
          case 'automation': return <NotificationsNoneIcon sx={{ fontSize: 16 }} />;
          case 'chat_message': return <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />;
          case 'file_comment': return <CommentIcon sx={{ fontSize: 16 }} />;
          case 'task_chat': return <CommentIcon sx={{ fontSize: 16 }} />;
          default: return <NotificationsNoneIcon sx={{ fontSize: 18 }} />;
      }
  };

  const getNotificationColor = (type: string) => {
      switch (type) {
          case 'invite': return '#6366f1';
          case 'friend_request': return theme.palette.info.main;
          case 'friend_accepted': return theme.palette.success.main;
          case 'automation': return '#10b981';
          case 'chat_message': return '#ec4899';
          case 'file_comment': return '#f59e0b';
          case 'task_chat': return '#8b5cf6';
          default: return theme.palette.text.secondary;
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
                      <Box component="pre" sx={{ color: theme.palette.text.secondary, fontWeight: 500, fontSize: '0.7rem', mt: 0.5, mb: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', maxHeight: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
      if (type === 'friend_request' && data) {
          return (
              <>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>Friend Request</Typography>
                  <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
                    {data.body}
                  </Box>
              </>
          );
      }
      if (type === 'friend_accepted' && data) {
          return (
              <>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>New Friend</Typography>
                  <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
                    {data.body}
                  </Box>
              </>
          );
      }
      return (
            <>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>Notification</Typography>
                <Box component="span" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
                    {data?.subject || data?.body || 'You have a new notification'}
                </Box>
            </>
      );
  };

  return (
    <Box component="header" sx={{ width: "100%", height: { xs: 60, sm: 72 }, bgcolor: theme.palette.background.default, display: "flex", alignItems: "center", borderBottom: `1px solid ${theme.palette.divider}`, px: { xs: 2, md: 4, lg: 6 }, justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {onMenuClick && (
          <IconButton onClick={onMenuClick} sx={{ color: theme.palette.text.primary, display: { md: 'none' }, mr: 1 }}>
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, bgcolor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)", p: 0.5, pl: 2, pr: 1, borderRadius: "30px", border: `1px solid ${theme.palette.divider}` }}>
        <Tooltip title={mode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          <StyledIconButton size="small" onClick={toggleTheme}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </StyledIconButton>
        </Tooltip>

        <Box sx={{ width: 1, height: 24, bgcolor: theme.palette.divider, mx: 0.5 }} />

        <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", bgcolor: alpha(theme.palette.text.primary, 0.05), borderRadius: "20px", px: 1.5, py: 0.5, border: "1px solid", borderColor: searchQuery ? theme.palette.primary.main : "transparent", transition: "all 0.2s", width: { xs: 40, sm: 180, md: 240 }, overflow: "hidden" }}>
            <SearchIcon sx={{ fontSize: 18, color: theme.palette.text.secondary, mr: 1 }} />
            <input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: "transparent", border: "none", color: theme.palette.text.primary, fontSize: "0.8rem", width: "100%", outline: "none" }} />
          </Box>
          {searchResults.length > 0 && (
            <Box sx={{ position: "absolute", top: "120%", left: 0, width: "100%", bgcolor: theme.palette.background.paper, boxShadow: theme.shadows[8], borderRadius: 2, border: `1px solid ${theme.palette.divider}`, zIndex: 1000, maxHeight: 300, overflowY: "auto" }}>
              <List sx={{ p: 0 }}>
                {searchResults.map((result) => (
                  <MenuItem key={result.id} onClick={() => handleUserClick(result)} sx={{ gap: 1.5, py: 1 }}>
                    <Avatar src={getAvatarUrl(result.avatar, result.name)} sx={{ width: 28, height: 28 }} />
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{result.name}</Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: "block" }} noWrap>{result.email}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </List>
            </Box>
          )}
        </Box>

        <Tooltip title="Notifications">
          <IconButton size="small" onClick={handleNotifOpen} sx={{ color: theme.palette.text.secondary, transition: "all 0.2s", "&:hover": { color: theme.palette.text.primary, backgroundColor: theme.palette.action.hover } }}>
            <Badge badgeContent={unreadCount} max={99} color="error" invisible={unreadCount === 0}>
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
        
        <Menu anchorEl={notifAnchorEl} open={Boolean(notifAnchorEl)} onClose={handleNotifClose} PaperProps={{ sx: { width: 380, maxHeight: 500, bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, border: `1px solid ${theme.palette.divider}`, mt: 1, overflowY: 'auto' } }} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" fontWeight={600}>Updates & Messages</Typography>
            </Box>
            <List sx={{ p: 0 }}>
                {notifications.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <NotificationsNoneIcon sx={{ color: theme.palette.text.disabled, fontSize: 40 }} />
                        <Typography variant="body2" color="text.secondary">You're all caught up!</Typography>
                    </Box>
                ) : (
                    notifications.map((notif) => (
                        <MenuItem key={notif.id} onClick={() => handleNotificationClick(notif)} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, whiteSpace: 'normal', transition: 'all 0.2s', '&:hover': { bgcolor: theme.palette.action.hover } }}>
                            <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: getNotificationColor(notif.type), color: '#fff', border: `2px solid ${theme.palette.background.paper}` }}>
                                    {getNotificationIcon(notif.type)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    {renderNotificationContent(notif)}
                                    <Typography variant="caption" sx={{ color: theme.palette.text.disabled, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
                                        {new Date(notif.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </Box>
                                {!notif.read && <Box sx={{ width: 8, height: 8, bgcolor: theme.palette.primary.main, borderRadius: '50%', mt: 1 }} />}
                            </Box>
                            {(notif.type === 'invite' || notif.type === 'friend_request') && (
                                <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-end', mt: 1 }}>
                                    <Button size="small" variant="outlined" color="error" onClick={(e) => { e.stopPropagation(); if (notif.type === 'friend_request') handleSocialRequest(notif.data.requestId, 'reject', notif.id); else handleInviteAction(notif.id, 'decline'); }} sx={{ fontSize: '0.75rem', py: 0.25, minWidth: 70 }}>Ignore</Button>
                                    <Button size="small" variant="contained" color="primary" onClick={(e) => { e.stopPropagation(); if (notif.type === 'friend_request') handleSocialRequest(notif.data.requestId, 'accept', notif.id); else handleInviteAction(notif.id, 'accept'); }} sx={{ fontSize: '0.75rem', py: 0.25, minWidth: 70 }}>Accept</Button>
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

        <Box sx={{ width: 1, height: 24, bgcolor: theme.palette.divider, mx: 0.5 }} />

        <Tooltip title="Account settings">
          <IconButton onClick={handleClick} size="small" sx={{ ml: 2 }}>
            <Avatar src={getAvatarUrl(user?.avatar, user?.name)} sx={{ width: 36, height: 36, bgcolor: theme.palette.primary.main, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: `2px solid ${theme.palette.background.default}`, boxShadow: `0 0 0 2px ${theme.palette.primary.main}`, transition: "all 0.2s", "&:hover": { transform: "scale(1.05)" } }} />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose} onClick={handleClose} PaperProps={{ elevation: 0, sx: { overflow: 'visible', filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))', mt: 1.5, bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, '& .MuiAvatar-root': { width: 32, height: 32, ml: -0.5, mr: 1 }, '&:before': { content: '""', display: 'block', position: 'absolute', top: 0, right: 14, width: 10, height: 10, bgcolor: theme.palette.background.paper, transform: 'translateY(-50%) rotate(45deg)', zIndex: 0 } } }} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          <MenuItem onClick={() => router.push('/settings?tab=profile')}><ListItemIcon><PersonIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} /></ListItemIcon>Profile</MenuItem>
          <MenuItem onClick={() => router.push('/settings?tab=appearance')}><ListItemIcon><PaletteIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} /></ListItemIcon>Appearance</MenuItem>
          <MenuItem onClick={() => router.push('/settings?tab=notifications')}><ListItemIcon><NotificationsNoneIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} /></ListItemIcon>Notifications</MenuItem>
          <MenuItem onClick={() => router.push('/settings?tab=security')}><ListItemIcon><SecurityIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} /></ListItemIcon>Security</MenuItem>
          <MenuItem onClick={() => router.push('/settings?tab=team')}><ListItemIcon><GroupIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} /></ListItemIcon>Team</MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}><ListItemIcon><LogoutIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} /></ListItemIcon>Logout</MenuItem>
        </Menu>
      </Box>

      <UserProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} user={selectedUser} />
    </Box>
  );
};
export default TopBar;
