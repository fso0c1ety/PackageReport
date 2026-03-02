"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Box, Avatar, IconButton, Badge, Tooltip, Typography, Menu, MenuItem, ListItemIcon, Button, List } from "@mui/material";
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CommentIcon from "@mui/icons-material/Comment";
import { styled } from "@mui/material/styles";
import { useRouter } from 'next/navigation';
import { authenticatedFetch, getApiUrl } from "./apiUrl";

interface TopBarProps {
  onMenuClick?: () => void;
}

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: "#94a3b8",
  transition: "all 0.2s",
  "&:hover": {
    color: "#fff",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<any>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
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
                setUnreadCount(data.length);
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
          default: return '#64748b'; // Slate
      }
  };

  const renderNotificationContent = (notif: Notification) => {
      const { type, data } = notif;
      
      if (type === 'invite' && data) {
          return (
              <>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Table Invite</Typography>
                  <Box component="span" sx={{ color: '#d0d4e4', display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
                    User requested to share table <strong>{data.tableName}</strong> with you.
                  </Box>
              </>
          );
      }
      
      if (type === 'automation' && data) {
          return (
              <>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Automation Alert</Typography>
                  <Box component="span" sx={{ color: '#d0d4e4', display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
                    {data.subject}
                  </Box>
              </>
          );
      }

      if (type === 'chat_message' && data) {
          return (
              <>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>New Chat Message</Typography>
                  <Box component="span" sx={{ color: '#d0d4e4', display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
                    <strong>{data.tableName}</strong>: {data.body}
                  </Box>
              </>
          );
      }

      if ((type === 'task_chat' || type === 'file_comment') && data) {
          return (
              <>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{data.subject}</Typography>
                  <Box component="span" sx={{ color: '#d0d4e4', display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
                    {data.body}
                  </Box>
              </>
          );
      }
      
      // Handle legacy or generic notifications
      return (
            <>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Notification</Typography>
                <Box component="span" sx={{ color: '#d0d4e4', display: 'block', lineHeight: 1.4, fontSize: '0.75rem' }}>
                    {data?.subject || data?.body || 'You have a new notification'}
                </Box>
            </>
      );
  };


  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };


  return (
    <Box
      component="header"
      sx={{
        width: "100%",
        height: { xs: 60, sm: 72 },
        bgcolor: "#23243a", // Match app background
        display: "flex",
        alignItems: "center",
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
              color: '#fff',
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
          bgcolor: "rgba(255, 255, 255, 0.03)",
          p: 0.5,
          pl: 2,
          pr: 1,
          borderRadius: "30px",
          border: "1px solid rgba(255, 255, 255, 0.05)"
        }}
      >
        <Tooltip title="Search">
          <StyledIconButton size="small">
            <SearchIcon fontSize="small" />
          </StyledIconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton 
            size="small"
            onClick={handleNotifOpen}
            sx={{
                color: "#94a3b8",
                transition: "all 0.2s",
                "&:hover": { color: "#fff", backgroundColor: "rgba(255, 255, 255, 0.05)" }
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
                    bgcolor: '#1e1f2b', 
                    color: '#fff', 
                    border: '1px solid #3a3b5a',
                    mt: 1,
                    overflowY: 'auto'
                }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #3a3b5a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" fontWeight={600}>Updates & Messages</Typography>
                {unreadCount > 0 && <Box component="span" sx={{ fontSize: '0.7rem', color: '#6366f1' }}>Marked as read</Box>}
            </Box>
            <List sx={{ p: 0 }}>
                {notifications.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <NotificationsNoneIcon sx={{ color: '#3a3b5a', fontSize: 40 }} />
                        <Typography variant="body2" color="#7d82a8">You're all caught up!</Typography>
                    </Box>
                ) : (
                    notifications.map((notif) => (
                        <MenuItem 
                            key={notif.id} 
                            onClick={handleNotifClose}
                            sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'flex-start', 
                                gap: 1, 
                                py: 2,
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                whiteSpace: 'normal',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                            }}
                        >
                            <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                                <Avatar sx={{ 
                                    width: 32, 
                                    height: 32, 
                                    bgcolor: getNotificationColor(notif.type), 
                                    color: '#fff',
                                    border: '2px solid #1e1f2b'
                                }}>
                                    {getNotificationIcon(notif.type)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    {renderNotificationContent(notif)}
                                    <Typography variant="caption" sx={{ color: '#7d82a8', mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
                                        {new Date(notif.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </Box>
                                    {!notif.read && (
                                        <Box sx={{ width: 8, height: 8, bgcolor: '#6366f1', borderRadius: '50%', mt: 1 }} />
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
                                        sx={{ fontSize: '0.75rem', py: 0.25, minWidth: 70, bgcolor: '#6366f1' }}
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
          <StyledIconButton size="small">
            <MailOutlineIcon fontSize="small" />
          </StyledIconButton>
        </Tooltip>

        <Tooltip title="Help">
          <StyledIconButton size="small">
            <HelpOutlineIcon fontSize="small" />
          </StyledIconButton>
        </Tooltip>

        <Box sx={{ width: 1, height: 24, bgcolor: "rgba(255,255,255,0.1)", mx: 0.5 }} />

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
              src={user?.avatar}
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#6366f1',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                border: '2px solid rgba(35, 36, 58, 1)',
                boxShadow: '0 0 0 2px #6366f1',
                transition: "all 0.2s",
                "&:hover": {
                  transform: "scale(1.05)"
                }
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
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
              bgcolor: '#2b2c40',
              color: '#fff',
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
                bgcolor: '#2b2c40',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => router.push('/settings')}>
            <ListItemIcon>
              <PersonIcon fontSize="small" sx={{ color: '#fff' }} />
            </ListItemIcon>
            Profile Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: '#fff' }} />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};
export default TopBar;
