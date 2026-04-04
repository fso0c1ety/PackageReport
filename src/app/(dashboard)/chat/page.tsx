"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Typography, Avatar, TextField, IconButton, Paper, List, ListItem, useTheme, alpha, CircularProgress, Button, Badge, Tooltip } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import MarkChatUnreadIcon from "@mui/icons-material/MarkChatUnread";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import Dialog from "@mui/material/Dialog";
import { authenticatedFetch, getApiUrl, getAvatarUrl, navigateToAppRoute } from "../../apiUrl";
import { useCallContext } from "../../CallContext";
import dayjs from "dayjs";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("[Chat] ErrorBoundary caught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="error">Something went wrong in the Chat.</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>{this.state.error?.message}</Typography>
                    <IconButton size="small" onClick={() => window.location.reload()} sx={{ mt: 2 }}><ArrowBackIcon /></IconButton>
                </Box>
            );
        }
        return this.props.children;
    }
}

function ChatContent() {
    const theme = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const otherUserId = searchParams.get("userId");
    
    useEffect(() => {
        console.log("[Chat] Component mounted, otherUserId:", otherUserId);
    }, [otherUserId]);

    const [conversations, setConversations] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const tabParam = searchParams.get("tab");
    const [activeTab, setActiveTab] = useState<"chats" | "social">(tabParam === "social" ? "social" : "chats");
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(true);
    const [socialLoading, setSocialLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const parsed = JSON.parse(userStr);
                setCurrentUser(parsed);
                console.log("[Chat] Current user loaded:", parsed.id);
            }
        } catch (err) {
            console.error("[Chat] Failed to parse user from localStorage", err);
        }
    }, []);

    const { startCall } = useCallContext();

    const fetchConversations = async () => {
        try {
            const res = await authenticatedFetch(getApiUrl("chats"));
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        } finally {
            console.log("[Chat] Conversations fetched:", conversations.length);
            setListLoading(false);
        }
    };

    const fetchMessages = async () => {
        if (!otherUserId) return;
        try {
            const msgRes = await authenticatedFetch(getApiUrl(`chats/${otherUserId}`));
            if (msgRes.ok) {
                const data = await msgRes.json();
                setMessages(data);
            }

            // Also get user info if not already set or mismatched
            if (!otherUser || otherUser.id !== otherUserId) {
                const res = await authenticatedFetch(getApiUrl(`people/${otherUserId}`));
                if (res.ok) {
                    const user = await res.json();
                    setOtherUser(user);
                }
            }
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            console.log("[Chat] Messages fetched for:", otherUserId, "count:", messages.length);
            setLoading(false);
        }
    };

    const fetchSocial = async () => {
        try {
            const [friendsRes, requestsRes] = await Promise.all([
                authenticatedFetch(getApiUrl("friends")),
                authenticatedFetch(getApiUrl("friends/pending"))
            ]);
            if (friendsRes.ok) setFriends(await friendsRes.json());
            if (requestsRes.ok) setPendingRequests(await requestsRes.json());
        } catch (err) {
            console.error("Failed to fetch social data", err);
        } finally {
            setSocialLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            const res = await authenticatedFetch(getApiUrl(`friends/${requestId}/accept`), { method: 'PUT' });
            if (res.ok) fetchSocial();
        } catch (err) { console.error("Accept failed", err); }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            const res = await authenticatedFetch(getApiUrl(`friends/${requestId}`), { method: 'DELETE' });
            if (res.ok) fetchSocial();
        } catch (err) { console.error("Reject failed", err); }
    };

    useEffect(() => {
        fetchConversations();
        fetchSocial();
        const interval = setInterval(() => {
            fetchConversations();
            fetchSocial();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!otherUserId) {
            setMessages([]);
            setOtherUser(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [otherUserId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !otherUserId) return;

        const msg = {
            id: Date.now().toString(),
            text: newMessage,
            sender_id: currentUser?.id,
            recipient_id: otherUserId,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, msg]);
        setNewMessage("");

        try {
            await authenticatedFetch(getApiUrl(`chats/${otherUserId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newMessage })
            });
            fetchConversations(); // Update last message in list
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 72px)', bgcolor: 'transparent', position: 'relative' }}>
                {/* Conversations / Social List */}
                <Box sx={{
                    width: { xs: otherUserId ? 0 : '100%', sm: 340 },
                    display: { xs: otherUserId ? 'none' : 'block', sm: 'block' },
                    borderRight: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.mode === 'dark' ? alpha('#13141f', 0.8) : alpha('#ffffff', 0.8),
                    backdropFilter: 'blur(20px)',
                    overflowY: 'auto',
                    boxShadow: '2px 0 10px rgba(0,0,0,0.02)',
                    zIndex: 10,
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: alpha(theme.palette.text.primary, 0.1), borderRadius: 3 },
                    '&::-webkit-scrollbar-thumb:hover': { background: alpha(theme.palette.text.primary, 0.2) }
                }}>
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Typography variant="h5" fontWeight={800} sx={{ 
                            letterSpacing: -0.5,
                            background: theme.palette.mode === 'dark' ? 'linear-gradient(45deg, #fff, #a5a5b0)' : 'linear-gradient(45deg, #1a1a24, #4a4a5a)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>Direct Messages</Typography>
                        
                        {/* Tab Switcher */}
                        <Box sx={{ 
                            display: 'flex', 
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', 
                            borderRadius: 3, 
                            p: 0.5,
                            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                        }}>
                            <Button 
                                fullWidth 
                                size="small"
                                onClick={() => setActiveTab("chats")}
                                sx={{ 
                                    borderRadius: 2.5, 
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    bgcolor: activeTab === "chats" ? (theme.palette.mode === 'dark' ? '#2d2e3d' : '#ffffff') : 'transparent',
                                    color: activeTab === "chats" ? (theme.palette.mode === 'dark' ? '#fff' : '#1a1a24') : theme.palette.text.secondary,
                                    boxShadow: activeTab === "chats" ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.3s ease',
                                    '&:hover': { bgcolor: activeTab === "chats" ? (theme.palette.mode === 'dark' ? '#3d3e4d' : '#f0f0f0') : alpha(theme.palette.text.primary, 0.05) }
                                }}
                            >
                                Messages
                            </Button>
                            <Button 
                                fullWidth 
                                size="small"
                                onClick={() => setActiveTab("social")}
                                sx={{ 
                                    borderRadius: 2.5, 
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    bgcolor: activeTab === "social" ? (theme.palette.mode === 'dark' ? '#2d2e3d' : '#ffffff') : 'transparent',
                                    color: activeTab === "social" ? (theme.palette.mode === 'dark' ? '#fff' : '#1a1a24') : theme.palette.text.secondary,
                                    boxShadow: activeTab === "social" ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.3s ease',
                                    '&:hover': { bgcolor: activeTab === "social" ? (theme.palette.mode === 'dark' ? '#3d3e4d' : '#f0f0f0') : alpha(theme.palette.text.primary, 0.05) }
                                }}
                            >
                                <Badge badgeContent={pendingRequests.length} color="error" variant="dot" invisible={pendingRequests.length === 0} sx={{ '& .MuiBadge-dot': { right: -4, top: 4 } }}>
                                    Social
                                </Badge>
                            </Button>
                        </Box>
                    </Box>

                    {activeTab === "chats" ? (
                        <List sx={{ p: 0 }}>
                            {listLoading ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
                            ) : conversations.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Avatar sx={{ width: 48, height: 48, mx: 'auto', mb: 2, bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                                        <MarkChatUnreadIcon sx={{ color: theme.palette.text.disabled }} />
                                    </Avatar>
                                    <Typography variant="body2" color="text.secondary">No conversations yet</Typography>
                                </Box>
                            ) : (
                                conversations.map((conv) => (
                                    <ListItem
                                        key={conv.id}
                                        onClick={() => navigateToAppRoute(`/chat?userId=${conv.id}`, router)}
                                        sx={{
                                            px: 3, py: 2,
                                            cursor: 'pointer',
                                            bgcolor: otherUserId === conv.id ? (theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)') : 'transparent',
                                            '&:hover': { bgcolor: otherUserId === conv.id ? (theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)') : alpha(theme.palette.action.hover, 0.08) },
                                            transition: 'all 0.2s',
                                            borderLeft: otherUserId === conv.id ? `4px solid #6366f1` : '4px solid transparent',
                                            position: 'relative',
                                            '&::after': {
                                                content: '""',
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 80,
                                                right: 24,
                                                height: '1px',
                                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                                display: otherUserId === conv.id ? 'none' : 'block'
                                            }
                                        }}
                                    >
                                        <Badge
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            variant="dot"
                                            sx={{ '& .MuiBadge-dot': { bgcolor: '#10b981', border: `2px solid ${theme.palette.background.paper}`, width: 12, height: 12, borderRadius: '50%' } }}
                                        >
                                            <Avatar src={getAvatarUrl(conv.avatar, conv.name)} sx={{ mr: 2, width: 48, height: 48, border: `2px solid ${theme.palette.background.paper}`, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                                        </Badge>
                                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                                                <Typography variant="subtitle2" noWrap fontWeight={700} sx={{ color: theme.palette.text.primary }}>{conv.name}</Typography>
                                                <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: '0.7rem', fontWeight: 500 }}>
                                                    {dayjs(conv.timestamp).format('HH:mm')}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                                {conv.last_message || "No messages yet"}
                                            </Typography>
                                        </Box>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    ) : (
                        <Box sx={{ px: 1 }}>
                            {/* Pending Requests */}
                            {pendingRequests.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="overline" sx={{ px: 2, color: theme.palette.text.disabled, fontWeight: 700 }}>Pending Requests</Typography>
                                    <List>
                                        {pendingRequests.map((req) => (
                                            <ListItem key={req.request_id} sx={{ px: 2, gap: 1, flexDirection: 'column', alignItems: 'flex-start', mb: 1, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', width: 1, mt: 1 }}>
                                                    <Avatar src={getAvatarUrl(req.avatar, req.name)} sx={{ mr: 1, width: 32, height: 32 }} />
                                                    <Box sx={{ overflow: 'hidden' }}>
                                                        <Typography variant="body2" fontWeight={600} noWrap>{req.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{req.email}</Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 1, width: 1, mb: 1 }}>
                                                    <Button 
                                                        fullWidth 
                                                        size="small" 
                                                        variant="contained" 
                                                        onClick={() => handleAcceptRequest(req.request_id)}
                                                        sx={{ py: 0.2, textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                                                    >
                                                        Accept
                                                    </Button>
                                                    <Button 
                                                        fullWidth 
                                                        size="small" 
                                                        variant="outlined" 
                                                        onClick={() => handleRejectRequest(req.request_id)}
                                                        sx={{ py: 0.2, textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                                                    >
                                                        Ignore
                                                    </Button>
                                                </Box>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}

                            {/* Friends List */}
                            <Typography variant="overline" sx={{ px: 2, color: theme.palette.text.disabled, fontWeight: 700 }}>Friends</Typography>
                            <List sx={{ p: 0 }}>
                                {socialLoading ? (
                                    <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={16} /></Box>
                                ) : friends.length === 0 ? (
                                    <Box sx={{ p: 4, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">No friends yet</Typography>
                                    </Box>
                                ) : (
                                    friends.map((friend) => (
                                        <ListItem
                                            key={friend.id}
                                            sx={{
                                                px: 2, py: 1, borderRadius: 2, mb: 0.5,
                                                '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.04) }
                                            }}
                                        >
                                            <Avatar src={getAvatarUrl(friend.avatar, friend.name)} sx={{ mr: 1.5, width: 36, height: 36 }} />
                                            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                                <Typography variant="body2" fontWeight={600} noWrap>{friend.name}</Typography>
                                            </Box>
                                            <Tooltip title="Message">
                                                <IconButton size="small" onClick={() => navigateToAppRoute(`/chat/?userId=${friend.id}`, router)}>
                                                    <MarkChatUnreadIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Remove">
                                                <IconButton size="small" onClick={() => handleRejectRequest(friend.friendship_id)}>
                                                    <CloseIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </Box>
                    )}
                </Box>

                {/* Chat Area */}
                <Box sx={{
                    flexGrow: 1,
                    display: { xs: otherUserId ? 'flex' : 'none', sm: 'flex' },
                    flexDirection: 'column',
                    bgcolor: 'transparent',
                    backgroundImage: theme.palette.mode === 'dark' 
                        ? 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.05) 0%, transparent 70%)' 
                        : 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.03) 0%, transparent 70%)',
                    position: 'relative'
                }}>
                    {!otherUserId ? (
                        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3, p: 4, textAlign: 'center' }}>
                            <Box sx={{ 
                                width: 100, height: 100, 
                                borderRadius: '50%', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: theme.palette.mode === 'dark' ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))' : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02))',
                                boxShadow: theme.palette.mode === 'dark' ? 'inset 0 0 20px rgba(99,102,241,0.1)' : 'none',
                                border: `1px solid ${alpha('#6366f1', 0.2)}`
                            }}>
                                <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: '#6366f1' }} />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: theme.palette.text.primary }}>Your Messages</Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 300, mx: 'auto' }}>Select a user from the sidebar to start a private conversation</Typography>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            {/* Header */}
                            <Paper sx={{ 
                                p: { xs: 1.5, sm: 2.5 }, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 2.5, 
                                borderBottom: `1px solid ${theme.palette.divider}`, 
                                borderRadius: 0, 
                                bgcolor: theme.palette.mode === 'dark' ? alpha('#13141f', 0.9) : alpha('#ffffff', 0.9),
                                backdropFilter: 'blur(10px)',
                                zIndex: 10,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                            }} elevation={0}>
                                <IconButton sx={{ display: { xs: 'flex', sm: 'none' }, bgcolor: alpha(theme.palette.text.primary, 0.05) }} onClick={() => navigateToAppRoute('/chat', router)}>
                                    <ArrowBackIcon />
                                </IconButton>
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    variant="dot"
                                    sx={{ '& .MuiBadge-dot': { bgcolor: '#10b981', border: `2px solid ${theme.palette.background.paper}`, width: 12, height: 12, borderRadius: '50%' } }}
                                >
                                    <Avatar src={getAvatarUrl(otherUser?.avatar, otherUser?.name)} sx={{ width: 48, height: 48, border: `2px solid ${theme.palette.background.paper}`, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }} />
                                </Badge>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>{otherUser?.name || "Loading..."}</Typography>
                                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', display: 'inline-block' }} /> Online
                                    </Typography>
                                </Box>
                                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                                    {otherUserId !== currentUser?.id && (
                                        <>
                                            <Tooltip title="Audio Call">
                                                <IconButton onClick={() => startCall(otherUserId, false, otherUser)} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                                                    <LocalPhoneIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Video Call">
                                                <IconButton onClick={() => startCall(otherUserId, true, otherUser)} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                                                    <VideocamIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    )}
                                </Box>
                            </Paper>
                            
                            {/* Messages */}
                            <Box sx={{ 
                                flexGrow: 1, 
                                overflowY: 'auto', 
                                p: { xs: 2, sm: 4 }, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: 2.5,
                                '&::-webkit-scrollbar': { width: 6 },
                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                '&::-webkit-scrollbar-thumb': { background: alpha(theme.palette.text.primary, 0.1), borderRadius: 3 },
                            }}>
                                {loading && messages.length === 0 ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} sx={{ color: '#6366f1' }} /></Box>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isMe = msg.sender_id === currentUser?.id;
                                        return (
                                            <Box key={msg.id || idx} sx={{ 
                                                display: 'flex', 
                                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                alignItems: 'flex-end',
                                                gap: 1.5,
                                                mb: 0.5
                                            }}>
                                                {!isMe && (
                                                    <Avatar src={getAvatarUrl(otherUser?.avatar, otherUser?.name)} sx={{ width: 28, height: 28 }} />
                                                )}
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                                    <Box sx={{
                                                        p: 1.8,
                                                        px: 2.2,
                                                        background: isMe 
                                                            ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
                                                            : (theme.palette.mode === 'dark' ? '#1f202e' : '#ffffff'),
                                                        color: isMe ? '#ffffff' : theme.palette.text.primary,
                                                        borderRadius: isMe ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                                                        boxShadow: isMe 
                                                            ? '0 8px 16px rgba(99, 102, 241, 0.2), inset 0 2px 4px rgba(255,255,255,0.1)' 
                                                            : '0 4px 12px rgba(0,0,0,0.04), border 1px solid rgba(0,0,0,0.02)',
                                                        border: isMe ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                                                        position: 'relative',
                                                        transformOrigin: isMe ? 'bottom right' : 'bottom left',
                                                        animation: 'bubbleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                                                        '@keyframes bubbleIn': {
                                                            '0%': { opacity: 0, transform: 'scale(0.8)' },
                                                            '100%': { opacity: 1, transform: 'scale(1)' }
                                                        }
                                                    }}>
                                                        <Typography variant="body1" sx={{ wordBreak: 'break-word', lineHeight: 1.5, fontSize: '0.95rem' }}>{msg.text}</Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ mt: 0.8, px: 1, color: theme.palette.text.disabled, fontSize: '0.7rem', fontWeight: 500 }}>
                                                        {dayjs(msg.timestamp).format('h:mm A')}
                                                    </Typography>
                                                </Box>
                                                {isMe && (
                                                    <Avatar src={getAvatarUrl(currentUser?.avatar, currentUser?.name)} sx={{ width: 28, height: 28 }} />
                                                )}
                                            </Box>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </Box>

                            {/* Input */}
                            {otherUserId === currentUser?.id ? (
                                <Box sx={{ 
                                    p: 3, 
                                    bgcolor: theme.palette.mode === 'dark' ? alpha('#13141f', 0.9) : alpha('#ffffff', 0.9), 
                                    backdropFilter: 'blur(10px)',
                                    borderTop: `1px solid ${theme.palette.divider}`,
                                    textAlign: 'center',
                                    zIndex: 10
                                }}>
                                    <Typography color="text.secondary" variant="body2" fontWeight={500}>You cannot message yourself.</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ 
                                    p: { xs: 2, sm: 3 }, 
                                    bgcolor: theme.palette.mode === 'dark' ? alpha('#13141f', 0.9) : alpha('#ffffff', 0.9), 
                                    backdropFilter: 'blur(10px)',
                                    borderTop: `1px solid ${theme.palette.divider}`,
                                    zIndex: 10
                                }}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    gap: 1.5, 
                                    alignItems: 'flex-end',
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8f9fa',
                                    borderRadius: '24px',
                                    p: 1,
                                    pl: 2.5,
                                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                                    transition: 'border-color 0.3s',
                                    '&:focus-within': {
                                        borderColor: '#6366f1'
                                    }
                                }}>
                                    <TextField
                                        fullWidth
                                        variant="standard"
                                        placeholder="Message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        multiline
                                        maxRows={5}
                                        InputProps={{
                                            disableUnderline: true,
                                            sx: { 
                                                py: 1, 
                                                fontSize: '0.95rem',
                                                '&::placeholder': { color: theme.palette.text.disabled, opacity: 1 }
                                            }
                                        }}
                                    />
                                    <IconButton
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        sx={{ 
                                            mb: 0.5,
                                            mr: 0.5,
                                            bgcolor: newMessage.trim() ? '#6366f1' : alpha(theme.palette.text.primary, 0.05),
                                            color: newMessage.trim() ? '#fff' : theme.palette.text.disabled,
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transform: newMessage.trim() ? 'scale(1)' : 'scale(0.95)',
                                            '&:hover': { 
                                                bgcolor: newMessage.trim() ? '#4f46e5' : alpha(theme.palette.text.primary, 0.08),
                                                transform: newMessage.trim() ? 'scale(1.05)' : 'scale(0.95)'
                                            },
                                            width: 40,
                                            height: 40
                                        }}
                                    >
                                        <SendIcon sx={{ fontSize: 20, ml: newMessage.trim() ? 0.5 : 0 }} />
                                    </IconButton>
                                </Box>
                            </Box>
                        )}
                    </>
                )}
            </Box>
                
            </Box>
    );
}

export default function ChatPage() {
    return (
        <ErrorBoundary>
            <React.Suspense fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <CircularProgress />
                </Box>
            }>
                <ChatContent />
            </React.Suspense>
        </ErrorBoundary>
    );
}
