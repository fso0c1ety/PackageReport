"use client";

import { useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from "@mui/material";
import { WORKSPACE_TEMPLATES } from "../workspaceTemplates";

const TEAM_SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"];
const INTERESTS = ["Operations", "Tasks", "Customers", "Projects", "Logistics", "Employees", "Finance", "Documents", "Inventory", "Appointments", "Reporting", "Other"];
const fieldSx = {
  "& .MuiInputBase-root": { color: "#11162F", bgcolor: "rgba(255,255,255,.72)" },
  "& .MuiInputBase-input": { color: "#11162F", WebkitTextFillColor: "#11162F", caretColor: "#4F46E5", fontWeight: 600 },
  "& .MuiInputBase-input::placeholder": { color: "#64748B", opacity: 1 },
  "& .MuiInputLabel-root": { color: "#64748B" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#4F46E5" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#CBD5E1" },
  "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#4F46E5", borderWidth: 2 },
  "& input:-webkit-autofill, & textarea:-webkit-autofill": { WebkitTextFillColor: "#11162F", WebkitBoxShadow: "0 0 0 1000px #fff inset" },
};

export default function DemoRequestForm() {
  const [startedAt] = useState(() => Date.now());
  const [values, setValues] = useState({ name: "", companyName: "", email: "", phone: "", businessType: "", teamSize: "", message: "", website: "" });
  const [interests, setInterests] = useState<string[]>([]);
  const [state, setState] = useState<{ sending: boolean; error: string; success: boolean }>({ sending: false, error: "", success: false });
  const set = (name: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [name]: event.target.value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setState({ sending: true, error: "", success: false });
    try {
      const response = await fetch("/api/demo-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, managementInterests: interests, startedAt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit your request");
      setState({ sending: false, error: "", success: true });
    } catch (error) { setState({ sending: false, error: error instanceof Error ? error.message : "Unable to submit your request", success: false }); }
  };
  return <Box component="form" onSubmit={submit} noValidate sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
    <TextField sx={fieldSx} required label="Full Name" value={values.name} onChange={set("name")} inputProps={{ maxLength: 120 }} />
    <TextField sx={fieldSx} required label="Company Name" value={values.companyName} onChange={set("companyName")} inputProps={{ maxLength: 160 }} />
    <TextField sx={fieldSx} required type="email" label="Work Email" value={values.email} onChange={set("email")} inputProps={{ maxLength: 200 }} />
    <TextField sx={fieldSx} label="Phone" value={values.phone} onChange={set("phone")} inputProps={{ maxLength: 60 }} />
    <TextField sx={fieldSx} required select label="Business Type" value={values.businessType} onChange={set("businessType")}>
      {WORKSPACE_TEMPLATES.filter((template) => template.key !== "blank").map((template) => <MenuItem key={template.key} value={template.key}>{template.name}</MenuItem>)}
    </TextField>
    <TextField sx={fieldSx} select label="Team Size" value={values.teamSize} onChange={set("teamSize")}><MenuItem value="">Not specified</MenuItem>{TEAM_SIZES.map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}</TextField>
    <Box sx={{ gridColumn: "1/-1" }}><Typography fontWeight={800} mb={1}>Management Interests</Typography><Box sx={{ display: "flex", flexWrap: "wrap", gap: .5 }}>{INTERESTS.map((interest) => <FormControlLabel key={interest} control={<Checkbox checked={interests.includes(interest)} onChange={(_, checked) => setInterests((current) => checked ? [...current, interest] : current.filter((item) => item !== interest))} />} label={interest} />)}</Box></Box>
    <TextField sx={{ ...fieldSx, gridColumn: "1/-1" }} multiline minRows={4} label="Message / Requirements" value={values.message} onChange={set("message")} inputProps={{ maxLength: 3000 }} />
    <Box component="input" aria-hidden tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} sx={{ position: "absolute", left: -10000, width: 1, height: 1 }} />
    {state.error && <Alert severity="error" sx={{ gridColumn: "1/-1" }}>{state.error}</Alert>}
    {state.success && <Alert severity="success" sx={{ gridColumn: "1/-1" }}>Thank you. Our team will contact you about your Smart Manage demo.</Alert>}
    <Button type="submit" variant="contained" disabled={state.sending} sx={{ gridColumn: "1/-1", minHeight: 52, bgcolor: "#6D4AFF", fontWeight: 900 }}>{state.sending ? "Submitting..." : "Request Demo"}</Button>
  </Box>;
}
