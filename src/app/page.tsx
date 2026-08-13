"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import {
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { motion } from "framer-motion";
import { navigateToAppRoute, redirectToAppRoute, isElectronRuntime } from "./apiUrl";
import { MapVisual } from "./LandingVisuals";
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
import DemoRequestForm from "./DemoRequestForm";
import { WORKSPACE_TEMPLATES } from "../workspaceTemplates";
import { marketingScreenshots } from "./marketingScreenshots";
import emailjs from "@emailjs/browser";
import PortalShowcase from "./PortalShowcase";
import PublicHeader from "./PublicHeader";

function trackMarketingEvent(name: string, detail: Record<string, string> = {}) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("smartmanage:analytics", { detail: { name, ...detail } }));
}

export default function LandingPage() {
  const router = useRouter();
  const [showWebLanding, setShowWebLanding] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [productPreview, setProductPreview] = useState("Dashboard");
  const [industryPreview, setIndustryPreview] = useState("Logistics");
  const [contactValues, setContactValues] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contactSending, setContactSending] = useState(false);
  const [contactStartedAt, setContactStartedAt] = useState(() => Date.now());
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
      title: "Run operations",
      description: "Plan work, assign teams and keep every process moving.",
    },
    {
      title: "Connect your business",
      description: "Bring customers, projects, documents and communication together.",
    },
    {
      title: "Give every role the right experience",
      description: "Managers and operational users see only the information and actions they need.",
    },
    { title: "Adapt to any industry", description: "Start from a professional template and customize it around your business." },
  ];

  const serviceIcons = [<FolderCopyRoundedIcon key="project" />, <ChecklistRoundedIcon key="tasks" />, <CalendarMonthRoundedIcon key="calendar" />, <InsertChartRoundedIcon key="reports" />, <GroupsRoundedIcon key="team" />, <FolderOpenRoundedIcon key="files" />];
  const contactIcons = [<PhoneInTalkRoundedIcon key="sales" />, <HeadsetMicRoundedIcon key="support" />, <HandshakeRoundedIcon key="partners" />];
  const desktopDownloadUrl =
    "https://github.com/fso0c1ety/PackageReport/releases/latest/download/Smart.Manage.zip";

  const contactOptions = [
    {
      title: "Sales questions",
      text: "Learn how Smart Manage can fit your workflow and reporting needs.",
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

    setAuthenticated(hasToken);
    setShowWebLanding(true);
  }, [router]);

  const handleGetStarted = () => {
    trackMarketingEvent("registration_cta", { source: "template" });
    navigateToAppRoute("/login?mode=signup", router);
  };

  const scrollToSection = (sectionId: string) => {
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
      const templateParams = {
        ...contactValues,
        time: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
      };
      try {
        await emailjs.send(
          process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_5jluyqm",
          process.env.NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE_ID || "template_iruhxjw",
          templateParams,
          process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "FGRqzofj81_soljPZ",
        );
      } catch {
        const response = await fetch("/api/contact/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...contactValues, website: "", startedAt: contactStartedAt }) });
        if (!response.ok) throw new Error("Contact delivery failed");
      }
      trackMarketingEvent("contact_submission");
      setContactValues({ name: "", email: "", company: "", subject: "", message: "" });
      setContactStartedAt(Date.now());
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
      <PublicHeader active="landing" authenticated={authenticated} onSectionNavigate={scrollToSection} />

      {/* Main Content */}
      <Box sx={{ flex: 1, pt: { xs: 4, md: 3 }, pb: { xs: 5, md: 8 }, overflowX: "clip" }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: ".86fr 1.14fr" },
              gap: { xs: 5, md: 4 },
              alignItems: "center",
              minHeight: { md: "620px" },
              "& > *": { minWidth: 0 },
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
                  ONE WORKSPACE. EVERY PROCESS.
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
                  Manage your entire business. <Box component="span" sx={{ background: "linear-gradient(135deg,#6D4AFF,#3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>One powerful workspace.</Box>
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: "1rem", md: "1.2rem" },
                    color: 'rgba(15,23,42,0.82)',
                    lineHeight: 1.7,
                  }}
                >
                  Plan work, run operations, coordinate teams, manage customers and build industry-specific workflows from one flexible platform.
                </Typography>

                <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                  {["Flexible workflows","Role-based access","Real-time collaboration"].map((label) => <Stack key={label} direction="row" spacing={.6} alignItems="center"><CheckCircleRoundedIcon sx={{fontSize:18,color:"#6D4AFF"}}/><Typography sx={{fontSize:14,fontWeight:700}}>{label}</Typography></Stack>)}
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
                      textTransform: "none", background: "linear-gradient(135deg,#6D4AFF,#4F46E5)", boxShadow: "0 12px 30px rgba(109,74,255,.24)",
                      "&:hover": { background: LIGHT.primaryDark, boxShadow: "none" },
                    }}
                  >
                    Start for free
                  </Button>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => scrollToSection("request-demo")}
                    sx={{
                      borderRadius: 999, px: 4, py: 1.5, fontWeight: 900,
                      textTransform: "none", background: "transparent", color: LIGHT.text, border: `1px solid ${LIGHT.border}`, boxShadow: "none",
                      "&:hover": { background: LIGHT.primaryDark, boxShadow: "none" },
                    }}
                  >
                    Request Demo
                  </Button>

                </Stack>
                <Button onClick={() => scrollToSection("product")} sx={{ alignSelf: "flex-start", p: 0, color: LIGHT.text, textTransform: "none", fontWeight: 800 }}>See how it works →</Button>
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
                <Box
                  component="img"
                  src={marketingScreenshots.hero}
                  alt="Smart Manage project board with real demo workspace data"
                  sx={{ width: "100%", borderRadius: { xs: 3, md: 5 }, border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 28px 80px rgba(37,42,88,.18)" }}
                />
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
                  <Box component="img" src={marketingScreenshots.fleet} alt="Smart Manage fleet operations workspace" sx={{ width: "100%", borderRadius: 4, border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 24px 60px rgba(16,24,40,.12)" }} />
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

            <Box id="product" sx={{ scrollMarginTop: 96 }}>
              <Typography sx={{ color: LIGHT.primary, fontWeight: 900, letterSpacing: ".16em", fontSize: 12 }}>BUILT FOR CLARITY, SPEED AND CONTROL</Typography>
              <Typography component="h2" sx={{ fontSize: { xs: 32, md: 48 }, fontWeight: 900, letterSpacing: "-.04em", mt: 1 }}>One connected platform for real work.</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4,1fr)" }, gap: 2, mt: 4 }}>
                {[
                  ["Organize everything", "Bring tasks, customers, operations, files and communication into one connected workspace."],
                  ["Adapt to your workflow", "Create flexible boards, columns, views and templates without forcing your team into a rigid process."],
                  ["Work together in real time", "Use comments, chat, files, notifications and live updates to keep every team member aligned."],
                  ["See what matters", "Turn operational data into dashboards, reports and clear business decisions."],
                ].map(([title, text]) => <Box key={title} sx={{ p: 3, border: `1px solid ${LIGHT.border}`, borderRadius: 4, bgcolor: "#fff" }}><Typography fontWeight={900} fontSize={18}>{title}</Typography><Typography sx={{ color: LIGHT.textSecondary, mt: 1.2, lineHeight: 1.7 }}>{text}</Typography></Box>)}
              </Box>
            </Box>

            <Box sx={{ scrollMarginTop: 96 }}>
              <Typography sx={{ color: LIGHT.primary, fontWeight: 900, letterSpacing: ".16em", fontSize: 12 }}>SEE SMART MANAGE IN ACTION</Typography>
              <Typography component="h2" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 900, mt: 1 }}>Real workflows. Real product UI.</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} mt={3}>{Object.keys({ Dashboard: 1, Boards: 1, Logistics: 1, CRM: 1, Calendar: 1, Portals: 1 }).map((tab) => <Button key={tab} onClick={() => setProductPreview(tab)} variant={productPreview === tab ? "contained" : "outlined"} sx={{ borderRadius: 999, textTransform: "none", fontWeight: 800 }}>{tab}</Button>)}</Stack>
              {(() => { const previews: Record<string, { image: string; copy: string }> = {
                Dashboard: { image: marketingScreenshots.hero, copy: "See priorities, progress and performance in one clear operational overview." },
                Boards: { image: marketingScreenshots.boards, copy: "Structure work exactly around the way your team operates." },
                Logistics: { image: marketingScreenshots.operations, copy: "Coordinate shipments, routes, documents and delivery work." },
                CRM: { image: marketingScreenshots.crm, copy: "Keep companies, contacts, deals and follow-ups connected." },
                Calendar: { image: marketingScreenshots.education, copy: "Coordinate appointments, schedules and deadlines across the team." },
                Portals: { image: marketingScreenshots.fleet, copy: "Give operational users focused access without exposing the full workspace." },
              }; const current = previews[productPreview]; return <Box sx={{ mt: 2, p: { xs: 1, md: 2 }, border: `1px solid ${LIGHT.border}`, borderRadius: 5, bgcolor: "#fff", boxShadow: "0 30px 80px rgba(16,24,40,.10)" }}><Box component="img" loading="lazy" src={current.image} alt={`${productPreview} in Smart Manage`} sx={{ width: "100%", display: "block", borderRadius: 3, aspectRatio: { xs: "16/11", md: "16/8.5" }, objectFit: "cover", objectPosition: "top left" }} /><Typography sx={{ px: { xs: 1, md: 2 }, py: 2, color: LIGHT.textSecondary, fontSize: { xs: 15, md: 18 }, fontWeight: 650 }}>{current.copy}</Typography></Box>; })()}
            </Box>

            <Box id="solutions" sx={{ scrollMarginTop: 96, p: { xs: 3, md: 5 }, borderRadius: 5, bgcolor: "#11152d", color: "#fff" }}>
              <Typography sx={{ color: "#a5b4fc", fontWeight: 900, letterSpacing: ".16em", fontSize: 12 }}>BUILT AROUND YOUR BUSINESS</Typography>
              <Typography component="h2" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 900, mt: 1 }}>Professional workflows for every industry.</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} mt={3}>{["Logistics","Healthcare","Education","Construction","Sales & CRM","Retail","Manufacturing","Hospitality","Professional Services"].map((tab) => <Button key={tab} onClick={() => setIndustryPreview(tab)} sx={{ borderRadius: 999, px: 2, textTransform: "none", fontWeight: 800, color: industryPreview === tab ? "#11152d" : "#fff", bgcolor: industryPreview === tab ? "#fff" : "rgba(255,255,255,.08)", "&:hover": { bgcolor: industryPreview === tab ? "#fff" : "rgba(255,255,255,.16)" } }}>{tab}</Button>)}</Stack>
              {(() => { const industries: Record<string, { image: string; name: string; copy: string; capabilities: string }> = {
                Logistics: { image: marketingScreenshots.operations, name: "Logistics — Freight Broker", copy: "Plan and follow every shipment from assignment through delivery.", capabilities: "Shipments • Trips • Drivers • Documents • Reporting" },
                Healthcare: { image: marketingScreenshots.healthcare, name: "Dental Clinic", copy: "Coordinate patients, appointments, treatments and billing.", capabilities: "Patients • Appointments • Treatments • Documents" },
                Education: { image: marketingScreenshots.education, name: "Kindergarten & Nursery", copy: "Keep attendance, schedules, parents and activities organized.", capabilities: "Children • Parents • Attendance • Payments" },
                Construction: { image: marketingScreenshots.construction, name: "Construction", copy: "Connect projects, field teams, materials and daily progress.", capabilities: "Sites • Teams • Materials • Reports" },
                "Sales & CRM": { image: marketingScreenshots.crm, name: "CRM & Sales", copy: "Move prospects from first contact to closed business.", capabilities: "Companies • Contacts • Deals • Follow-ups" },
                Retail: { image: marketingScreenshots.boards, name: "Retail Store", copy: "Manage products, suppliers, sales and stock movement.", capabilities: "Products • Suppliers • Sales • Inventory" },
                Manufacturing: { image: marketingScreenshots.hero, name: "Manufacturing", copy: "Coordinate orders, materials, machines and production reporting.", capabilities: "Orders • Materials • Machines • Quality" },
                Hospitality: { image: marketingScreenshots.education, name: "Hotel", copy: "Manage reservations, guests, services and housekeeping.", capabilities: "Guests • Rooms • Reservations • Services" },
                "Professional Services": { image: marketingScreenshots.crm, name: "Marketing Agency", copy: "Connect clients, campaigns, content, tasks and budgets.", capabilities: "Clients • Campaigns • Content • Reports" },
              }; const current = industries[industryPreview]; return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.35fr .65fr" }, gap: 3, mt: 3, alignItems: "center" }}><Box component="img" loading="lazy" src={current.image} alt={`${current.name} template`} sx={{ width: "100%", borderRadius: 3, aspectRatio: "16/9", objectFit: "cover", objectPosition: "top left" }} /><Box><Typography fontSize={25} fontWeight={900}>{current.name}</Typography><Typography sx={{ color: "#cbd5e1", lineHeight: 1.7, mt: 1 }}>{current.copy}</Typography><Typography sx={{ color: "#a5b4fc", fontWeight: 800, mt: 2 }}>{current.capabilities}</Typography><Button onClick={() => scrollToSection("request-demo")} variant="contained" sx={{ mt: 3, bgcolor: "#6D4AFF", textTransform: "none", fontWeight: 900 }}>Request Demo</Button></Box></Box>; })()}
            </Box>

            <PortalShowcase />
            <Box aria-hidden sx={{ display: "none" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.25fr .75fr" }, gap: 3, mt: 3, alignItems: "center" }}><Box component="img" loading="lazy" src={marketingScreenshots.fleet} alt="Verified Smart Manage Driver Portal" sx={{ width: "100%", borderRadius: 3, border: `1px solid ${LIGHT.border}`, aspectRatio: "16/9", objectFit: "cover", objectPosition: "top left" }} /><Box><Chip label="Verified portal" color="success" /><Typography fontSize={27} fontWeight={900} mt={2}>Driver Portal</Typography><Typography sx={{ color: LIGHT.textSecondary, lineHeight: 1.8, mt: 1 }}>Trips, documents, fuel, expenses and delivery updates—without exposing the full company workspace.</Typography></Box></Box>
            </Box>

            <Box id="templates" sx={{ scrollMarginTop: 96 }}>
              <Typography component="h2" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 900 }}>Start with a proven template.</Typography>
              <Typography sx={{ color: LIGHT.textSecondary, mt: 1 }}>Choose a starting point, customize every detail, then invite your team.</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 1.5, mt: 3 }}>
                {WORKSPACE_TEMPLATES.filter((template) => ["freight_broker","crm_sales","construction","dental_clinic","kindergarten_nursery","hotel"].includes(template.key)).map((template) => <Box key={template.key} sx={{ p: 2.5, border: `1px solid ${LIGHT.border}`, borderRadius: 3, bgcolor: "#fff" }}><Typography fontSize={24} aria-hidden>{template.icon}</Typography><Typography fontWeight={850} mt={1}>{template.name}</Typography><Typography sx={{ color: LIGHT.textSecondary, fontSize: 13, mt: .7 }}>{template.description}</Typography><Button onClick={handleGetStarted} sx={{ p: 0, mt: 1.5, textTransform: "none", fontWeight: 800 }}>Preview →</Button></Box>)}
              </Box>
              <Button onClick={() => navigateToAppRoute("/marketplace", router)} sx={{ mt: 2, textTransform: "none", fontWeight: 900 }}>Explore All Templates →</Button>
            </Box>

            <Box id="request-demo" sx={{ scrollMarginTop: 96, display: "grid", gridTemplateColumns: { xs: "1fr", md: ".8fr 1.2fr" }, gap: 5, p: { xs: 3, md: 6 }, borderRadius: 5, bgcolor: "#F7F5FF", border: "1px solid #E8E3FF" }}>
              <Box><Typography sx={{ color: LIGHT.primary, fontWeight: 900, letterSpacing: ".16em", fontSize: 12 }}>REQUEST A PERSONALIZED DEMO</Typography><Typography component="h2" sx={{ fontSize: { xs: 32, md: 48 }, fontWeight: 900, lineHeight: 1.05, mt: 1.5 }}>See how Smart Manage fits your business.</Typography><Typography sx={{ color: LIGHT.textSecondary, lineHeight: 1.8, mt: 2 }}>Tell us what you manage today. We will prepare the most relevant workspace, workflows and role experience for your team.</Typography></Box>
              <DemoRequestForm />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
              <Box sx={{ p: 4, borderRadius: 4, bgcolor: "#eef2ff" }}><Typography component="h2" fontSize={30} fontWeight={900}>Security built into everyday work.</Typography><Typography sx={{ color: LIGHT.textMuted, lineHeight: 1.8, mt: 1.5 }}>Role-based access, protected workspaces, HTTPS traffic, secure password reset, session management and controlled private file access.</Typography></Box>
              <Box sx={{ p: 4, borderRadius: 4, bgcolor: "#ecfdf5" }}><Typography sx={{ color: "#047857", fontWeight: 900, letterSpacing: ".14em", fontSize: 12 }}>WORK WHEREVER YOU DO.</Typography><Typography component="h2" fontSize={30} fontWeight={900} mt={1}>Web, Windows and mobile.</Typography><Typography sx={{ color: LIGHT.textMuted, lineHeight: 1.8, mt: 1.5 }}>Use Smart Manage on the web, Windows desktop and responsive Android/mobile layouts. iOS is available only where configured.</Typography><Button component="a" href={desktopDownloadUrl} target="_blank" rel="noopener noreferrer" startIcon={<DownloadIcon />} sx={{ mt: 2, textTransform: "none", fontWeight: 900 }}>Download Desktop App</Button></Box>
            </Box>

            <Box>
              <Typography component="h2" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 900 }}>Frequently asked questions.</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5, mt: 3 }}>
                {[
                  ["What is Smart Manage?", "A flexible platform for boards, operations, teamwork, data and reporting."],
                  ["Is it only for logistics?", "No. Logistics is supported alongside CRM, projects, services, construction and more."],
                  ["Can I customize boards and columns?", "Yes. Workspaces, boards, columns, views and templates adapt to your process."],
                  ["Can I invite team members?", "Yes, with workspace, board and role-based permissions."],
                  ["Does it work on mobile?", "Yes. The web application includes responsive mobile experiences and dedicated portals."],
                  ["Can I import Excel data?", "Yes. Supported boards can import and export Excel data."],
                ].map(([question, answer]) => <Box key={question} sx={{ p: 2.5, borderBottom: `1px solid ${LIGHT.border}` }}><Typography fontWeight={900}>{question}</Typography><Typography sx={{ color: LIGHT.textSecondary, mt: .7 }}>{answer}</Typography></Box>)}
              </Box>
            </Box>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Box id="about" sx={{ scrollMarginTop: { xs: 88, md: 96 } }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: { xs: 3, md: 6 }, alignItems: "center", p: { xs: 2, md: 5 }, mb: 3, bgcolor: "#F6F3FF", borderRadius: 4 }}>
                  <Box component="img" loading="lazy" src={marketingScreenshots.healthcare} alt="Smart Manage healthcare workspace" sx={{ width: "100%", borderRadius: 3, border: "1px solid rgba(15,23,42,.08)", boxShadow: "0 18px 50px rgba(16,24,40,.12)" }} />
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
          <Box sx={{ mt: 8, p: { xs: 3, md: 4 }, borderRadius: 4, bgcolor: "#171A38", color: "#fff", display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { xs: "stretch", md: "center" }, justifyContent: "space-between", gap: 3 }}><Box><Typography sx={{ fontSize: { xs: 24, md: 34 }, fontWeight: 900 }}>Build a workspace that works the way your business does.</Typography><Typography sx={{ color: "#CBD5E1", mt: 1 }}>Start with a template, customize your workflows and bring your team into one connected platform.</Typography></Box><Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}><Button endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigateToAppRoute("/login?mode=signup", router)} sx={{ minHeight: 50, bgcolor: "#fff", color: "#4F46E5", fontWeight: 800, px: 3, "&:hover": { bgcolor: "#F8FAFC" } }}>Start Free</Button><Button onClick={() => scrollToSection("request-demo")} variant="outlined" sx={{ minHeight: 50, color: "#fff", borderColor: "rgba(255,255,255,.7)", fontWeight: 800, px: 3 }}>Request Demo</Button></Stack></Box>
        </Container>
      </Box>
      <Box component="footer" sx={{ bgcolor: "#0F172A", color: "#fff", py: 6 }}><Container maxWidth="xl"><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "2fr repeat(4,1fr)" }, gap: 4 }}><Box sx={{ gridColumn: { xs: "1/-1", md: "auto" } }}><Stack direction="row" spacing={1.2} alignItems="center"><Box component="img" src="/icon.png" alt="Smart Manage" sx={{ width: 38, height: 38, borderRadius: 2 }}/><Typography fontWeight={900}>Smart Manage</Typography></Stack><Typography sx={{ color: "#94A3B8", fontSize: 13, mt: 2, maxWidth: 260 }}>An all-in-one workspace to manage projects, tasks, reports, files and your team.</Typography></Box>{[["Product","Features","Integrations","Updates","Pricing"],["Resources","Documentation","Help Center","Templates","Blog"],["Company","About Us","Careers","Press Kit","Contact"],["Legal","Privacy Policy","Terms of Service","Cookie Policy","Security"]].map(([head,...links]) => <Box key={head}><Typography fontWeight={900} mb={1.5}>{head}</Typography>{links.map((x) => <Typography key={x} sx={{ color: "#94A3B8", fontSize: 13, py: .45 }}>{x}</Typography>)}</Box>)}</Box><Stack direction="row" justifyContent="space-between" sx={{ color: "#64748B", fontSize: 12, mt: 5 }}><Typography fontSize="inherit">© {new Date().getFullYear()} Smart Manage. All rights reserved.</Typography><Typography fontSize="inherit">Version 1.0</Typography></Stack></Container></Box>
      <Snackbar open={contactToast.open} autoHideDuration={5000} onClose={() => setContactToast((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}><Alert onClose={() => setContactToast((current) => ({ ...current, open: false }))} severity={contactToast.severity} variant="filled" sx={{ width: "100%" }}>{contactToast.message}</Alert></Snackbar>
    </Box>
  );
}
