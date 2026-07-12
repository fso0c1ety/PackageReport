"use client";

import React, { useEffect, useState } from "react";
import { Alert, Avatar, Box, Card, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";

type Reminder = { id: string; title: string; type: string; dueDate: string | null; daysRemaining: number; kmRemaining?: number; severity: "overdue" | "urgent" | "upcoming" };

export default function MaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    authenticatedFetch(getApiUrl("maintenance/reminders"), { suppressNativeErrorAlert: true })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load reminders"); return response.json(); })
      .then((data) => setReminders(Array.isArray(data.reminders) ? data.reminders : []))
      .catch(() => setError("Unable to load maintenance reminders."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ maxWidth: 1180, mx: "auto", px: { xs: 1.5, md: 4 }, py: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" gap={1.5} mb={3}><Avatar sx={{ bgcolor: "rgba(168,85,247,.16)", color: "#a855f7" }}><BuildRoundedIcon /></Avatar><Box><Typography variant="h4" fontWeight={900}>Fleet Maintenance</Typography><Typography color="text.secondary">Insurance, registration, service, oil, tires and tachograph reminders.</Typography></Box></Stack>
      {loading && <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && reminders.length === 0 && <Alert severity="success">No maintenance deadlines are due in the next 30 days.</Alert>}
      <Stack gap={1.5}>{reminders.map((reminder) => { const color = reminder.severity === "overdue" ? "#ef4444" : reminder.severity === "urgent" ? "#f59e0b" : "#3b82f6"; const deadline = reminder.dueDate ? new Date(reminder.dueDate).toLocaleDateString() : `${reminder.kmRemaining ?? 0} km remaining`; return <Card key={reminder.id} sx={{ p: 2.25, borderRadius: 3, borderLeft: `4px solid ${color}`, bgcolor: "action.hover" }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}><Box><Typography fontWeight={800}>{reminder.title}</Typography><Typography color="text.secondary" variant="body2">{reminder.type} · {deadline}</Typography></Box><Chip label={reminder.dueDate ? (reminder.daysRemaining < 0 ? `${Math.abs(reminder.daysRemaining)} days overdue` : reminder.daysRemaining === 0 ? "Due today" : `${reminder.daysRemaining} days left`) : reminder.kmRemaining !== undefined && reminder.kmRemaining < 0 ? `${Math.abs(reminder.kmRemaining)} km overdue` : `${reminder.kmRemaining ?? 0} km left`} sx={{ bgcolor: `${color}1f`, color, fontWeight: 800 }} /></Stack></Card>; })}</Stack>
    </Box>
  );
}
