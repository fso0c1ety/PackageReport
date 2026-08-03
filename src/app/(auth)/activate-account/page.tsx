"use client";

import { Suspense, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiUrl, publicFetch } from "../../apiUrl";

function ActivateAccountContent() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState({ loading: true, message: "", error: "" });

  useEffect(() => {
    if (!token) { setState({ loading: false, message: "", error: "Activation token is missing" }); return; }
    publicFetch(getApiUrl("auth/activate-account"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to activate account");
      setState({ loading: false, message: data.message, error: "" });
    }).catch((error) => setState({ loading: false, message: "", error: error.message }));
  }, [token]);

  return <Paper sx={{ width: "100%", maxWidth: 480, m: 2, p: 4, borderRadius: 3 }}>
    <Typography variant="h4" fontWeight={800} mb={1}>Activate account</Typography>
    <Typography color="text.secondary" mb={3}>Confirming that this email belongs to you.</Typography>
    {state.loading && <Box textAlign="center"><CircularProgress /></Box>}
    {state.message && <Alert severity="success">{state.message}</Alert>}
    {state.error && <Alert severity="error">{state.error}</Alert>}
    <Button fullWidth variant="contained" sx={{ mt: 3 }} onClick={() => router.push("/login/")}>Continue to sign in</Button>
  </Paper>;
}

export default function ActivateAccountPage() {
  return <Suspense fallback={null}><ActivateAccountContent /></Suspense>;
}
