"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import { useTheme } from "@mui/material/styles";
import {
  WORKSPACE_TEMPLATES,
  type WorkspaceTemplateKey,
} from "../../../workspaceTemplates";
import { authenticatedFetch, getApiUrl } from "../../apiUrl";
import { useNotification } from "../../NotificationContext";

const categories: Record<WorkspaceTemplateKey, string> = {
  freight_broker: "Logistics",
  fleet_management: "Logistics",
  crm_sales: "Sales",
  project_management: "Projects",
  construction: "Construction",
  dental_clinic: "Healthcare",
  retail_store: "Retail",
  manufacturing: "Manufacturing",
  hr_employees: "HR",
  customs_brokerage: "Logistics",
  courier_delivery: "Logistics",
  warehouse_distribution: "Logistics",
  kindergarten_nursery: "Education",
  blank: "General",
};

type CommunityTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  template_key: WorkspaceTemplateKey;
  author_name?: string;
  downloads: number;
  featured: boolean;
  official?: boolean;
  status?: string;
  created_at?: string;
  is_mine?: boolean;
  rating: number;
  review_count: number;
};
const marketplaceCategories = [
  "Logistics",
  "Sales",
  "Projects",
  "Healthcare",
  "Education",
  "Retail",
  "Construction",
  "Manufacturing",
  "Professional Services",
  "Other",
];
const templateCategory = (template: (typeof WORKSPACE_TEMPLATES)[number]) =>
  template.category ?? categories[template.key] ?? "General";

export default function MarketplacePage() {
  const theme = useTheme();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [section, setSection] = useState("Featured");
  const [installing, setInstalling] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityTemplate[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reviewing, setReviewing] = useState<CommunityTemplate | null>(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, review: "" });
  const [savingReview, setSavingReview] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    category: "Other",
    templateKey: "blank" as WorkspaceTemplateKey,
  });
  const categoryOptions = ["All", ...marketplaceCategories];
  const templates = useMemo(
    () =>
      WORKSPACE_TEMPLATES.filter(
        (template) =>
          (category === "All" || templateCategory(template) === category) &&
          `${template.name} ${template.description}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [category, query]
  );

  const loadCommunity = async () => {
    const response = await authenticatedFetch(getApiUrl("marketplace"), {
      suppressNativeErrorAlert: true,
    });
    if (response.ok) setCommunity(await response.json());
  };
  useEffect(() => {
    void loadCommunity();
  }, []);

  const publishTemplate = async (
    status: "draft" | "published" = "published"
  ) => {
    setPublishing(true);
    try {
      const response = await authenticatedFetch(getApiUrl("marketplace"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          status,
          manifest: { templateKey: draft.templateKey, version: 1 },
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Unable to publish template");
      showNotification(
        status === "draft"
          ? "Template draft saved"
          : "Template published successfully",
        "success"
      );
      setPublishOpen(false);
      setDraft({
        name: "",
        description: "",
        category: "Other",
        templateKey: "blank",
      });
      await loadCommunity();
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Unable to publish template",
        "error"
      );
    } finally {
      setPublishing(false);
    }
  };

  const saveReview = async () => {
    if (!reviewing) return;
    setSavingReview(true);
    try {
      const response = await authenticatedFetch(
        getApiUrl(`marketplace/${reviewing.id}/reviews`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewDraft),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to save review");
      showNotification("Review saved successfully", "success");
      setReviewing(null);
      setReviewDraft({ rating: 5, review: "" });
      await loadCommunity();
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Unable to save review",
        "error"
      );
    } finally {
      setSavingReview(false);
    }
  };

  const reportTemplate = async (item: CommunityTemplate) => {
    const reason = window.prompt("Why are you reporting this template?");
    if (!reason?.trim()) return;
    const response = await authenticatedFetch(getApiUrl(`marketplace/${item.id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "report", reason }) });
    showNotification(response.ok ? "Template reported for moderation" : "Unable to report template", response.ok ? "success" : "error");
  };

  const installTemplate = async (
    templateKey: WorkspaceTemplateKey,
    name: string,
    marketplaceId?: string
  ) => {
    setInstalling(templateKey);
    try {
      const response = await authenticatedFetch(getApiUrl("workspaces"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${name} Workspace`, templateKey }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Unable to install template");
      if (marketplaceId)
        await authenticatedFetch(getApiUrl(`marketplace/${marketplaceId}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation: "install" }),
          suppressNativeErrorAlert: true,
        });
      showNotification("Template installed successfully", "success");
      router.push(`/workspace?id=${data.id}`);
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Unable to install template",
        "error"
      );
    } finally {
      setInstalling(null);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 1240,
        mx: "auto",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Chip
            icon={<WorkspacePremiumRoundedIcon />}
            label="SMART MANAGE MARKETPLACE"
            color="primary"
            variant="outlined"
            sx={{ mb: 1.5, fontWeight: 900 }}
          />
          <Typography
            variant="h3"
            sx={{
              fontWeight: 950,
              letterSpacing: "-0.05em",
              fontSize: { xs: "2.2rem", md: "3.4rem" },
            }}
          >
            Start with a proven workflow.
          </Typography>
          <Typography
            sx={{ mt: 1, color: "text.secondary", fontSize: "1.05rem" }}
          >
            Install complete boards, columns, formulas and sample data in one
            click.
          </Typography>
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          gap={1.5}
          alignSelf={{ md: "flex-end" }}
        >
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            InputProps={{
              startAdornment: (
                <SearchRoundedIcon sx={{ mr: 1, color: "text.secondary" }} />
              ),
            }}
            sx={{
              minWidth: { md: 300 },
              "& .MuiOutlinedInput-root": { borderRadius: 3 },
            }}
          />
          <Button
            variant="contained"
            startIcon={<PublishRoundedIcon />}
            onClick={() => setPublishOpen(true)}
            sx={{ borderRadius: 3, fontWeight: 900, whiteSpace: "nowrap" }}
          >
            Publish template
          </Button>
        </Stack>
      </Stack>
      <Stack direction="row" gap={1} sx={{ overflowX: "auto", pb: 2, mb: 2 }}>
        {categoryOptions.map((item) => (
          <Chip
            key={item}
            label={item}
            clickable
            color={category === item ? "primary" : "default"}
            variant={category === item ? "filled" : "outlined"}
            onClick={() => setCategory(item)}
            sx={{ fontWeight: 800 }}
          />
        ))}
      </Stack>
      <Stack direction="row" gap={1} sx={{ overflowX: "auto", pb: 2, mb: 2 }}>
        {[
          "Featured",
          "Most Popular",
          "New",
          "Top Rated",
          "Official",
          "Community",
          "My Templates",
        ].map((item) => (
          <Chip
            key={item}
            label={item}
            clickable
            color={section === item ? "primary" : "default"}
            onClick={() => setSection(item)}
            sx={{ fontWeight: 800 }}
          />
        ))}
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2,1fr)",
            lg: "repeat(3,1fr)",
          },
          gap: 2.5,
        }}
      >
        {templates.map((template, index) => (
          <Box
            key={template.key}
            sx={{
              p: 3,
              borderRadius: 5,
              border: `1px solid ${theme.palette.divider}`,
              background:
                theme.palette.mode === "dark"
                  ? `linear-gradient(145deg, ${alpha(
                      template.color,
                      0.14
                    )}, rgba(10,10,16,.94))`
                  : `linear-gradient(145deg, ${alpha(
                      template.color,
                      0.1
                    )}, #fff)`,
              transition: "transform .2s, box-shadow .2s",
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: `0 22px 55px ${alpha(template.color, 0.2)}`,
              },
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: 3.5,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 28,
                  bgcolor: alpha(template.color, 0.14),
                }}
              >
                {template.icon}
              </Box>
              {index < 3 && (
                <Chip
                  label="Featured"
                  size="small"
                  sx={{ color: template.color, fontWeight: 900 }}
                />
              )}
            </Stack>
            <Typography variant="h6" sx={{ mt: 2.5, fontWeight: 950 }}>
              {template.name}
            </Typography>
            <Typography
              sx={{ color: "text.secondary", minHeight: 52, mt: 0.75 }}
            >
              {template.description}
            </Typography>
            <Stack direction="row" alignItems="center" gap={1} sx={{ my: 2 }}>
              <Rating value={4.7} precision={0.1} readOnly size="small" />
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 800 }}
              >
                4.7 · {template.boards.length} boards
              </Typography>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              startIcon={
                installing === template.key ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DownloadRoundedIcon />
                )
              }
              disabled={Boolean(installing)}
              onClick={() => installTemplate(template.key, template.name)}
              sx={{
                borderRadius: 3,
                py: 1.2,
                fontWeight: 900,
                bgcolor: template.color,
                "&:hover": {
                  bgcolor: template.color,
                  filter: "brightness(.9)",
                },
              }}
            >
              {installing === template.key ? "Installing..." : "Use template"}
            </Button>
          </Box>
        ))}
      </Box>
      {community.length > 0 && (
        <>
          <Typography variant="h4" sx={{ fontWeight: 950, mt: 6, mb: 2.5 }}>
            {section}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2,1fr)",
                lg: "repeat(3,1fr)",
              },
              gap: 2.5,
            }}
          >
            {community
              .filter(
                (item) =>
                  (category === "All" || item.category === category) &&
                  `${item.name} ${item.description}`
                    .toLowerCase()
                    .includes(query.toLowerCase()) &&
                  (section !== "Featured" || item.featured) &&
                  (section !== "Top Rated" || Number(item.rating) >= 4) &&
                  (section !== "Official" || item.official) &&
                  (section !== "Community" || !item.official) &&
                  (section !== "My Templates" || item.is_mine)
              )
              .sort((a, b) =>
                section === "New"
                  ? String(b.created_at).localeCompare(String(a.created_at))
                  : section === "Top Rated"
                    ? Number(b.rating) - Number(a.rating)
                    : b.downloads - a.downloads
              )
              .map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 3,
                    borderRadius: 5,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: "background.paper",
                  }}
                >
                  <Chip
                    label={item.featured ? "Featured community" : item.category}
                    size="small"
                    color={item.featured ? "primary" : "default"}
                  />
                  <Typography variant="h6" sx={{ mt: 2, fontWeight: 950 }}>
                    {item.name}
                  </Typography>
                  <Typography
                    sx={{ color: "text.secondary", minHeight: 52, mt: 0.75 }}
                  >
                    {item.description}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    By {item.author_name || "Smart Manage creator"}
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1}
                    sx={{ my: 2 }}
                  >
                    <Rating value={Number(item.rating)} readOnly size="small" />
                    <Typography variant="caption">
                      {item.review_count} reviews · {item.downloads} installs
                    </Typography>
                  </Stack>
                  <Stack direction="row" gap={1}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() =>
                        installTemplate(item.template_key, item.name, item.id)
                      }
                      disabled={Boolean(installing)}
                      sx={{ borderRadius: 3, fontWeight: 900 }}
                    >
                      Use template
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setReviewing(item)}
                      sx={{
                        borderRadius: 3,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Rate & review
                    </Button>
                    <Button variant="text" color="error" onClick={() => reportTemplate(item)}>Report</Button>
                  </Stack>
                </Box>
              ))}
          </Box>
        </>
      )}
      <Dialog
        open={publishOpen}
        onClose={() => !publishing && setPublishOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 950 }}>
          Publish to Marketplace
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: "12px !important" }}>
          <TextField
            label="Template name"
            value={draft.name}
            onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))}
            required
          />
          <TextField
            label="Description"
            multiline
            minRows={3}
            value={draft.description}
            onChange={(e) =>
              setDraft((v) => ({ ...v, description: e.target.value }))
            }
            required
          />
          <TextField
            select
            label="Category"
            value={draft.category}
            onChange={(e) =>
              setDraft((v) => ({ ...v, category: e.target.value }))
            }
          >
            {categoryOptions
              .filter((v) => v !== "All")
              .map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            label="Base template"
            value={draft.templateKey}
            onChange={(e) =>
              setDraft((v) => ({
                ...v,
                templateKey: e.target.value as WorkspaceTemplateKey,
              }))
            }
          >
            {WORKSPACE_TEMPLATES.map((v) => (
              <MenuItem key={v.key} value={v.key}>
                {v.icon} {v.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPublishOpen(false)}>Cancel</Button>
          <Button
            disabled={publishing || !draft.name.trim() || !draft.description.trim()}
            onClick={() => publishTemplate("draft")}
          >
            Save draft
          </Button>
          <Button
            variant="contained"
            disabled={
              publishing || !draft.name.trim() || !draft.description.trim()
            }
            onClick={() => publishTemplate("published")}
          >
            {publishing ? "Publishing..." : "Publish"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(reviewing)}
        onClose={() => !savingReview && setReviewing(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 950 }}>
          Review {reviewing?.name}
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: "12px !important" }}>
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>Your rating</Typography>
            <Rating
              value={reviewDraft.rating}
              onChange={(_, value) =>
                setReviewDraft((v) => ({ ...v, rating: value || 1 }))
              }
              size="large"
            />
          </Box>
          <TextField
            label="Review"
            multiline
            minRows={4}
            value={reviewDraft.review}
            onChange={(e) =>
              setReviewDraft((v) => ({ ...v, review: e.target.value }))
            }
            placeholder="Share what worked well..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setReviewing(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={savingReview}
            onClick={saveReview}
          >
            {savingReview ? "Saving..." : "Save review"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
