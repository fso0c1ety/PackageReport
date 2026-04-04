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
  Stack,
  Toolbar,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const theme = useTheme();
  const [showWebLanding, setShowWebLanding] = useState(false);
  const isDark = false;

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
    color: theme.palette.text.secondary,
    textTransform: "none",
    fontSize: "0.96rem",
    fontWeight: 600,
    px: 1,
    minWidth: "auto",
    "&:hover": {
      backgroundColor: "transparent",
      color: theme.palette.text.primary,
    },
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasToken = !!localStorage.getItem("token");

    if (Capacitor.isNativePlatform()) {
      const target = hasToken ? "/home" : "/login";
      router.replace(target);

      const retryTimer = window.setTimeout(() => {
        if (window.location.pathname === "/" || window.location.pathname === "") {
          router.replace(target);
        }
      }, 600);

      return () => window.clearTimeout(retryTimer);
    }

    if (hasToken) {
      router.replace("/home");
      return;
    }

    setShowWebLanding(true);
  }, [router]);

  const handleGetStarted = () => {
    router.push("/login?mode=signup");
  };

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!showWebLanding) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
        }}
      >
        <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography sx={{ fontSize: "1.15rem", fontWeight: 800, color: theme.palette.text.primary }}>
            Opening Smart Manage...
          </Typography>
          <Typography sx={{ color: theme.palette.text.secondary, maxWidth: 320 }}>
            Preparing your workspace for mobile.
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      id="top"
      sx={{
        minHeight: "100vh",
        color: theme.palette.text.primary,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navigation Bar */}
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{
          background: "transparent",
          boxShadow: "none",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            disableGutters
            sx={{
              minHeight: 72,
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
              onClick={() => router.push("/")}
            >
              <Box
                component="img"
                src="/icon.png"
                alt="PackageReport logo"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  objectFit: "cover",
                }}
              />
              <Typography
                sx={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: theme.palette.text.primary,
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
              <Button onClick={() => scrollToSection("contact")} sx={navButtonSx}>Contact</Button>
            </Stack>

            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              <Button
                onClick={() => router.push("/login")}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  color: "#fff",
                  borderRadius: 999,
                  px: 2,
                  py: 0.8,
                  textTransform: "none",
                  fontWeight: 700,
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                onClick={() => router.push("/login?mode=signup")}
                sx={{
                  borderRadius: 999,
                  px: 2.2,
                  py: 0.9,
                  fontWeight: 700,
                  textTransform: "none",
                  background: theme.palette.primary.main,
                  boxShadow: "none",
                  "&:hover": {
                    background: theme.palette.primary.dark,
                    boxShadow: "none",
                  },
                }}
              >
                Sign Up
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flex: 1, py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 4, md: 6 },
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
                    color: theme.palette.text.secondary,
                    fontWeight: 700,
                  }}
                >
                  PackageReport Platform
                </Typography>

                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: "2.2rem", md: "4rem" },
                    lineHeight: 1.1,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Run workspaces that move fast and stay crystal clear.
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: "1rem", md: "1.2rem" },
                    color: alpha(theme.palette.text.primary, 0.82),
                    lineHeight: 1.7,
                  }}
                >
                  Plan tasks, collaborate with teammates, track updates, and keep every package flow visible
                  in one place. Built for teams that need speed without losing control.
                </Typography>

                <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                  <Chip label="Task Boards" variant="outlined" sx={{ borderColor: alpha(theme.palette.secondary.main, 0.4) }} />
                  <Chip label="Live Collaboration" variant="outlined" sx={{ borderColor: alpha(theme.palette.secondary.main, 0.4) }} />
                  <Chip label="Automations" variant="outlined" sx={{ borderColor: alpha(theme.palette.secondary.main, 0.4) }} />
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push("/login")}
                    sx={{
                      borderRadius: 999,
                      px: 4,
                      py: 1.4,
                      fontWeight: 800,
                      textTransform: "none",
                      background: theme.palette.primary.main,
                      boxShadow: "none",
                      "&:hover": {
                        background: theme.palette.primary.dark,
                        boxShadow: "none",
                      },
                    }}
                  >
                    Login
                  </Button>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push("/login?mode=signup")}
                    sx={{
                      borderRadius: 999,
                      px: 4,
                      py: 1.4,
                      fontWeight: 800,
                      textTransform: "none",
                      background: theme.palette.primary.main,
                      boxShadow: "none",
                      "&:hover": {
                        background: theme.palette.primary.dark,
                        boxShadow: "none",
                      },
                    }}
                  >
                    Sign Up
                  </Button>

                  <Button
                    variant="text"
                    size="large"
                    onClick={handleGetStarted}
                    sx={{
                      borderRadius: 999,
                      px: 3,
                      py: 1.4,
                      fontWeight: 900,
                      textTransform: "none",
                      color: isDark ? "#fde68a" : "#9a6d00",
                    }}
                  >
                    Get Started
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
                <Box
                  component="video"
                  src="/Bost1.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: 520,
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                    borderRadius: 0,
                    boxShadow: "none",
                    outline: "none",
                    background: "transparent",
                  }}
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
