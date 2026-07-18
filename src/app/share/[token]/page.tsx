"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [board, setBoard] = useState<any>();
  const [comments, setComments] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    const response = await fetch(`/api/public/boards/${encodeURIComponent(token)}/comments`);
    if (response.ok) setComments(await response.json());
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/public/boards/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (response.status === 401) { setPasswordRequired(true); return null; }
        if (!response.ok) { const data=await response.json().catch(()=>({})); throw new Error(data.error || "This shared link is unavailable or has been disabled."); }
        return response.json();
      })
      .then((data) => {
        if (!active || !data) return;
        setBoard(data);
        if (data.public_share_comments) void loadComments();
      })
      .catch((reason) => active && setError(reason.message));
    return () => { active = false; };
  }, [token]);

  const unlock = async () => {
    setUnlocking(true); setError("");
    try {
      const response = await fetch(`/api/public/boards/${encodeURIComponent(token)}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({password}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to unlock this link.");
      setBoard(data); setPasswordRequired(false); setPassword("");
      if (data.public_share_comments) void loadComments();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to unlock this link."); }
    finally { setUnlocking(false); }
  };

  const submit = async () => {
    setSubmitting(true);
    setFeedbackError("");
    try {
      const response = await fetch(`/api/public/boards/${encodeURIComponent(token)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      });
      if (!response.ok) throw new Error("Unable to send feedback. Please try again.");
      setMessage("");
      await loadComments();
    } catch (reason) {
      setFeedbackError(reason instanceof Error ? reason.message : "Unable to send feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (passwordRequired) return <Box sx={{ p: 4, maxWidth: 480, mx: "auto", minHeight:"100dvh", display:"grid", placeItems:"center" }}><Paper sx={{p:4,width:"100%",borderRadius:4}}><Stack gap={2}><Typography variant="h5" fontWeight={900}>Protected client portal</Typography><Typography color="text.secondary">Enter the password supplied by the workspace owner.</Typography>{error&&<Alert severity="error">{error}</Alert>}<TextField autoFocus type="password" label="Share password" value={password} onChange={event=>setPassword(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&password)void unlock();}}/><Button variant="contained" disabled={!password||unlocking} onClick={()=>void unlock()}>{unlocking?<CircularProgress size={22} color="inherit"/>:"Open portal"}</Button></Stack></Paper></Box>;
  if (error) return <Box sx={{ p: 4, maxWidth: 700, mx: "auto" }}><Alert severity="error">{error}</Alert></Box>;
  if (!board) return <Box sx={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}><CircularProgress /></Box>;

  const columns = Array.isArray(board.columns) ? board.columns : [];
  const rows = Array.isArray(board.rows) ? board.rows : [];

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, minHeight: "100dvh", bgcolor: "background.default" }}>
      <Box sx={{ maxWidth: 1500, mx: "auto" }}>
        <Typography variant="overline" color="primary" fontWeight={800}>Smart Manage · Client Portal</Typography>
        <Typography variant={mobile ? "h4" : "h3"} fontWeight={900} sx={{ overflowWrap: "anywhere" }}>
          {board.public_share_title || board.name}
        </Typography>
        {board.public_share_welcome && <Typography color="text.secondary" sx={{ mb: 3 }}>{board.public_share_welcome}</Typography>}
        {board.public_share_downloads && <Button variant="outlined" sx={{mb:2}} onClick={()=>{const blob=new Blob([JSON.stringify({name:board.name,columns,rows},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`${board.name||"shared-board"}.json`;anchor.click();URL.revokeObjectURL(url);}}>Download data</Button>}

        {mobile ? (
          <Stack gap={1.5}>
            {rows.map((row: any) => (
              <Paper key={row.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                {columns.map((column: any) => (
                  <Box key={column.id} sx={{ display: "grid", gridTemplateColumns: "minmax(90px, 38%) 1fr", gap: 1.5, py: 0.75 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800}>{column.name}</Typography>
                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{displayValue(row.values?.[column.id])}</Typography>
                  </Box>
                ))}
              </Paper>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: "auto" }}>
            <Table stickyHeader>
              <TableHead><TableRow>{columns.map((column: any) => <TableCell key={column.id} sx={{ fontWeight: 800 }}>{column.name}</TableCell>)}</TableRow></TableHead>
              <TableBody>{rows.map((row: any) => <TableRow key={row.id} hover>{columns.map((column: any) => <TableCell key={column.id}>{displayValue(row.values?.[column.id])}</TableCell>)}</TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        )}

        {board.public_share_comments && (
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mt: 3 }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>Client feedback</Typography>
            <Stack gap={1.5}>
              {feedbackError && <Alert severity="error">{feedbackError}</Alert>}
              <TextField label="Your name" value={name} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 120 }} />
              <TextField label="Message" multiline minRows={3} value={message} onChange={(event) => setMessage(event.target.value)} inputProps={{ maxLength: 2000 }} />
              <Button variant="contained" fullWidth={mobile} disabled={submitting || !name.trim() || !message.trim()} onClick={() => void submit()}>
                {submitting ? <CircularProgress size={22} color="inherit" /> : "Send feedback"}
              </Button>
              {comments.map((comment) => (
                <Box key={comment.id} sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
                  <Typography fontWeight={800}>{comment.client_name}</Typography>
                  <Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{comment.message}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(comment.created_at).toLocaleString()}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
