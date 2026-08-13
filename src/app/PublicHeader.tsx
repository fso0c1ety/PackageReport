"use client";

import { useState } from "react";
import Link from "next/link";
import { AppBar, Box, Button, Container, Divider, Drawer, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";

type PublicHeaderProps = { active?: "landing" | "signin" | "signup"; authenticated?: boolean; onSectionNavigate?: (sectionId: string) => void };
const sections = [["Product", "product"], ["Solutions", "solutions"], ["Templates", "templates"]] as const;
const desktopDownloadUrl = "https://github.com/fso0c1ety/PackageReport/releases/latest/download/Smart.Manage.zip";

export default function PublicHeader({ active = "landing", authenticated = false, onSectionNavigate }: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sectionHref = (id: string) => active === "landing" ? `#${id}` : `/#${id}`;
  const navigateSection = (id: string) => { setMobileOpen(false); if (active === "landing" && onSectionNavigate) onSectionNavigate(id) };
  const navSx = { color: "#64748b", textTransform: "none", fontSize: ".96rem", fontWeight: 700, px: 1, minWidth: "auto", "&:hover": { bgcolor: "transparent", color: "#0f172a" } };
  return <>
    <AppBar position="sticky" color="transparent" elevation={0} sx={{ top: 0, zIndex: 30, background: "rgba(251,251,255,.9)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(15,23,42,.07)", boxShadow: "none" }}>
      <Container maxWidth="xl"><Toolbar disableGutters sx={{ minHeight: 78, display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Stack component={Link} href="/" direction="row" spacing={1.25} alignItems="center" sx={{ color: "#0f172a", textDecoration: "none", minWidth: 0 }}><Box component="img" src="/icon.png" alt="Smart Manage logo" sx={{ width: 40, height: 40, borderRadius: "12px", objectFit: "cover" }} /><Typography sx={{ fontSize: "1.18rem", fontWeight: 900, letterSpacing: "-.04em", whiteSpace: "nowrap" }}>Smart Manage</Typography></Stack>
        <Stack component="nav" aria-label="Public navigation" direction="row" spacing={2.5} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>{sections.map(([label, id]) => <Button key={id} component={Link} href={sectionHref(id)} onClick={() => navigateSection(id)} sx={navSx}>{label}</Button>)}<Button component={Link} href="/pricing" sx={navSx}>Pricing</Button></Stack>
        <Stack direction="row" spacing={1.15} alignItems="center">
          <Button component="a" href={desktopDownloadUrl} startIcon={<DownloadIcon />} sx={{ ...navSx, display: { xs: "none", lg: "inline-flex" }, color: "#6366f1" }}>Download</Button>
          {authenticated && <Button component={Link} href="/home" sx={{ ...navSx, color: "#6366f1" }}>Open Smart Manage</Button>}
          <Button component={Link} href={sectionHref("request-demo")} onClick={() => navigateSection("request-demo")} variant="outlined" sx={{ display: { xs: "none", md: "inline-flex" }, borderRadius: 999, px: 2, textTransform: "none", fontWeight: 800, borderColor: "#6366f1", color: "#6366f1" }}>Request Demo</Button>
          <Button component={Link} href="/login" aria-current={active === "signin" ? "page" : undefined} sx={{ display: { xs: "none", sm: "inline-flex" }, color: active === "signin" ? "#fff" : "#0f172a", bgcolor: active === "signin" ? "#11152d" : "transparent", borderRadius: 999, px: 2, textTransform: "none", fontWeight: 800, "&:hover": { bgcolor: active === "signin" ? "#272b4d" : "rgba(99,102,241,.06)" } }}>Sign In</Button>
          <Button component={Link} href="/login?mode=signup" aria-current={active === "signup" ? "page" : undefined} variant="contained" sx={{ display: { xs: "none", md: "inline-flex" }, borderRadius: 999, px: 2.2, fontWeight: 800, textTransform: "none", bgcolor: "#6366f1", boxShadow: "none", "&:hover": { bgcolor: "#4f46e5", boxShadow: "none" } }}>Start Free</Button>
          <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ display: { xs: "inline-flex", md: "none" }, width: 44, height: 44, border: "1px solid rgba(15,23,42,.08)", color: "#0f172a" }}><MenuRoundedIcon /></IconButton>
        </Stack>
      </Toolbar></Container>
    </AppBar>
    <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { width: "min(88vw,390px)", bgcolor: "#12152f", color: "#fff", p: 3, borderRadius: "28px 0 0 28px" } }}><Stack sx={{ height: "100%" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between"><Stack component={Link} href="/" onClick={() => setMobileOpen(false)} direction="row" spacing={1.2} alignItems="center" sx={{ color: "inherit", textDecoration: "none" }}><Box component="img" src="/icon.png" alt="Smart Manage" sx={{ width: 40, height: 40, borderRadius: 2.5 }} /><Typography sx={{ fontWeight: 900, letterSpacing: "-.04em", fontSize: "1.15rem" }}>Smart Manage</Typography></Stack><IconButton aria-label="Close navigation" onClick={() => setMobileOpen(false)} sx={{ color: "#fff", bgcolor: "rgba(255,255,255,.08)" }}><CloseRoundedIcon /></IconButton></Stack>
      <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,.1)" }} />
      <Stack component="nav" aria-label="Mobile public navigation" spacing={.6}>{[["Home", "top"] as const, ...sections, ["Request Demo", "request-demo"] as const].map(([label,id], index) => <Button key={id} component={Link} href={sectionHref(id)} onClick={() => navigateSection(id)} endIcon={<ArrowOutwardRoundedIcon />} sx={{ justifyContent: "space-between", color: "#fff", textTransform: "none", fontSize: "1.2rem", fontWeight: 800, py: 1.35, px: 1, borderBottom: "1px solid rgba(255,255,255,.08)", borderRadius: 0 }}><Stack direction="row" spacing={1.4}><Typography sx={{ color: "rgba(255,255,255,.35)", fontWeight: 700 }}>0{index + 1}</Typography><span>{label}</span></Stack></Button>)}<Button component={Link} href="/pricing" onClick={() => setMobileOpen(false)} endIcon={<ArrowOutwardRoundedIcon />} sx={{ justifyContent: "space-between", color: "#fff", textTransform: "none", fontSize: "1.2rem", fontWeight: 800, py: 1.35, px: 1 }}>Pricing</Button><Button component="a" href={desktopDownloadUrl} onClick={() => setMobileOpen(false)} startIcon={<DownloadIcon />} sx={{ justifyContent: "flex-start", color: "#fff", textTransform: "none", fontWeight: 800, px: 1 }}>Download</Button></Stack>
      <Stack spacing={1.2} sx={{ mt: "auto" }}><Button component={Link} href="/login" onClick={() => setMobileOpen(false)} sx={{ color: "#fff", border: "1px solid rgba(255,255,255,.22)", borderRadius: 999, py: 1.35, textTransform: "none", fontWeight: 800 }}>Sign In</Button><Button component={Link} href="/login?mode=signup" onClick={() => setMobileOpen(false)} sx={{ color: "#11152d", bgcolor: "#9ff3d9", borderRadius: 999, py: 1.4, textTransform: "none", fontWeight: 900 }}>Start Free</Button></Stack>
    </Stack></Drawer>
  </>;
}
