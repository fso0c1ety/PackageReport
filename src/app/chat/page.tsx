"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Typography, Avatar, TextField, IconButton, Paper, List, ListItem, useTheme, alpha, CircularProgress } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { authenticatedFetch, getApiUrl } from "../apiUrl";
import dayjs from "dayjs";
import AppShell from "../AppShell";

export default function ChatPage() {
    const theme = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const otherUserId = searchParams.get("userId");

    const [conversations, setConversations] = useState<any[]>([]);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (user) setCurrentUser(JSON.parse(user));
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
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 10000);
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
        <AppShell>
            <Box sx={{ display: 'flex', height: 'calc(100vh - 72px)', bgcolor: theme.palette.background.default }}>
                {/* Conversations List */}
                <Box sx={{
                    width: { xs: otherUserId ? 0 : '100%', sm: 320 },
                    display: { xs: otherUserId ? 'none' : 'block', sm: 'block' },
                    borderRight: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                    overflowY: 'auto'
                }}>
                    <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="h6" fontWeight={700}>Messages</Typography>
                    </Box>
                    <List sx={{ p: 0 }}>
                        {listLoading ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
                        ) : conversations.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">No conversations yet</Typography>
                            </Box>
                        ) : (
                            conversations.map((conv) => (
                                <ListItem
                                    key={conv.id}
                                    onClick={() => router.push(`/chat?userId=${conv.id}`)}
                                    sx={{
                                        px: 2, py: 1.5,
                                        cursor: 'pointer',
                                        bgcolor: otherUserId === conv.id ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                        '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.04) },
                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                                    }}
                                >
                                    <Avatar src={conv.avatar} sx={{ mr: 2 }} />
                                    <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <Typography variant="subtitle2" noWrap fontWeight={600}>{conv.name}</Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                {dayjs(conv.timestamp).format('HH:mm')}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                                            {conv.last_message}
                                        </Typography>
                                    </Box>
                                </ListItem>
                            ))
                        )}
                    </List>
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
                                                    bgcolor: isMe ? theme.palette.primary.main : theme.palette.background.paper,
                                                    color: isMe ? '#fff' : theme.palette.text.primary,
                                                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                    border: isMe ? 'none' : `1px solid ${theme.palette.divider}`
                                                }}>
                                                    <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.5 }}>{msg.text}</Typography>
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
        </AppShell>
    );
}
