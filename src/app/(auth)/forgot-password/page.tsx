"use client";

import { FormEvent, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { getApiUrl, publicFetch } from "../../apiUrl";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await publicFetch(getApiUrl("forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send reset email");
      setMessage(data.message);
    } catch (submitError: any) {
      setError(submitError.message || "Unable to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ width: "100%", maxWidth: 460, p: { xs: 3, md: 4 }, borderRadius: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={1}>Reset your password</Typography>
      <Typography color="text.secondary" mb={3}>
        Enter your account email and we will send a secure reset link.
      </Typography>
      <Box component="form" onSubmit={submit} display="flex" flexDirection="column" gap={2}>
        <TextField
          autoFocus
          required
          fullWidth
          type="email"
          label="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? <CircularProgress size={22} /> : "Send reset link"}
        </Button>
        <Button onClick={() => router.push("/login/")} sx={{ textTransform: "none" }}>Back to sign in</Button>
      </Box>
    </Paper>
  );
}
