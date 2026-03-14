"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  Paper,
  Stack,
  CircularProgress,
  Button
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { getApiUrl, authenticatedFetch, getAvatarUrl } from "../apiUrl";

  return (
    <Suspense fallback={<Box p={4}><Typography>Loading chat...</Typography></Box>}>
      <InnerUserChatPage />
    </Suspense>
  );
}

function InnerUserChatPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    // Fetch user info
    authenticatedFetch(getApiUrl(`/users/${userId}`))
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null));
    // Fetch chat messages
    authenticatedFetch(getApiUrl(`/chat/${userId}`))
      .then(res => res.json())
      .then(data => setMessages(data))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;
    setSending(true);
    try {
      const msg = { text: input };
      const res = await authenticatedFetch(getApiUrl(`/chat/${userId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg)
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  };

  if (!userId) {
    return <Box p={4}><Typography>No user selected.</Typography></Box>;
  }

  return (
    <Box maxWidth={500} mx="auto" my={4}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <Avatar src={getAvatarUrl(user?.avatar, user?.name)} />
          <Typography variant="h6">{user?.name || "User"}</Typography>
        </Stack>
        <Box sx={{ minHeight: 300, maxHeight: 400, overflowY: "auto", mb: 2, p: 1, bgcolor: "#f7f8fa", borderRadius: 2 }}>
          {loading ? <CircularProgress /> : (
            messages.length === 0 ? <Typography color="text.secondary">No messages yet.</Typography> :
              messages.map((msg, idx) => (
                <Box key={msg.id || idx} mb={1.5} display="flex" flexDirection="column" alignItems={msg.isMe ? "flex-end" : "flex-start"}>
                  <Paper sx={{ p: 1.5, bgcolor: msg.isMe ? "#6366f1" : "#fff", color: msg.isMe ? "#fff" : "#222", borderRadius: 2, minWidth: 60 }}>
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                  <Typography variant="caption" color="text.secondary">{msg.time || ""}</Typography>
                </Box>
              ))
          )}
          <div ref={chatEndRef} />
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
            disabled={sending}
            size="small"
          />
          <IconButton color="primary" onClick={handleSend} disabled={sending || !input.trim()}>
            <SendIcon />
          </IconButton>
        </Stack>
      </Paper>
    </Box>
  );
}
