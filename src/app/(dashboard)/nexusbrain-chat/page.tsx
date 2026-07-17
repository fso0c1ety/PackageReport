"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SendIcon from "@mui/icons-material/Send";
import SummarizeIcon from "@mui/icons-material/Summarize";
import EmailIcon from "@mui/icons-material/Email";
import TranslateIcon from "@mui/icons-material/Translate";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import RuleIcon from "@mui/icons-material/Rule";
import { motion } from "framer-motion";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
import { useSearchParams } from "next/navigation";

type NexusMessage = {
  role: "assistant" | "user";
  text: string;
  timestamp: string;
};

const AI_TOOLS = [
  { label: "AI Summary", capability: "summary", icon: SummarizeIcon, prompt: "Summarize the current workspace activity, priorities, risks, and next actions." },
  { label: "AI Email", capability: "email", icon: EmailIcon, prompt: "Draft a professional email. Ask me only for the missing recipient, purpose, or tone." },
  { label: "AI Translate", capability: "translate", icon: TranslateIcon, prompt: "Translate my next text while preserving its meaning and professional tone. Ask for the target language." },
  { label: "AI Autofill", capability: "autofill", icon: AutoFixHighIcon, prompt: "Help autofill missing workspace fields. Identify what information is required before proposing values." },
  { label: "AI Reports", capability: "reports", icon: AssessmentIcon, prompt: "Create a concise business report with KPIs, trends, risks, and recommended actions." },
  { label: "Expense Analysis", capability: "expense_analysis", icon: ReceiptLongIcon, prompt: "Analyze expenses, flag unusual costs, and suggest concrete savings opportunities." },
  { label: "Delayed Loads", capability: "delayed_loads", icon: LocalShippingIcon, prompt: "Analyze delayed loads, likely causes, customer impact, and recommended follow-up actions." },
  { label: "Document Summary", capability: "document_summary", icon: FindInPageIcon, prompt: "Summarize a document. Ask me to provide or select the document, then return key facts, dates, risks, and actions." },
  { label: "Missing Fields", capability: "missing_fields", icon: RuleIcon, prompt: "Find missing or incomplete fields and prioritize which records need attention first." },
  { label: "Data Cleanup", capability: "data_cleanup", icon: RuleIcon, prompt: "Find duplicate, inconsistent, or malformed data and recommend safe cleanup steps." },
  { label: "Formula Assistant", capability: "formula_assistant", icon: AutoFixHighIcon, prompt: "Help me create or debug a board formula using the available columns." },
  { label: "Automation Assistant", capability: "automation_assistant", icon: AutoAwesomeIcon, prompt: "Design a safe WHEN / IF / THEN automation for this workspace." },
] as const;

const initialMessages: NexusMessage[] = [
  {
    role: "assistant",
    text: "Hello! I'm your Nexus Brain. I can help you manage this board, send emails, or set up automations. What's on your mind?",
    timestamp: new Date().toISOString(),
  },
];

function readAssistantResponse(data: any) {
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return "Nexus Brain is ready. Tell me what you want to do.";

  try {
    const parsed = JSON.parse(raw);
    return parsed?.response || parsed?.thought || raw;
  } catch {
    return raw;
  }
}

export default function NexusBrainChatPage() {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const [workspaceId, setWorkspaceId] = useState(searchParams.get("id") || "");
  const [messages, setMessages] = useState<NexusMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workspaceId) return;
    authenticatedFetch(getApiUrl("/workspaces"), { suppressNativeErrorAlert: true })
      .then((response) => response.ok ? response.json() : [])
      .then((items) => { if (Array.isArray(items) && items[0]?.id) setWorkspaceId(String(items[0].id)); })
      .catch(() => undefined);
  }, [workspaceId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexusbrain_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      localStorage.removeItem("nexusbrain_chat");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("nexusbrain_chat", JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const sendMessage = async (forcedText?: string, capability = "summary") => {
    const text = (forcedText || input).trim();
    if (!text || isThinking) return;

    setInput("");
    const userMessage: NexusMessage = {
      role: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setIsThinking(true);

    try {
      const response = await authenticatedFetch(getApiUrl("/nexus/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: text,
          workspaceId,
          capability,
          systemPrompt:
            'You are "Nexus Brain", the intelligent assistant inside Smart Manage. You help with summaries, professional emails, translation, autofill suggestions, reports, expense analysis, delayed loads, document summaries, and missing-field detection. Never claim to have changed workspace data unless an action result confirms it. Reply in concise JSON with fields thought, action, params, and response. Keep the response practical and short.',
          messages: messages.map((message) => ({
            role: message.role,
            content: message.text,
          })),
        }),
      });

      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: readAssistantResponse(data),
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "I'm having trouble syncing with Nexus Brain right now. Please try again shortly.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 48px)",
        display: "flex",
        justifyContent: "center",
        p: { xs: 1.5, md: 4 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 920,
          height: { xs: "calc(100vh - 88px)", md: "calc(100vh - 120px)" },
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          overflow: "hidden",
          borderRadius: { xs: 4, md: 6 },
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === "dark" ? "rgba(10,10,15,0.92)" : "rgba(255,255,255,0.96)",
          boxShadow: theme.palette.mode === "dark"
            ? "0 30px 90px rgba(0,0,0,0.65)"
            : "0 30px 90px rgba(99,102,241,0.14)",
        }}
      >
        <Box
          sx={{
            p: { xs: 2, md: 2.5 },
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            background: theme.palette.mode === "dark"
              ? "linear-gradient(to right, rgba(99,102,241,0.16), rgba(129,140,248,0.05))"
              : "linear-gradient(to right, rgba(99,102,241,0.07), rgba(129,140,248,0.03))",
          }}
        >
          <Box sx={{ position: "relative" }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: "#6366F1",
                background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
                boxShadow: "0 0 22px rgba(99,102,241,0.35)",
              }}
            >
              <AutoAwesomeIcon />
            </Avatar>
            <Box
              sx={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 13,
                height: 13,
                borderRadius: "50%",
                bgcolor: "#10B981",
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
              Nexus Brain
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Intelligence Engine
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={`${message.timestamp}-${index}`}
              component={motion.div}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              sx={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: { xs: "92%", md: "72%" },
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  borderRadius: message.role === "user" ? "22px 22px 4px 22px" : "22px 22px 22px 4px",
                  color: message.role === "user" ? "#fff" : theme.palette.text.primary,
                  background: message.role === "user"
                    ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                    : theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(15,23,42,0.04)",
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: message.role === "user"
                    ? "0 12px 26px rgba(99,102,241,0.2)"
                    : "0 8px 20px rgba(15,23,42,0.05)",
                }}
              >
                <Typography sx={{ fontSize: "0.98rem", lineHeight: 1.65, fontWeight: 500 }}>
                  {message.text}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.6,
                  px: 1,
                  color: "text.secondary",
                  textAlign: message.role === "user" ? "right" : "left",
                }}
              >
                {message.role === "user" ? "Delivered" : "Nexus Engine"}
              </Typography>
            </Box>
          ))}

          {isThinking && (
            <Box sx={{ alignSelf: "flex-start", display: "flex", gap: 0.8, p: 2, borderRadius: 4, bgcolor: "action.hover" }}>
              {[0, 0.2, 0.4].map((delay) => (
                <Box
                  key={delay}
                  component={motion.div}
                  animate={{ scale: [1, 1.45, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.1, delay }}
                  sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main" }}
                />
              ))}
            </Box>
          )}
          <div ref={endRef} />
        </Box>

        <Box sx={{ p: { xs: 2, md: 2.5 }, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: "action.hover" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: "auto", pb: 0.75, scrollbarWidth: "thin" }}>
            {AI_TOOLS.map(({ label, capability, icon: ToolIcon, prompt }) => (
              <Chip
                key={label}
                icon={<ToolIcon sx={{ fontSize: "17px !important" }} />}
                label={label}
                disabled={isThinking}
                onClick={() => sendMessage(prompt, capability)}
                sx={{
                  flexShrink: 0,
                  height: 36,
                  borderRadius: 2.5,
                  color: "primary.main",
                  border: `1px solid ${theme.palette.primary.main}35`,
                  bgcolor: theme.palette.mode === "dark" ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
                  fontWeight: 800,
                  "&:hover": { bgcolor: theme.palette.mode === "dark" ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)" },
                }}
              />
            ))}
          </Stack>
          {messages.length < 3 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: "auto", pb: 0.5 }}>
              {["Add a task", "Send an email", "Change status"].map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  sx={{
                    color: "primary.main",
                    border: `1px solid ${theme.palette.primary.light}55`,
                    bgcolor: theme.palette.mode === "dark" ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)",
                    fontWeight: 700,
                  }}
                />
              ))}
            </Stack>
          )}
          <TextField
            fullWidth
            placeholder="Ask the brain anything..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 5,
                bgcolor: theme.palette.background.paper,
                pr: 1,
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isThinking}
                    sx={{
                      width: 42,
                      height: 42,
                      color: "#fff",
                      background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
                      "&.Mui-disabled": {
                        color: theme.palette.action.disabled,
                        background: theme.palette.action.disabledBackground,
                      },
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
