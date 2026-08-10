"use client";

import { Suspense, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiUrl, publicFetch } from "../../apiUrl";

function ActivateAccountContent() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState({ loading: true, message: "", error: "", requiresPassword: false });
  const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) { setState({ loading: false, message: "", error: "Activation token is missing", requiresPassword: false }); return; }
    publicFetch(`${getApiUrl("auth/activate-account")}?token=${encodeURIComponent(token)}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to activate account");
      if (data.requiresPassword) setState({ loading: false, message: "", error: "", requiresPassword: true });
      else return publicFetch(getApiUrl("auth/activate-account"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then(async (activation) => { const result = await activation.json(); if (!activation.ok) throw new Error(result.error); setState({ loading: false, message: result.message, error: "", requiresPassword: false }); });
    }).catch((error) => setState({ loading: false, message: "", error: error.message, requiresPassword: false }));
  }, [token]);
  const activate = async () => {
    if (password !== confirmPassword) { setState((current) => ({ ...current, error: "Passwords do not match" })); return; }
    setState((current) => ({ ...current, loading: true, error: "" }));
    const response = await publicFetch(getApiUrl("auth/activate-account"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }); const data = await response.json();
    setState({ loading: false, message: response.ok ? data.message : "", error: response.ok ? "" : data.error, requiresPassword: !response.ok });
  };

  return <Paper sx={{ width: "100%", maxWidth: 480, m: 2, p: 4, borderRadius: 3 }}>
    <Typography variant="h4" fontWeight={800} mb={1}>Activate account</Typography>
    <Typography color="text.secondary" mb={3}>Confirming that this email belongs to you.</Typography>
    {state.loading && <Box textAlign="center"><CircularProgress /></Box>}
    {state.message && <Alert severity="success">{state.message}</Alert>}
    {state.error && <Alert severity="error">{state.error}</Alert>}
    {state.requiresPassword && <Box sx={{ mt: 2 }}><TextField fullWidth type="password" label="Create password" value={password} onChange={(event) => setPassword(event.target.value)} /><TextField fullWidth type="password" label="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} sx={{ mt: 2 }} /><Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={activate}>Set Up Demo Access</Button></Box>}
    {state.message && <Button fullWidth variant="contained" sx={{ mt: 3 }} onClick={() => router.push("/login/")}>Continue to sign in</Button>}
  </Paper>;
}

export default function ActivateAccountPage() {
  return <Suspense fallback={null}><ActivateAccountContent /></Suspense>;
}
