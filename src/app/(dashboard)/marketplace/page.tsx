"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { alpha, Box, Button, Chip, CircularProgress, Rating, Stack, TextField, Typography } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { useTheme } from "@mui/material/styles";
import { WORKSPACE_TEMPLATES, type WorkspaceTemplateKey } from "../../../workspaceTemplates";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
import { useNotification } from "../../NotificationContext";

const categories: Record<WorkspaceTemplateKey, string> = {
  freight_broker: "Logistics", fleet_management: "Logistics", crm_sales: "Sales",
  project_management: "Projects", construction: "Construction", dental_clinic: "Healthcare",
  retail_store: "Retail", manufacturing: "Manufacturing", hr_employees: "HR", blank: "General",
};

export default function MarketplacePage() {
  const theme = useTheme();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [installing, setInstalling] = useState<string | null>(null);
  const categoryOptions = ["All", ...Array.from(new Set(Object.values(categories)))];
  const templates = useMemo(() => WORKSPACE_TEMPLATES.filter((template) =>
    (category === "All" || categories[template.key] === category) &&
    `${template.name} ${template.description}`.toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  const installTemplate = async (templateKey: WorkspaceTemplateKey, name: string) => {
    setInstalling(templateKey);
    try {
      const response = await authenticatedFetch(getApiUrl("workspaces"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${name} Workspace`, templateKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to install template");
      showNotification("Template installed successfully", "success");
      router.push(`/workspace?id=${data.id}`);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : "Unable to install template", "error");
    } finally { setInstalling(null); }
  };

  return <Box sx={{ maxWidth: 1240, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} sx={{ mb: 4 }}>
      <Box>
        <Chip icon={<WorkspacePremiumRoundedIcon />} label="SMART MANAGE MARKETPLACE" color="primary" variant="outlined" sx={{ mb: 1.5, fontWeight: 900 }} />
        <Typography variant="h3" sx={{ fontWeight: 950, letterSpacing: "-0.05em", fontSize: { xs: "2.2rem", md: "3.4rem" } }}>Start with a proven workflow.</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary", fontSize: "1.05rem" }}>Install complete boards, columns, formulas and sample data in one click.</Typography>
      </Box>
      <TextField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates..." InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: "text.secondary" }} /> }} sx={{ minWidth: { md: 320 }, alignSelf: { md: "flex-end" }, "& .MuiOutlinedInput-root": { borderRadius: 3 } }} />
    </Stack>
    <Stack direction="row" gap={1} sx={{ overflowX: "auto", pb: 2, mb: 2 }}>
      {categoryOptions.map((item) => <Chip key={item} label={item} clickable color={category === item ? "primary" : "default"} variant={category === item ? "filled" : "outlined"} onClick={() => setCategory(item)} sx={{ fontWeight: 800 }} />)}
    </Stack>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)" }, gap: 2.5 }}>
      {templates.map((template, index) => <Box key={template.key} sx={{ p: 3, borderRadius: 5, border: `1px solid ${theme.palette.divider}`, background: theme.palette.mode === "dark" ? `linear-gradient(145deg, ${alpha(template.color, .14)}, rgba(10,10,16,.94))` : `linear-gradient(145deg, ${alpha(template.color, .1)}, #fff)`, transition: "transform .2s, box-shadow .2s", "&:hover": { transform: "translateY(-5px)", boxShadow: `0 22px 55px ${alpha(template.color, .2)}` } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box sx={{ width: 54, height: 54, borderRadius: 3.5, display: "grid", placeItems: "center", fontSize: 28, bgcolor: alpha(template.color, .14) }}>{template.icon}</Box>{index < 3 && <Chip label="Featured" size="small" sx={{ color: template.color, fontWeight: 900 }} />}</Stack>
        <Typography variant="h6" sx={{ mt: 2.5, fontWeight: 950 }}>{template.name}</Typography>
        <Typography sx={{ color: "text.secondary", minHeight: 52, mt: .75 }}>{template.description}</Typography>
        <Stack direction="row" alignItems="center" gap={1} sx={{ my: 2 }}><Rating value={4.7} precision={0.1} readOnly size="small" /><Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>4.7 · {template.boards.length} boards</Typography></Stack>
        <Button fullWidth variant="contained" startIcon={installing === template.key ? <CircularProgress size={16} color="inherit" /> : <DownloadRoundedIcon />} disabled={Boolean(installing)} onClick={() => installTemplate(template.key, template.name)} sx={{ borderRadius: 3, py: 1.2, fontWeight: 900, bgcolor: template.color, "&:hover": { bgcolor: template.color, filter: "brightness(.9)" } }}>{installing === template.key ? "Installing..." : "Use template"}</Button>
      </Box>)}
    </Box>
  </Box>;
}
