"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { WORKSPACE_TEMPLATES } from "../../../workspaceTemplates";

type DemoRequest = {
  id: string;
  name: string;
  company_name: string;
  email: string;
  phone?: string;
  business_type: string;
  team_size?: string;
  management_interests?: string[];
  message?: string;
  recommended_template?: string;
  status: string;
  assigned_to?: string;
  created_at: string;
  demo_workspace_id?: string;
  workspace_name?: string;
  demo_expires_at?: string;
  access_email_status?: string;
  access_email_last_error?: string;
  revoked_at?: string;
};
const STATUSES = [
  "new",
  "contacted",
  "qualified",
  "demo_preparing",
  "demo_ready",
  "demo_sent",
  "demo_completed",
  "converted",
  "not_interested",
];
const label = (value?: string) =>
  String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function DemoRequestsPage() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState("");
  const [duration, setDuration] = useState(7);
  const [workspaceName, setWorkspaceName] = useState("");
  const templateName = useMemo(
    () =>
      WORKSPACE_TEMPLATES.find(
        (item) => item.key === (selected?.recommended_template || templateKey)
      )?.name || "Select template",
    [selected, templateKey]
  );
  const load = async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/internal/demo-requests");
    const data = await response.json();
    if (!response.ok) setError(data.error || "Unable to load demo requests");
    else {
      setRequests(data.requests || []);
      if (selected)
        setSelected(
          (data.requests || []).find(
            (item: DemoRequest) => item.id === selected.id
          ) || null
        );
    }
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const updateStatus = async (id: string, status: string) => {
    const response = await fetch("/api/internal/demo-requests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) {
      setRequests((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item))
      );
      setSelected((current) =>
        current?.id === id ? { ...current, status } : current
      );
    } else setError("Unable to update the request.");
  };
  const action = async (
    actionName: string,
    extra: Record<string, unknown> = {}
  ) => {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    const response = await fetch("/api/internal/demo-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: selected.id, action: actionName, ...extra }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Action failed");
      return;
    }
    setNotice(
      actionName === "provision"
        ? data.access_email_status === "failed"
          ? "Demo workspace created. Access email failed; use Retry Email."
          : "Demo workspace created and access email sent."
        : "Demo request updated."
    );
    setProvisionOpen(false);
    await load();
  };
  const openProvision = () => {
    if (!selected) return;
    setTemplateKey(selected.recommended_template || "");
    setDuration(7);
    setWorkspaceName(`${selected.company_name} — Demo`);
    setProvisionOpen(true);
  };
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1500, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={900}>
            Demo Requests
          </Typography>
          <Typography color="text.secondary">
            Platform-authorized review, provisioning and lifecycle management.
          </Typography>
        </Box>
        <Button onClick={load}>Refresh</Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ my: 2 }}>
          {notice}
        </Alert>
      )}
      {loading ? (
        <CircularProgress sx={{ mt: 4 }} />
      ) : (
        <Stack spacing={1.5} mt={3}>
          {requests.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              onClick={() => setSelected(item)}
              sx={{
                p: 2.5,
                cursor: "pointer",
                "&:hover": { borderColor: "primary.main", boxShadow: 2 },
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "1.4fr 1fr 1fr 1fr auto",
                  },
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography fontWeight={900}>{item.company_name}</Typography>
                  <Typography variant="body2">
                    {item.name} · {item.email}
                  </Typography>
                </Box>
                <Typography>{label(item.business_type)}</Typography>
                <Typography>{item.team_size || "—"}</Typography>
                <Chip
                  label={
                    WORKSPACE_TEMPLATES.find(
                      (template) => template.key === item.recommended_template
                    )?.name || "Selection required"
                  }
                />
                <Chip
                  color={item.status === "demo_sent" ? "success" : "default"}
                  label={label(item.status)}
                />
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 3 } }}
      >
        {selected && (
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={900}>
              {selected.company_name}
            </Typography>
            <Chip
              sx={{ alignSelf: "flex-start" }}
              label={label(selected.status)}
            />
            <Divider />
            <Box>
              <Typography fontWeight={800}>Contact</Typography>
              <Typography>{selected.name}</Typography>
              <Typography>{selected.email}</Typography>
              <Typography>{selected.phone || "—"}</Typography>
            </Box>
            <Box>
              <Typography fontWeight={800}>Business</Typography>
              <Typography>
                {label(selected.business_type)} · Team{" "}
                {selected.team_size || "—"}
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={800}>Management Interests</Typography>
              <Typography>
                {selected.management_interests?.join(", ") || "—"}
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={800}>Requirements</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>
                {selected.message || "—"}
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={800}>Recommended Template</Typography>
              <Typography>{templateName}</Typography>
            </Box>
            <Box>
              <Typography fontWeight={800}>Created</Typography>
              <Typography>
                {new Date(selected.created_at).toLocaleString()}
              </Typography>
            </Box>
            {selected.demo_workspace_id && (
              <Alert
                severity={
                  selected.access_email_status === "failed"
                    ? "warning"
                    : "success"
                }
              >
                <b>{selected.workspace_name}</b>
                <br />
                Expires:{" "}
                {selected.demo_expires_at
                  ? new Date(selected.demo_expires_at).toLocaleDateString()
                  : "—"}
                <br />
                Access email: {label(selected.access_email_status)}
                {selected.access_email_last_error ? (
                  <>
                    <br />
                    {selected.access_email_last_error}
                  </>
                ) : null}
              </Alert>
            )}
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {!selected.demo_workspace_id && (
                <Button variant="contained" onClick={openProvision}>
                  Approve & Create Demo
                </Button>
              )}
              <Button onClick={() => updateStatus(selected.id, "contacted")}>
                Contact
              </Button>
              <Button
                color="error"
                onClick={() => updateStatus(selected.id, "not_interested")}
              >
                Reject
              </Button>
              {selected.demo_workspace_id && (
                <>
                  <Button
                    href={`/workspace/?id=${encodeURIComponent(
                      selected.demo_workspace_id
                    )}`}
                  >
                    Open Demo Workspace
                  </Button>
                  <Button disabled={busy} onClick={() => action("resend")}>
                    Resend Access
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => action("extend", { days: 7 })}
                  >
                    Extend 7 Days
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      window.confirm("Reset all fictional demo rows?") &&
                      action("reset")
                    }
                  >
                    Reset Demo Data
                  </Button>
                  <Button
                    disabled={busy}
                    color="warning"
                    onClick={() => action("revoke")}
                  >
                    Revoke Demo
                  </Button>
                  <Button disabled={busy} onClick={() => action("converted")}>
                    Mark Converted
                  </Button>
                  <Button
                    disabled={busy}
                    color="error"
                    onClick={() => {
                      const confirmation = window.prompt(
                        `Type ${selected.company_name} to permanently delete this demo workspace.`,
                      );
                      if (confirmation === selected.company_name)
                        void action("delete", { confirmDelete: confirmation });
                    }}
                  >
                    Delete Demo
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        )}
      </Drawer>
      <Dialog
        open={provisionOpen}
        onClose={() => !busy && setProvisionOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Approve & Create Demo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Company"
              value={selected?.company_name || ""}
              disabled
            />
            <TextField label="Email" value={selected?.email || ""} disabled />
            <TextField
              select
              required
              label="Template"
              value={templateKey}
              onChange={(event) => setTemplateKey(event.target.value)}
            >
              {WORKSPACE_TEMPLATES.filter((item) => item.key !== "blank").map(
                (item) => (
                  <MenuItem key={item.key} value={item.key}>
                    {item.name}
                  </MenuItem>
                )
              )}
            </TextField>
            <TextField
              type="number"
              label="Demo Duration (days)"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              inputProps={{ min: 1, max: 90 }}
            />
            <TextField
              label="Workspace Name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProvisionOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !templateKey || !workspaceName.trim()}
            onClick={() =>
              action("provision", {
                templateKey,
                durationDays: duration,
                workspaceName,
              })
            }
          >
            {busy ? "Creating..." : "Create Demo Workspace"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
