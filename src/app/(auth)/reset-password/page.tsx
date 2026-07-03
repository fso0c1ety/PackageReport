"use client";

import { FormEvent, Suspense, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiUrl, publicFetch } from "../../apiUrl";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "Reset token is missing");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await publicFetch(getApiUrl("reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to reset password");
      setMessage(data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (submitError: any) {
      setError(submitError.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ width: "100%", maxWidth: 460, p: { xs: 3, md: 4 }, borderRadius: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={1}>Choose a new password</Typography>
      <Typography color="text.secondary" mb={3}>
        Use at least 8 characters with uppercase, lowercase and a number.
      </Typography>
      <Box component="form" onSubmit={submit} display="flex" flexDirection="column" gap={2}>
        <TextField required fullWidth type="password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <TextField required fullWidth type="password" label="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={loading || !token || Boolean(message)}>
          {loading ? <CircularProgress size={22} /> : "Reset password"}
        </Button>
        <Button onClick={() => router.push("/login/")} sx={{ textTransform: "none" }}>
          {message ? "Continue to sign in" : "Back to sign in"}
        </Button>
      </Box>
    </Paper>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
