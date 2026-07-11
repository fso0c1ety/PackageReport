"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Drawer,
  IconButton,
  Divider,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { motion } from "framer-motion";
import { navigateToAppRoute, redirectToAppRoute, isElectronRuntime } from "./apiUrl";

export default function LandingPage() {
  const router = useRouter();
  const [showWebLanding, setShowWebLanding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Landing page is always light — never affected by dark/light mode setting.
  const LIGHT = {
    bg: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#475569',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    border: 'rgba(15, 23, 42, 0.08)',
    chip: 'rgba(99, 102, 241, 0.35)',
  };

  const serviceItems = [
    {
      title: "Workflow setup",
      description: "Build structured package pipelines, task stages, and clear team ownership in one place.",
    },
    {
      title: "Automation help",
      description: "Reduce manual follow-ups with reminders, status rules, and repeatable automations.",
    },
    {
      title: "Reporting & visibility",
      description: "Track progress, bottlenecks, and delivery health with simple dashboards and live updates.",
    },
  ];

  const aboutValues = ["Clear visibility", "Fast collaboration", "Reliable workflow tracking"];
  const desktopDownloadUrl =
    "https://github.com/fso0c1ety/PackageReport/releases/latest/download/Smart.Manage.zip";

  const contactOptions = [
    {
      title: "Sales questions",
      text: "Learn how PackageReport can fit your workflow and reporting needs.",
    },
    {
      title: "Product support",
      text: "Get help with setup, onboarding, or daily workspace usage.",
    },
    {
      title: "Partnerships",
      text: "Reach out if you want to collaborate or integrate with our platform.",
    },
  ];

  const navButtonSx = {
    color: LIGHT.textSecondary,
    textTransform: "none",
    fontSize: "0.96rem",
    fontWeight: 600,
    px: 1,
    minWidth: "auto",
    "&:hover": {
      backgroundColor: "transparent",
      color: LIGHT.text,
    },
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasToken = !!localStorage.getItem("token");

    if (Capacitor.isNativePlatform() || isElectronRuntime()) {
      const target = hasToken ? "/home" : "/login";
      redirectToAppRoute(target);
      return;
    }

    if (hasToken) {
      // Use a hard navigation on initial web startup to avoid occasional client-router stalls
      // when a stale tab/session is resumed after deploys or expired auth state.
      redirectToAppRoute("/home", true);
      return;
    }

    setShowWebLanding(true);
  }, [router]);

  const handleGetStarted = () => {
    navigateToAppRoute("/login?mode=signup", router);
  };

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!showWebLanding) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: LIGHT.bg, display: "flex", alignItems: "center", justifyContent: "center", px: 3 }}>
        <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography sx={{ fontSize: "1.15rem", fontWeight: 800, color: LIGHT.text }}>Opening Smart Manage...</Typography>
          <Typography sx={{ color: LIGHT.textSecondary, maxWidth: 320 }}>Preparing your workspace for mobile.</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      id="top"
      sx={{
        minHeight: "100vh",
        color: LIGHT.text,
        background: "linear-gradient(180deg, #fbfbff 0%, #ffffff 42%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navigation Bar */}
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          top: 0,
          zIndex: 30,
          background: "rgba(251,251,255,.86)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(15,23,42,.07)",
          boxShadow: "none",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              minHeight: 78,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              sx={{ alignItems: "center", cursor: "pointer", minWidth: 0 }}
              onClick={() => navigateToAppRoute("/", router)}
            >
              <Box
                component="img"
                src="/icon.png"
                alt="PackageReport logo"
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  objectFit: "cover",
                }}
              />
              <Typography
                sx={{
                  fontSize: "1.18rem",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: LIGHT.text,
                }}
              >
                Smart Manage
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={3}
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
              }}
            >
              <Button onClick={() => scrollToSection("top")} sx={navButtonSx}>Home</Button>
              <Button onClick={() => scrollToSection("services")} sx={navButtonSx}>Services</Button>
              <Button onClick={() => scrollToSection("about")} sx={navButtonSx}>About Us</Button>
              <Button onClick={() => navigateToAppRoute("/pricing", router)} sx={navButtonSx}>Pricing</Button>
              <Button onClick={() => scrollToSection("contact")} sx={navButtonSx}>Contact</Button>
            </Stack>

            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              <Button
                component="a"
                href={desktopDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<DownloadIcon />}
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  color: LIGHT.text,
                  borderRadius: 999,
                  px: 2,
                  py: 0.8,
                  textTransform: "none",
                  fontWeight: 700,
                  border: `1px solid ${LIGHT.border}`,
                  backgroundColor: "#fff",
                  "&:hover": { backgroundColor: "#f8fafc", borderColor: LIGHT.primary },
                }}
              >
                Download
              </Button>
              <Button
                onClick={() => navigateToAppRoute("/login", router)}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  color: "#fff",
                  borderRadius: 999,
                  px: 2,
                  py: 0.8,
                  textTransform: "none",
                  fontWeight: 700,
                  backgroundColor: LIGHT.primary,
                  "&:hover": { backgroundColor: LIGHT.primaryDark },
                }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                onClick={() => navigateToAppRoute("/login?mode=signup", router)}
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  borderRadius: 999,
                  px: 2.2,
                  py: 0.9,
                  fontWeight: 700,
                  textTransform: "none",
                  background: LIGHT.primary,
                  boxShadow: "none",
                  "&:hover": { background: LIGHT.primaryDark, boxShadow: "none" },
                }}
              >
                Sign Up
              </Button>
              <IconButton
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                sx={{ display: { xs: "inline-flex", md: "none" }, width: 44, height: 44, border: `1px solid ${LIGHT.border}`, color: LIGHT.text }}
              >
                <MenuRoundedIcon />
              </IconButton>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{ sx: { width: "min(88vw, 390px)", bgcolor: "#12152f", color: "#fff", p: 3, borderRadius: "28px 0 0 28px" } }}
      >
        <Stack sx={{ height: "100%" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Box component="img" src="/icon.png" alt="Smart Manage" sx={{ width: 40, height: 40, borderRadius: 2.5 }} />
              <Typography sx={{ fontWeight: 900, letterSpacing: "-.04em", fontSize: "1.15rem" }}>Smart Manage</Typography>
            </Stack>
            <IconButton aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} sx={{ color: "#fff", bgcolor: "rgba(255,255,255,.08)" }}><CloseRoundedIcon /></IconButton>
          </Stack>
          <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,.1)" }} />
          <Stack spacing={.6}>
            {[['Home','top'],['Services','services'],['About Us','about'],['Contact','contact']].map(([label,id], index) => (
              <Button key={id} onClick={() => scrollToSection(id)} endIcon={<ArrowOutwardRoundedIcon />} sx={{ justifyContent: "space-between", color: "#fff", textTransform: "none", fontSize: "1.3rem", fontWeight: 800, py: 1.5, px: 1, borderBottom: "1px solid rgba(255,255,255,.08)", borderRadius: 0 }}>
                <Stack direction="row" spacing={1.4}><Typography sx={{ color: "rgba(255,255,255,.35)", fontWeight: 700 }}>0{index + 1}</Typography><span>{label}</span></Stack>
              </Button>
            ))}
            <Button onClick={() => navigateToAppRoute('/pricing', router)} endIcon={<ArrowOutwardRoundedIcon />} sx={{ justifyContent: "space-between", color: "#fff", textTransform: "none", fontSize: "1.3rem", fontWeight: 800, py: 1.5, px: 1, borderBottom: "1px solid rgba(255,255,255,.08)", borderRadius: 0 }}>Pricing</Button>
          </Stack>
          <Stack spacing={1.2} sx={{ mt: "auto" }}>
            <Button onClick={() => navigateToAppRoute('/login', router)} sx={{ color: "#fff", border: "1px solid rgba(255,255,255,.22)", borderRadius: 999, py: 1.35, textTransform: "none", fontWeight: 800 }}>Login</Button>
            <Button onClick={() => navigateToAppRoute('/login?mode=signup', router)} sx={{ color: "#11152d", bgcolor: "#9ff3d9", borderRadius: 999, py: 1.4, textTransform: "none", fontWeight: 900, '&:hover': { bgcolor: '#86e8ca' } }}>Start free trial</Button>
          </Stack>
        </Stack>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, py: { xs: 5, md: 8 } }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.05fr .95fr" },
              gap: { xs: 5, md: 8 },
              alignItems: "center",
              minHeight: { md: "70vh" },
            }}
          >
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Stack spacing={4}>
                <Chip
                  label="ALL-IN-ONE WORKSPACE"
                  sx={{ alignSelf: "flex-start", bgcolor: "#f1efff", color: LIGHT.primaryDark, fontWeight: 900, letterSpacing: ".16em", fontSize: ".72rem", borderRadius: 2, px: .7 }}
                />

                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: "2.8rem", sm: "3.7rem", md: "5.2rem" },
                    lineHeight: .96,
                    fontWeight: 900,
                    letterSpacing: "-0.065em",
                  }}
                >
                  Manage everything.<br />One place.<br /><Box component="span" sx={{ color: LIGHT.primary }}>Zero chaos.</Box>
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: "1rem", md: "1.2rem" },
                    color: 'rgba(15,23,42,0.82)',
                    lineHeight: 1.7,
                  }}
                >
                  Organize projects, tasks, teams and deadlines without switching between multiple apps.
                </Typography>

                <Stack direction="row" spacing={{ xs: 1.4, sm: 2.4 }} flexWrap="wrap" useFlexGap>
                  {["Projects", "Tasks", "Calendar", "Reports", "Team Chat"].map((feature) => (
                    <Stack key={feature} direction="row" spacing={.65} alignItems="center">
                      <CheckCircleRoundedIcon sx={{ fontSize: 18, color: LIGHT.primary }} />
                      <Typography sx={{ fontSize: ".92rem", fontWeight: 700 }}>{feature}</Typography>
                    </Stack>
                  ))}
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigateToAppRoute("/login", router)}
                    sx={{
                      borderRadius: 999, px: 4, py: 1.5, fontWeight: 900,
                      textTransform: "none", background: "#171a38", boxShadow: "none",
                      "&:hover": { background: LIGHT.primaryDark, boxShadow: "none" },
                    }}
                  >
                    Explore workspace
                  </Button>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigateToAppRoute("/login?mode=signup", router)}
                    sx={{
                      borderRadius: 999, px: 4, py: 1.5, fontWeight: 900,
                      textTransform: "none", background: "transparent", color: LIGHT.text, border: `1px solid ${LIGHT.border}`, boxShadow: "none",
                      "&:hover": { background: LIGHT.primaryDark, boxShadow: "none" },
                    }}
                  >
                    Start free
                  </Button>

                </Stack>
              </Stack>
            </motion.div>

            {/* Right Content - Real dashboard phone preview */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  minHeight: { xs: 530, sm: 640, md: 690 },
                  background: "radial-gradient(circle at 52% 45%, rgba(99,102,241,.22), transparent 57%)",
                  overflow: "visible",
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    width: { xs: 285, sm: 340, md: 365 },
                    height: { xs: 540, sm: 630, md: 675 },
                    borderRadius: { xs: "42px", md: "52px" },
                    p: "9px",
                    background: "linear-gradient(145deg,#1f2031 0%,#03040a 42%,#38394b 100%)",
                    boxShadow: "0 34px 70px rgba(28,31,74,.28), inset 0 0 0 1px rgba(255,255,255,.24)",
                    transform: { md: "rotate(4deg)" },
                  }}
                >
                  <Box sx={{ height: "100%", borderRadius: { xs: "34px", md: "43px" }, overflow: "hidden", bgcolor: "#f5f7fb", position: "relative" }}>
                    <Box sx={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 92, height: 25, borderRadius: 99, bgcolor: "#080914", zIndex: 4 }} />
                    <Box sx={{ background: "linear-gradient(145deg,#6559f5,#4438ca)", color: "#fff", px: 2.5, pt: 5.4, pb: 3.4 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography sx={{ fontSize: 11, opacity: .82 }}>Good evening, Argjend</Typography>
                          <Typography sx={{ fontSize: 25, fontWeight: 900, letterSpacing: "-.04em" }}>Dashboard</Typography>
                        </Box>
                        <NotificationsNoneRoundedIcon sx={{ fontSize: 22 }} />
                      </Stack>
                    </Box>
                    <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
                      <Box sx={{ bgcolor: "#fff", borderRadius: 3, p: 1.7, boxShadow: "0 8px 24px rgba(15,23,42,.06)" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.3 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 800 }}>Your overview</Typography>
                          <Typography sx={{ fontSize: 9, color: "#7166ee", fontWeight: 700 }}>This week</Typography>
                        </Stack>
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: .8 }}>
                          {[["Workspaces","4"],["Tasks","128"],["Completed","76%"]].map(([label,value]) => (
                            <Box key={label} sx={{ p: 1, borderRadius: 2, bgcolor: "#f8f8ff", border: "1px solid #eeeefe" }}>
                              <Typography sx={{ fontSize: 8, color: "#64748b" }}>{label}</Typography>
                              <Typography sx={{ fontSize: 16, fontWeight: 900 }}>{value}</Typography>
                              <Typography sx={{ fontSize: 7, color: "#10b981", fontWeight: 800 }}>↑ 12%</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box sx={{ bgcolor: "#fff", borderRadius: 3, p: 1.7, boxShadow: "0 8px 24px rgba(15,23,42,.06)" }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 800 }}>Recently visited</Typography>
                          <Typography sx={{ fontSize: 9, color: "#7166ee", fontWeight: 700 }}>View all</Typography>
                        </Stack>
                        {["Company Management","Dashboard & Reporting"].map((name, index) => (
                          <Stack key={name} direction="row" spacing={1.2} alignItems="center" sx={{ py: 1, borderTop: index ? "1px solid #eef0f5" : 0 }}>
                            <Box sx={{ width: 30, height: 30, borderRadius: 2, display: "grid", placeItems: "center", color: index ? "#0ea5e9" : "#6559f5", bgcolor: index ? "#e0f2fe" : "#eeecff" }}><FolderRoundedIcon sx={{ fontSize: 17 }} /></Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}><Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800 }}>{name}</Typography><Typography sx={{ fontSize: 8, color: "#94a3b8" }}>{index ? "Main workspace" : "Updated today"}</Typography></Box>
                            <CheckCircleRoundedIcon sx={{ color: "#22c55e", fontSize: 15 }} />
                          </Stack>
                        ))}
                      </Box>
                      <Box sx={{ bgcolor: "#fff", borderRadius: 3, p: 1.7, boxShadow: "0 8px 24px rgba(15,23,42,.06)" }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 1 }}>Activity</Typography>
                        {[72,46,83,58,91,68,78].map((height,index) => <Box key={index} sx={{ display: "inline-block", verticalAlign: "bottom", width: 19, height: height / 2, mx: .45, borderRadius: "5px 5px 2px 2px", bgcolor: index === 4 ? "#6559f5" : "#dddafe" }} />)}
                      </Box>
                    </Box>
                    <Stack direction="row" justifyContent="space-around" sx={{ position: "absolute", bottom: 0, left: 0, right: 0, bgcolor: "#fff", borderTop: "1px solid #e8eaf0", py: 1.2, color: "#94a3b8" }}>
                      <HomeRoundedIcon sx={{ color: "#6559f5", fontSize: 20 }} /><FolderRoundedIcon sx={{ fontSize: 20 }} /><CheckCircleRoundedIcon sx={{ fontSize: 20 }} />
                    </Stack>
                    <Box
                      component="img"
                      src="/smart-manage-mobile-dashboard.png"
                      alt="Smart Manage real dashboard on mobile"
                      sx={{ position: "absolute", inset: 0, zIndex: 3, width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "top center" }}
                    />
                  </Box>
                </Box>
                <Box sx={{ position: "absolute", zIndex: 2, left: { xs: 0, sm: 12, md: -12 }, top: { xs: 95, md: 125 }, bgcolor: "#fff", borderRadius: 3, p: 1.7, width: 125, boxShadow: "0 18px 40px rgba(15,23,42,.14)", transform: "rotate(-3deg)" }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 900 }}>Calendar</Typography><Typography sx={{ fontSize: 9, color: "#64748b", mt: .5 }}>3 events today</Typography>
                </Box>
                <Box sx={{ position: "absolute", zIndex: 2, right: { xs: -4, sm: 12, md: -18 }, bottom: { xs: 75, md: 105 }, bgcolor: "#fff", borderRadius: 3, p: 1.7, width: 132, boxShadow: "0 18px 40px rgba(15,23,42,.14)", transform: "rotate(3deg)" }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 900 }}>Tasks</Typography><Typography sx={{ fontSize: 9, color: "#64748b", my: .7 }}>128 this week</Typography><Box sx={{ height: 5, borderRadius: 99, bgcolor: "#ede9fe", overflow: "hidden" }}><Box sx={{ width: "76%", height: "100%", bgcolor: "#6559f5" }} /></Box>
                </Box>
              </Box>
            </motion.div>
          </Box>
          <Stack spacing={{ xs: 6, md: 8 }} sx={{ mt: { xs: 7, md: 10 } }}>
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Box id="services" sx={{ scrollMarginTop: { xs: 88, md: 96 } }}>
                <Stack spacing={2.5} sx={{ mb: 3 }}>
                  <Typography sx={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "#64748b", fontWeight: 700 }}>
                    Services
                  </Typography>
                  <Typography component="h2" sx={{ fontSize: { xs: "1.9rem", md: "2.8rem" }, fontWeight: 900, lineHeight: 1.1 }}>
                    Tools and support to keep package operations moving.
                  </Typography>
                  <Typography sx={{ color: "#475569", fontSize: "1.03rem", lineHeight: 1.8, maxWidth: 760 }}>
                    PackageReport helps teams organize workspaces, automate routine updates, and stay aligned from intake to delivery.
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 2,
                  }}
                >
                  {serviceItems.map((item, idx) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, delay: idx * 0.08 }}
                    >
                      <Box
                        sx={{
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          borderRadius: 3,
                          p: 3,
                          bgcolor: "#ffffff",
                        }}
                      >
                        <Typography fontWeight={800} fontSize="1.05rem" sx={{ mb: 1 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ color: "#475569", lineHeight: 1.7 }}>
                          {item.description}
                        </Typography>
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              </Box>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Box id="about" sx={{ scrollMarginTop: { xs: 88, md: 96 } }}>
                <Stack spacing={2.5} sx={{ mb: 3 }}>
                  <Typography sx={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "#64748b", fontWeight: 700 }}>
                    About Us
                  </Typography>
                  <Typography component="h2" sx={{ fontSize: { xs: "1.9rem", md: "2.8rem" }, fontWeight: 900, lineHeight: 1.1 }}>
                    Built for teams that need clarity without slowing down.
                  </Typography>
                  <Typography sx={{ color: "#475569", fontSize: "1.03rem", lineHeight: 1.8, maxWidth: 780 }}>
                    PackageReport brings tasks, communication, and progress tracking into one clean workspace so teams can move quickly and stay aligned.
                  </Typography>
                </Stack>

                <motion.div
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: 0.08 }}
                >
                  <Box sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, p: { xs: 3, md: 4 }, bgcolor: "#fff" }}>
                    <Typography fontWeight={800} fontSize="1.1rem" sx={{ mb: 1.5 }}>
                      What matters to us
                    </Typography>
                    <Stack spacing={1.2}>
                      {aboutValues.map((value) => (
                        <Typography key={value} sx={{ color: "#334155" }}>• {value}</Typography>
                      ))}
                    </Stack>
                  </Box>
                </motion.div>
              </Box>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Box id="contact" sx={{ scrollMarginTop: { xs: 88, md: 96 } }}>
                <Stack spacing={2.5} sx={{ mb: 3 }}>
                  <Typography sx={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "#64748b", fontWeight: 700 }}>
                    Contact
                  </Typography>
                  <Typography component="h2" sx={{ fontSize: { xs: "1.9rem", md: "2.8rem" }, fontWeight: 900, lineHeight: 1.1 }}>
                    Let’s talk about your workspace.
                  </Typography>
                  <Typography sx={{ color: "#475569", fontSize: "1.03rem", lineHeight: 1.8, maxWidth: 760 }}>
                    Whether you need onboarding help, product guidance, or a better workflow setup, this is the right place to start.
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 2,
                  }}
                >
                  {contactOptions.map((item, idx) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, delay: idx * 0.08 }}
                    >
                      <Box
                        sx={{
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          borderRadius: 3,
                          p: 3,
                          bgcolor: "#ffffff",
                        }}
                      >
                        <Typography fontWeight={800} fontSize="1.05rem" sx={{ mb: 1 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ color: "#475569", lineHeight: 1.7 }}>
                          {item.text}
                        </Typography>
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              </Box>
            </motion.div>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
