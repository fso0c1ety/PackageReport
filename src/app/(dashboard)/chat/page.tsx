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
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
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
    const [activeTab, setActiveTab] = useState<"chats" | "social">("chats");
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
            sender_id: currentUser.id,
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
        <Box sx={{ display: 'flex', height: 'calc(100vh - 72px)', bgcolor: theme.palette.background.default }}>
                {/* Conversations / Social List */}
                <Box sx={{
                    width: { xs: otherUserId ? 0 : '100%', sm: 320 },
                    display: { xs: otherUserId ? 'none' : 'block', sm: 'block' },
                    borderRight: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(20px)',
                    overflowY: 'auto'
                }}>
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: -0.5 }}>Chat</Typography>
                        
                        {/* Tab Switcher */}
                        <Box sx={{ display: 'flex', bgcolor: alpha(theme.palette.text.primary, 0.05), borderRadius: 3, p: 0.5 }}>
                            <Button 
                                fullWidth 
                                size="small"
                                onClick={() => setActiveTab("chats")}
                                sx={{ 
                                    borderRadius: 2.5, 
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    bgcolor: activeTab === "chats" ? theme.palette.background.paper : 'transparent',
                                    color: activeTab === "chats" ? theme.palette.primary.main : theme.palette.text.secondary,
                                    boxShadow: activeTab === "chats" ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                    '&:hover': { bgcolor: activeTab === "chats" ? theme.palette.background.paper : alpha(theme.palette.text.primary, 0.05) }
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
                                    bgcolor: activeTab === "social" ? theme.palette.background.paper : 'transparent',
                                    color: activeTab === "social" ? theme.palette.primary.main : theme.palette.text.secondary,
                                    boxShadow: activeTab === "social" ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                    '&:hover': { bgcolor: activeTab === "social" ? theme.palette.background.paper : alpha(theme.palette.text.primary, 0.05) }
                                }}
                            >
                                <Badge badgeContent={pendingRequests.length} color="error" variant="dot" invisible={pendingRequests.length === 0}>
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
                                        onClick={() => router.push(`/chat/?userId=${conv.id}`)}
                                        sx={{
                                            px: 2, py: 1.5,
                                            cursor: 'pointer',
                                            bgcolor: otherUserId === conv.id ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                            '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.04) },
                                            transition: 'background 0.2s',
                                            borderLeft: otherUserId === conv.id ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent'
                                        }}
                                    >
                                        <Avatar src={conv.avatar} sx={{ mr: 2, width: 44, height: 44, border: `2px solid ${theme.palette.background.paper}` }} />
                                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                <Typography variant="subtitle2" noWrap fontWeight={700}>{conv.name}</Typography>
                                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                                    {dayjs(conv.timestamp).format('HH:mm')}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                                {conv.last_message}
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
                                                    <Avatar src={req.avatar} sx={{ mr: 1, width: 32, height: 32 }} />
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
                                            <Avatar src={friend.avatar} sx={{ mr: 1.5, width: 36, height: 36 }} />
                                            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                                <Typography variant="body2" fontWeight={600} noWrap>{friend.name}</Typography>
                                            </Box>
                                            <Tooltip title="Message">
                                                <IconButton size="small" onClick={() => router.push(`/chat/?userId=${friend.id}`)}>
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
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : '#f8f9fa'
                }}>
                    {!otherUserId ? (
                        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, p: 4, textAlign: 'center' }}>
                            <Avatar sx={{ width: 80, height: 80, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                                <ChatBubbleOutlineIcon sx={{ fontSize: 40 }} />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight={600}>Your Messages</Typography>
                                <Typography variant="body2" color="text.secondary">Select a user to start a private conversation</Typography>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            {/* Header */}
                            <Paper sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${theme.palette.divider}`, borderRadius: 0, bgcolor: theme.palette.background.paper }} elevation={0}>
                                <IconButton sx={{ display: { xs: 'flex', sm: 'none' } }} onClick={() => router.push('/chat')}>
                                    <ArrowBackIcon />
                                </IconButton>
                                <Avatar src={otherUser?.avatar} />
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={600}>{otherUser?.name || "Loading..."}</Typography>
                                    <Typography variant="caption" color="text.secondary">{otherUser?.email}</Typography>
                                </Box>
                            </Paper>

                            {/* Messages */}
                            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {loading && messages.length === 0 ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isMe = msg.sender_id === currentUser?.id;
                                        return (
                                            <Box key={msg.id || idx} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                                <Paper sx={{
                                                    p: 1.5,
                                                    bgcolor: isMe ? theme.palette.primary.main : alpha(theme.palette.background.paper, 0.9),
                                                    backdropFilter: 'blur(10px)',
                                                    color: isMe ? '#fff' : theme.palette.text.primary,
                                                    borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                    boxShadow: isMe ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
                                                    border: isMe ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.5)}`
                                                }}>
                                                    <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.6, fontSize: '0.9rem' }}>{msg.text}</Typography>
                                                </Paper>
                                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: isMe ? 'right' : 'left', color: theme.palette.text.disabled }}>
                                                    {dayjs(msg.timestamp).format('HH:mm')}
                                                </Typography>
                                            </Box>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </Box>

                            {/* Input */}
                            <Box sx={{ p: 2, bgcolor: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        multiline
                                        maxRows={4}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 3,
                                                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : '#f1f3f4'
                                            }
                                        }}
                                    />
                                    <IconButton
                                        color="primary"
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        sx={{ alignSelf: 'flex-end', bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                                    >
                                        <SendIcon />
                                    </IconButton>
                                </Box>
                            </Box>
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
