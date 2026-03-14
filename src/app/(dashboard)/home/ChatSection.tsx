"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  Paper,
  List,
  ListItem,
  CircularProgress,
  Button,
  useTheme,
  Card,
  CardContent,
  Divider,
  Modal,
  Fade,
  Backdrop,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
import dayjs from "dayjs";

export default function ChatSection({ selectedUser: selectedUserProp }: { selectedUser?: any } = {}) {
  const theme = useTheme();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState<any>(selectedUserProp || null);
    // Update selectedUser if prop changes
    useEffect(() => {
      if (selectedUserProp && (!selectedUser || selectedUser.id !== selectedUserProp.id)) {
        setSelectedUser(selectedUserProp);
      }
      if (!selectedUserProp && selectedUser) {
        setSelectedUser(null);
      }
    }, [selectedUserProp]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) setCurrentUser(JSON.parse(user));
  }, []);

  useEffect(() => {
    setListLoading(true);
    authenticatedFetch(getApiUrl("chats"))
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setConversations(data))
      .catch(() => setConversations([]))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      authenticatedFetch(getApiUrl(`chats/${selectedUser.id}`)).then((res) => res.ok ? res.json() : []),
      authenticatedFetch(getApiUrl(`people/${selectedUser.id}`)).then((res) => res.ok ? res.json() : null),
    ])
      .then(([msgs, user]) => {
        setMessages(Array.isArray(msgs) ? msgs : []);
        setSelectedUser(user);
        setError(null);
      })
      .catch(() => {
        setMessages([]);
        setError("Failed to load chat or user.");
      })
      .finally(() => setLoading(false));
  }, [selectedUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const msg = {
      id: Date.now().toString(),
      text: newMessage,
      sender_id: currentUser?.id,
      recipient_id: selectedUser.id,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
    try {
      await authenticatedFetch(getApiUrl(`chats/${selectedUser.id}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.text }),
      });
    } catch {}
  };

  // Modal state
  const [open, setOpen] = React.useState(false);

  // Open modal when user is selected
  React.useEffect(() => {
    setOpen(!!selectedUser);
  }, [selectedUser]);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
      <Box sx={{ minHeight: 320, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <List sx={{ p: 0, width: '100%' }}>
          {listLoading ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={22} color="primary" />
            </Box>
          ) : conversations.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No chats
              </Typography>
            </Box>
          ) : (
            conversations.map((conv) => (
              <ListItem
                key={conv.id}
                onClick={() => setSelectedUser(conv)}
                sx={{
                  px: 2,
                  py: 2,
                  cursor: 'pointer',
                  bgcolor: selectedUser?.id === conv.id ? theme.palette.primary.light : theme.palette.background.paper,
                  borderRadius: 3,
                  mb: 1.5,
                  boxShadow: '0 2px 8px rgba(80,80,120,0.04)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  '&:hover': {
                    bgcolor: theme.palette.primary.light,
                    boxShadow: '0 8px 24px rgba(80,80,120,0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Avatar src={conv.avatar} sx={{ width: 44, height: 44, mr: 2, bgcolor: theme.palette.primary.light, fontWeight: 700, fontSize: 22 }}>
                  {!conv.avatar && (conv.name ? conv.name[0] : <ChatBubbleOutlineIcon fontSize="medium" />)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" sx={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, color: theme.palette.text.primary }}>
                    {conv.name || conv.email || 'User'}
                  </Typography>
                  {conv.lastMessage && conv.lastMessage.text ? (
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'inherit',
                        mt: 0.5,
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: conv.lastMessage.unread && conv.lastMessage.sender_id !== currentUser?.id ? 700 : 400,
                        color: conv.lastMessage.unread && conv.lastMessage.sender_id !== currentUser?.id ? theme.palette.primary.main : theme.palette.text.secondary,
                      }}
                    >
                      {conv.lastMessage.text}
                    </Typography>
                  ) : null}
                </Box>
              </ListItem>
            ))
          )}
        </List>
      </Box>
      {/* Chat Modal */}
      <Modal
        open={open}
        onClose={() => setSelectedUser(null)}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{ backdrop: { timeout: 300 } }}
      >
        <Fade in={open}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '98vw', sm: 600, md: 800 },
              maxWidth: '98vw',
              maxHeight: '90vh',
              bgcolor: theme.palette.background.paper,
              borderRadius: 4,
              boxShadow: 24,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
              <Avatar src={selectedUser?.avatar} sx={{ width: 48, height: 48, mr: 1 }}>
                {!selectedUser?.avatar && (selectedUser?.name ? selectedUser.name[0] : <ChatBubbleOutlineIcon fontSize="large" />)}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'var(--font-outfit)' }}>{selectedUser?.name || selectedUser?.email || 'User'}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'var(--font-outfit)' }}>{selectedUser?.email}</Typography>
              </Box>
              <Button variant="outlined" sx={{ ml: 'auto', borderRadius: 3, fontWeight: 600, color: theme.palette.primary.main, borderColor: theme.palette.primary.main, textTransform: 'none', fontFamily: 'var(--font-outfit)' }} onClick={() => setSelectedUser(null)}>
                ← Back
              </Button>
            </Box>
            {/* Messages */}
            <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2, sm: 4 }, py: 3, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: theme.palette.background.default }}>
              {loading ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={28} />
                </Box>
              ) : error ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700} color="error">
                    Error
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {error}
                  </Typography>
                  <Button variant="outlined" onClick={() => window.location.reload()}>Reload</Button>
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.palette.text.secondary, opacity: 0.7 }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 40, mb: 2 }} />
                  <Typography variant="body1" sx={{ fontFamily: 'var(--font-outfit)' }}>No messages yet</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'var(--font-outfit)' }}>Start the conversation below!</Typography>
                </Box>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <Box key={msg.id || idx} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', mb: 0.5 }}>
                      {!isMe && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                          <Avatar src={selectedUser?.avatar} sx={{ width: 28, height: 28 }}>
                            {!selectedUser?.avatar && (selectedUser?.name ? selectedUser.name[0] : <ChatBubbleOutlineIcon fontSize="small" />)}
                          </Avatar>
                          <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ fontFamily: 'var(--font-outfit)' }}>{selectedUser?.name || selectedUser?.email || 'User'}</Typography>
                        </Box>
                      )}
                      <Paper sx={{
                        p: 1.5,
                        bgcolor: isMe ? theme.palette.primary.main : theme.palette.action.hover,
                        color: isMe ? theme.palette.primary.contrastText : theme.palette.text.primary,
                        borderRadius: isMe ? '16px 16px 6px 16px' : '16px 16px 16px 6px',
                        boxShadow: 0,
                        border: isMe ? 'none' : `1px solid ${theme.palette.divider}`,
                        fontFamily: 'var(--font-outfit)',
                      }}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.6, fontFamily: 'var(--font-outfit)' }}>{msg.text}</Typography>
                      </Paper>
                      <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: isMe ? 'right' : 'left', color: theme.palette.text.secondary, fontFamily: 'var(--font-outfit)' }}>
                        {dayjs(msg.timestamp).format('HH:mm')}
                      </Typography>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>
            {/* Input */}
            <Box sx={{ p: 3, bgcolor: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="medium"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  multiline
                  maxRows={4}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: theme.palette.action.selected,
                      fontFamily: 'var(--font-outfit)',
                      fontSize: 17,
                      boxShadow: '0 2px 8px rgba(80,80,120,0.04)',
                    },
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  sx={{ alignSelf: 'flex-end', bgcolor: theme.palette.primary.light, '&:hover': { bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }, borderRadius: 3, boxShadow: '0 2px 8px rgba(80,80,120,0.08)' }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}
