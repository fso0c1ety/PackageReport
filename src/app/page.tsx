"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { motion } from "framer-motion";
import { useThemeContext } from "./ThemeContext";

export default function LandingPage() {
  const router = useRouter();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeContext();
  const isDark = mode === "dark";

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      router.replace("/home");
    } else {
      // On web, redirect to home if user is already logged in
      const hasToken = !!localStorage.getItem("token");
      if (hasToken) {
        router.replace("/home");
      }
    }
  }, [router]);

  const handleGetStarted = () => {
    router.push("/login?mode=signup");
  };

  if (Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        color: theme.palette.text.primary,
        background:
          isDark
            ? "radial-gradient(circle at 12% 20%, rgba(16, 185, 129, 0.20) 0%, transparent 38%), radial-gradient(circle at 80% 10%, rgba(245, 158, 11, 0.18) 0%, transparent 36%), linear-gradient(135deg, #0b1220 0%, #0f172a 52%, #111827 100%)"
            : "radial-gradient(circle at 10% 18%, rgba(16, 185, 129, 0.16) 0%, transparent 40%), radial-gradient(circle at 85% 12%, rgba(245, 158, 11, 0.14) 0%, transparent 34%), linear-gradient(135deg, #f6f9ff 0%, #eef6ff 50%, #f8fafc 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navigation Bar */}
      <AppBar
        position="static"
        sx={{
          background: isDark
            ? "linear-gradient(135deg, rgba(11, 18, 32, 0.92) 0%, rgba(15, 23, 42, 0.92) 100%)"
            : "linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(242, 248, 255, 0.82) 100%)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 8px 30px rgba(2, 6, 23, 0.08)",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 2,
            }}
          >
            {/* Logo & App Name */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: "center", cursor: "pointer" }}
              onClick={() => router.push("/")}
            >
              <Box
                component="img"
                src="/icon.png"
                alt="PackageReport logo"
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "10px",
                  objectFit: "cover",
                  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                  boxShadow: isDark ? "0 8px 20px rgba(0,0,0,0.35)" : "0 8px 20px rgba(15, 23, 42, 0.16)",
                }}
              />
              <Typography
                sx={{
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: theme.palette.text.primary,
                }}
              >
                PackageReport
              </Typography>
            </Stack>

            {/* Navigation Links */}
            <Stack
              direction="row"
              spacing={3}
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
              }}
            >
              <Button
                sx={{
                  color: theme.palette.text.primary,
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  "&:hover": {
                    color: theme.palette.secondary.main,
                  },
                }}
              >
                Home
              </Button>
              <Button
                sx={{
                  color: theme.palette.text.secondary,
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  "&:hover": {
                    color: theme.palette.secondary.main,
                  },
                }}
              >
                Services
              </Button>
              <Button
                sx={{
                  color: theme.palette.text.secondary,
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  "&:hover": {
                    color: theme.palette.secondary.main,
                  },
                }}
              >
                About Us
              </Button>
            </Stack>

            {/* Auth Buttons */}
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: theme.palette.text.primary,
                  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.45),
                }}
              >
                {isDark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </IconButton>
              <Button
                onClick={() => router.push("/login")}
                sx={{
                  color: theme.palette.text.primary,
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 700,
                  "&:hover": {
                    color: theme.palette.secondary.main,
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
                  px: 3,
                  py: 1,
                  fontWeight: 800,
                  textTransform: "none",
                  background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark || theme.palette.secondary.main})`,
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
                  "&:hover": {
                    boxShadow: "0 15px 35px rgba(16, 185, 129, 0.4)",
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
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 4, md: 6 },
              alignItems: "center",
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
                      background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark || theme.palette.secondary.main})`,
                      boxShadow: "0 14px 34px rgba(16, 185, 129, 0.35)",
                    }}
                  >
                    Login
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => router.push("/login?mode=signup")}
                    sx={{
                      borderRadius: 999,
                      px: 4,
                      py: 1.4,
                      fontWeight: 800,
                      textTransform: "none",
                      borderColor: alpha(theme.palette.divider, 0.9),
                      color: theme.palette.text.primary,
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
                  height: { xs: 360, md: 500 },
                }}
              >
                {/* Gradient Background Circle */}
                <Box
                  sx={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.secondary.main, isDark ? 0.2 : 0.16)} 0%, transparent 70%)`,
                    borderRadius: "50%",
                    filter: "blur(40px)",
                  }}
                />

                {/* Product preview card */}
                <Box
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: 510,
                    p: 2,
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                    background: alpha(theme.palette.background.paper, isDark ? 0.55 : 0.88),
                    backdropFilter: "blur(10px)",
                    boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.45)" : "0 24px 60px rgba(15,23,42,0.14)",
                  }}
                >
                  <Stack spacing={1.6}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box
                        component="img"
                        src="/icon.png"
                        alt="PackageReport"
                        sx={{ width: 30, height: 30, borderRadius: 1.5 }}
                      />
                      <Typography fontWeight={800}>Workspace Overview</Typography>
                    </Stack>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 1.2,
                      }}
                    >
                      <Box sx={{ p: 1.4, borderRadius: 2, background: alpha(theme.palette.secondary.main, 0.14) }}>
                        <Typography variant="caption" color="text.secondary">Open Tasks</Typography>
                        <Typography fontWeight={900} fontSize="1.1rem">42</Typography>
                      </Box>
                      <Box sx={{ p: 1.4, borderRadius: 2, background: alpha(theme.palette.primary.main, 0.14) }}>
                        <Typography variant="caption" color="text.secondary">In Review</Typography>
                        <Typography fontWeight={900} fontSize="1.1rem">17</Typography>
                      </Box>
                      <Box sx={{ p: 1.4, borderRadius: 2, background: alpha(theme.palette.warning.main, 0.14) }}>
                        <Typography variant="caption" color="text.secondary">Delayed</Typography>
                        <Typography fontWeight={900} fontSize="1.1rem">3</Typography>
                      </Box>
                    </Box>
                    <Stack spacing={1}>
                      {["Packaging Flow", "Courier Sync", "Client Updates", "Automation Rules"].map((item, idx) => (
                        <motion.div
                          key={item}
                          initial={{ opacity: 0, x: 18 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 * idx + 0.2 }}
                        >
                          <Box
                            sx={{
                              p: 1.2,
                              borderRadius: 2,
                              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                              background: alpha(theme.palette.background.default, isDark ? 0.45 : 0.55),
                            }}
                          >
                            <Typography fontSize="0.92rem" fontWeight={700}>{item}</Typography>
                          </Box>
                        </motion.div>
                      ))}
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            </motion.div>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
