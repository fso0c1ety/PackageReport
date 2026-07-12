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
  Snackbar,
  Alert,
  CircularProgress,
  Toolbar,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { motion } from "framer-motion";
import { navigateToAppRoute, redirectToAppRoute, isElectronRuntime } from "./apiUrl";
import { LaptopPreview, MapVisual, PhoneMockup } from "./LandingVisuals";
import PolishedAboutVisual from "./PolishedAboutVisual";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FolderCopyRoundedIcon from "@mui/icons-material/FolderCopyRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import InsertChartRoundedIcon from "@mui/icons-material/InsertChartRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import PhoneInTalkRoundedIcon from "@mui/icons-material/PhoneInTalkRounded";
import HeadsetMicRoundedIcon from "@mui/icons-material/HeadsetMicRounded";
import HandshakeRoundedIcon from "@mui/icons-material/HandshakeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import InstagramIcon from "@mui/icons-material/Instagram";
import XIcon from "@mui/icons-material/X";
import GitHubIcon from "@mui/icons-material/GitHub";
import emailjs from "@emailjs/browser";

export default function LandingPage() {
  const router = useRouter();
  const [showWebLanding, setShowWebLanding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactValues, setContactValues] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contactSending, setContactSending] = useState(false);
  const [contactToast, setContactToast] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({ open: false, severity: "success", message: "" });
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
      title: "Project Management",
      description: "Organize projects and track their progress in real time.",
    },
    {
      title: "Task Management",
      description: "Create, assign and complete tasks efficiently.",
    },
    {
      title: "Calendar & Deadlines",
      description: "Keep meetings, events and deadlines organized.",
    },
    { title: "Reports", description: "Create and manage business reports in one place." },
    { title: "Team Collaboration", description: "Work together with your team and share updates." },
    { title: "File Management", description: "Store and organize important files securely." },
  ];

  const serviceIcons = [<FolderCopyRoundedIcon key="project" />, <ChecklistRoundedIcon key="tasks" />, <CalendarMonthRoundedIcon key="calendar" />, <InsertChartRoundedIcon key="reports" />, <GroupsRoundedIcon key="team" />, <FolderOpenRoundedIcon key="files" />];
  const contactIcons = [<PhoneInTalkRoundedIcon key="sales" />, <HeadsetMicRoundedIcon key="support" />, <HandshakeRoundedIcon key="partners" />];
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

  const handleContactChange = (field: keyof typeof contactValues, value: string) => {
    setContactValues((current) => ({ ...current, [field]: value }));
    if (contactErrors[field]) setContactErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!contactValues.name.trim()) errors.name = "Full name is required.";
    if (!contactValues.email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValues.email)) errors.email = "Enter a valid email address.";
    if (!contactValues.subject.trim()) errors.subject = "Subject is required.";
    if (!contactValues.message.trim()) errors.message = "Message is required.";
    setContactErrors(errors);
    if (Object.keys(errors).length) return;

    setContactSending(true);
    try {
      await emailjs.send("service_5jluyqm", "template_iruhxjw", {
        ...contactValues,
        time: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
      }, "FGRqzofj81_soljPZ");
      setContactValues({ name: "", email: "", company: "", subject: "", message: "" });
      setContactErrors({});
      setContactToast({ open: true, severity: "success", message: "✔ Message sent successfully." });
    } catch {
      setContactToast({ open: true, severity: "error", message: "Unable to send your message. Please try again." });
    } finally {
      setContactSending(false);
    }
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
                <Typography
                  sx={{
                    fontSize: { xs: "0.9rem", md: "1rem" },
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: LIGHT.primary,
                    fontWeight: 900,
                  }}
                >
                  ALL-IN-ONE WORKSPACE
                </Typography>

                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: "2.8rem", sm: "3.7rem", md: "5.2rem" },
                    lineHeight: .96,
                    fontWeight: 900,
                    letterSpacing: "-0.065em",
                  }}
                >
                  Manage everything.<br />One place.<br /><Box component="span" sx={{ background: "linear-gradient(135deg,#6D4AFF,#3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Zero chaos.</Box>
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

                <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                  {["Projects","Tasks","Calendar","Reports","Team Chat"].map((label) => <Stack key={label} direction="row" spacing={.6} alignItems="center"><CheckCircleRoundedIcon sx={{fontSize:18,color:"#6D4AFF"}}/><Typography sx={{fontSize:14,fontWeight:700}}>{label}</Typography></Stack>)}
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigateToAppRoute("/login?mode=signup", router)}
                    sx={{
                      borderRadius: 999, px: 4, py: 1.5, fontWeight: 900,
                      textTransform: "none", background: "#171a38", boxShadow: "none",
                      "&:hover": { background: LIGHT.primaryDark, boxShadow: "none" },
                    }}
                  >
                    Get Started
                  </Button>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => scrollToSection("services")}
                    sx={{
                      borderRadius: 999, px: 4, py: 1.5, fontWeight: 900,
                      textTransform: "none", background: "transparent", color: LIGHT.text, border: `1px solid ${LIGHT.border}`, boxShadow: "none",
                      "&:hover": { background: LIGHT.primaryDark, boxShadow: "none" },
                    }}
                  >
                    Learn More
                  </Button>

                </Stack>
              </Stack>
            </motion.div>

            {/* Right Content - App Visual */}
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
                  height: "auto",
                  background: "transparent",
                  overflow: "hidden",
                }}
              >
                <PhoneMockup />
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
                    SIMPLE. POWERFUL. SMART.
                  </Typography>
                  <Typography component="h2" sx={{ fontSize: { xs: "1.9rem", md: "2.8rem" }, fontWeight: 900, lineHeight: 1.1 }}>
                    Everything you need to run your business
                  </Typography>
                  <Typography sx={{ color: "#475569", fontSize: "1.03rem", lineHeight: 1.8, maxWidth: 760 }}>
                    A complete solution to manage your work, team and data in one place.
                  </Typography>
                </Stack>

                <Box sx={{ display:"grid",gridTemplateColumns:{xs:"1fr",md:"1fr 1fr"},gap:{xs:4,md:6},alignItems:"center" }}>
                  <LaptopPreview />
                  <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",sm:"repeat(2,1fr)"},gap:2}}>{serviceItems.map((item, idx) => (
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
                          borderRadius: 4,
                          p: 3,
                          bgcolor: "#ffffff",
                          height:"100%",
                          transition:"transform .2s ease, box-shadow .2s ease",
                          "&:hover":{transform:"translateY(-4px)",boxShadow:"0 18px 40px rgba(16,24,40,.08)"},
                        }}
                      >
                        <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: "#F0ECFF", color: "#6D4AFF", mb: 2, "& svg": { fontSize: 22 } }}>{serviceIcons[idx]}</Box>
                        <Typography fontWeight={800} fontSize="1.05rem" sx={{ mb: 1 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ color: "#475569", lineHeight: 1.7 }}>
                          {item.description}
                        </Typography>
                        <Typography sx={{ color: "#6D4AFF", fontSize: 13, fontWeight: 800, mt: 2 }}>Learn more →</Typography>
                      </Box>
                    </motion.div>
                  ))}
                  </Box>
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
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: { xs: 3, md: 6 }, alignItems: "center", p: { xs: 2, md: 5 }, mb: 3, bgcolor: "#F6F3FF", borderRadius: 4 }}>
                  <PolishedAboutVisual />
                  <Box><Typography sx={{ textTransform: "uppercase", letterSpacing: ".18em", color: "#6D4AFF", fontWeight: 800, fontSize: 12 }}>ABOUT SMART MANAGE</Typography><Typography sx={{ fontSize: { xs: 28, md: 42 }, fontWeight: 900, lineHeight: 1.08, my: 2 }}>Built to make<br/>everyday work simpler</Typography><Typography sx={{ color: "#667085", lineHeight: 1.75 }}>Smart Manage brings your projects, tasks, reports and team together in one place so you can focus on what matters most.</Typography><Button variant="contained" onClick={() => navigateToAppRoute("/login?mode=signup", router)} sx={{ mt: 3, background: "linear-gradient(135deg,#6D4AFF,#3B82F6)" }}>Get Started</Button></Box>
                </Box>
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
                          height: "100%",
                          transition: "transform .2s ease, border-color .2s ease, box-shadow .2s ease",
                          "&:hover": { transform: "translateY(-3px)", borderColor: "rgba(109,74,255,.28)", boxShadow: "0 14px 34px rgba(16,24,40,.07)" },
                        }}
                      >
                        <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: ["#EEF2FF", "#ECFDF3", "#FFF4E8"][idx], color: ["#4F46E5", "#16A34A", "#EA580C"][idx], mb: 2, "& svg": { fontSize: 22 } }}>{contactIcons[idx]}</Box>
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
                <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.25fr .75fr" }, gap: 3 }}>
                  <Box component="form" noValidate onSubmit={handleContactSubmit} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, p: 2.5, border: "1px solid #EAECF0", borderRadius: 3, bgcolor: "#fff" }}>
                    {([ ["Full Name","name","text"], ["Email","email","email"], ["Company","company","text"], ["Subject","subject","text"] ] as const).map(([label,name,type]) => <Box key={name}><Typography component="label" htmlFor={`contact-${name}`} sx={{ fontSize: 12, fontWeight: 800 }}>{label}{name !== "company" && " *"}</Typography><Box component="input" id={`contact-${name}`} name={name} type={type} value={contactValues[name]} onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleContactChange(name, event.target.value)} aria-invalid={Boolean(contactErrors[name])} aria-describedby={contactErrors[name] ? `contact-${name}-error` : undefined} sx={{ width: "100%", mt: .6, p: 1.2, border: `1px solid ${contactErrors[name] ? "#DC2626" : "#D0D5DD"}`, borderRadius: 2, font: "inherit", outline: "none", "&:focus": { borderColor: contactErrors[name] ? "#DC2626" : "#6D4AFF", boxShadow: `0 0 0 3px ${contactErrors[name] ? "rgba(220,38,38,.12)" : "rgba(109,74,255,.12)"}` } }}/>{contactErrors[name] && <Typography id={`contact-${name}-error`} sx={{ mt: .5, color: "#DC2626", fontSize: 11 }}>{contactErrors[name]}</Typography>}</Box>)}
                    <Box sx={{ gridColumn: "1/-1" }}><Typography component="label" htmlFor="contact-message" sx={{ fontSize: 12, fontWeight: 800 }}>Message *</Typography><Box component="textarea" id="contact-message" name="message" value={contactValues.message} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleContactChange("message", event.target.value)} aria-invalid={Boolean(contactErrors.message)} aria-describedby={contactErrors.message ? "contact-message-error" : undefined} sx={{ width: "100%", minHeight: 90, mt: .6, p: 1.2, border: `1px solid ${contactErrors.message ? "#DC2626" : "#D0D5DD"}`, borderRadius: 2, font: "inherit", resize: "vertical", outline: "none", "&:focus": { borderColor: contactErrors.message ? "#DC2626" : "#6D4AFF", boxShadow: `0 0 0 3px ${contactErrors.message ? "rgba(220,38,38,.12)" : "rgba(109,74,255,.12)"}` } }}/>{contactErrors.message && <Typography id="contact-message-error" sx={{ mt: .5, color: "#DC2626", fontSize: 11 }}>{contactErrors.message}</Typography>}</Box>
                    <Button type="submit" variant="contained" disabled={contactSending} startIcon={contactSending ? <CircularProgress size={17} color="inherit" /> : undefined} sx={{ gridColumn: "1/-1", background: "linear-gradient(135deg,#6D4AFF,#3B82F6)" }}>{contactSending ? "Sending..." : "Send Message"}</Button>
                  </Box>
                  <MapVisual />
                </Box>
              </Box>
            </motion.div>
          </Stack>
          <Box sx={{ mt: 8, p: { xs: 3, md: 4 }, borderRadius: 4, background: "linear-gradient(135deg,#6D4AFF,#4F46E5 55%,#3B82F6)", color: "#fff", display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", gap: 3 }}><Box><Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 900 }}>Ready to organize your business?</Typography><Typography sx={{ opacity: .82 }}>Join Smart Manage and bring everything together in one smart workspace.</Typography></Box><Button endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigateToAppRoute("/login?mode=signup", router)} sx={{ minHeight: 50, bgcolor: "#fff", color: "#4F46E5", fontWeight: 800, px: 4, transition: "transform .2s ease, box-shadow .2s ease", "&:hover": { bgcolor: "#F8FAFC", transform: "translateY(-2px)", boxShadow: "0 10px 24px rgba(15,23,42,.18)" }, "&:focus-visible": { outline: "3px solid rgba(255,255,255,.5)", outlineOffset: 3 } }}>Get Started Free</Button></Box>
        </Container>
      </Box>
      <Box component="footer" sx={{ bgcolor: "#0F172A", color: "#fff", py: 6 }}><Container maxWidth="xl"><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "2fr repeat(4,1fr)" }, gap: 4 }}><Box sx={{ gridColumn: { xs: "1/-1", md: "auto" } }}><Stack direction="row" spacing={1.2} alignItems="center"><Box component="img" src="/icon.png" alt="Smart Manage" sx={{ width: 38, height: 38, borderRadius: 2 }}/><Typography fontWeight={900}>Smart Manage</Typography></Stack><Typography sx={{ color: "#94A3B8", fontSize: 13, mt: 2, maxWidth: 260 }}>An all-in-one workspace to manage projects, tasks, reports, files and your team.</Typography><Stack direction="row" spacing={1} sx={{mt:2}}>{[["LinkedIn",<LinkedInIcon key="li"/>],["Instagram",<InstagramIcon key="ig"/>],["X",<XIcon key="x"/>],["GitHub",<GitHubIcon key="gh"/>]].map(([label,icon])=><IconButton key={String(label)} component="a" href="#" aria-label={String(label)} sx={{width:34,height:34,color:"#CBD5E1",bgcolor:"rgba(255,255,255,.07)","&:hover":{color:"#fff",bgcolor:"#6D4AFF"}}}>{icon}</IconButton>)}</Stack></Box>{[["Product","Features","Integrations","Updates","Pricing"],["Resources","Documentation","Help Center","Templates","Blog"],["Company","About Us","Careers","Press Kit","Contact"],["Legal","Privacy Policy","Terms of Service","Cookie Policy","Security"]].map(([head,...links]) => <Box key={head}><Typography fontWeight={900} mb={1.5}>{head}</Typography>{links.map((x) => <Typography key={x} sx={{ color: "#94A3B8", fontSize: 13, py: .45 }}>{x}</Typography>)}</Box>)}</Box><Stack direction="row" justifyContent="space-between" sx={{ color: "#64748B", fontSize: 12, mt: 5 }}><Typography fontSize="inherit">© {new Date().getFullYear()} Smart Manage. All rights reserved.</Typography><Typography fontSize="inherit">Version 1.0</Typography></Stack></Container></Box>
      <Snackbar open={contactToast.open} autoHideDuration={5000} onClose={() => setContactToast((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}><Alert onClose={() => setContactToast((current) => ({ ...current, open: false }))} severity={contactToast.severity} variant="filled" sx={{ width: "100%" }}>{contactToast.message}</Alert></Snackbar>
    </Box>
  );
}
