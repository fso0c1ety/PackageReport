"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Box, Button, Container, Stack, Typography, AppBar, Toolbar } from "@mui/material";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();

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
        color: "#f8fafc",
        background:
          "radial-gradient(circle at 12% 20%, rgba(16, 185, 129, 0.35) 0%, transparent 38%), radial-gradient(circle at 80% 10%, rgba(245, 158, 11, 0.28) 0%, transparent 36%), linear-gradient(135deg, #0b1220 0%, #0f172a 52%, #111827 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navigation Bar */}
      <AppBar
        position="static"
        sx={{
          background: "linear-gradient(135deg, rgba(11, 18, 32, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(241, 245, 249, 0.1)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
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
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "1.3rem",
                }}
              >
                📦
              </Box>
              <Typography
                sx={{
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
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
                  color: "#f8fafc",
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  "&:hover": {
                    color: "#10b981",
                  },
                }}
              >
                Home
              </Button>
              <Button
                sx={{
                  color: "rgba(226, 232, 240, 0.7)",
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  "&:hover": {
                    color: "#10b981",
                  },
                }}
              >
                Services
              </Button>
              <Button
                sx={{
                  color: "rgba(226, 232, 240, 0.7)",
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  "&:hover": {
                    color: "#10b981",
                  },
                }}
              >
                About Us
              </Button>
            </Stack>

            {/* Auth Buttons */}
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Button
                onClick={() => router.push("/login")}
                sx={{
                  color: "#f8fafc",
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 700,
                  "&:hover": {
                    color: "#10b981",
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
                  background: "linear-gradient(135deg, #10b981, #059669)",
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
                    color: "rgba(241, 245, 249, 0.75)",
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
                    color: "rgba(226, 232, 240, 0.84)",
                    lineHeight: 1.7,
                  }}
                >
                  Plan tasks, collaborate with teammates, track updates, and keep every package flow visible
                  in one place. Built for teams that need speed without losing control.
                </Typography>

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
                      background: "linear-gradient(135deg, #10b981, #059669)",
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
                      borderColor: "rgba(241, 245, 249, 0.45)",
                      color: "#f8fafc",
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
                      color: "#fde68a",
                    }}
                  >
                    Get Started
                  </Button>
                </Stack>
              </Stack>
            </motion.div>

            {/* Right Content - Illustration */}
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
                  height: { xs: 300, md: 500 },
                }}
              >
                {/* Gradient Background Circle */}
                <Box
                  sx={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    background: "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(40px)",
                  }}
                />

                {/* Illustration Content */}
                <Box
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    textAlign: "center",
                  }}
                >
                  <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <Box
                      sx={{
                        fontSize: "120px",
                        mb: 2,
                      }}
                    >
                      📊
                    </Box>
                  </motion.div>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                      mt: 4,
                      width: "100%",
                    }}
                  >
                    <motion.div
                      animate={{ y: [0, -15, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity }}
                    >
                      <Box
                        sx={{
                          p: 3,
                          background: "rgba(16, 185, 129, 0.1)",
                          borderRadius: "16px",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <Box sx={{ fontSize: "48px", mb: 1 }}>✅</Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                          Track
                        </Typography>
                      </Box>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, -15, 0] }}
                      transition={{ duration: 3.2, repeat: Infinity, delay: 0.2 }}
                    >
                      <Box
                        sx={{
                          p: 3,
                          background: "rgba(16, 185, 129, 0.1)",
                          borderRadius: "16px",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <Box sx={{ fontSize: "48px", mb: 1 }}>👥</Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                          Collaborate
                        </Typography>
                      </Box>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, -15, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, delay: 0.4 }}
                    >
                      <Box
                        sx={{
                          p: 3,
                          background: "rgba(16, 185, 129, 0.1)",
                          borderRadius: "16px",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <Box sx={{ fontSize: "48px", mb: 1 }}>⚡</Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                          Automate
                        </Typography>
                      </Box>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, -15, 0] }}
                      transition={{ duration: 3.2, repeat: Infinity, delay: 0.6 }}
                    >
                      <Box
                        sx={{
                          p: 3,
                          background: "rgba(16, 185, 129, 0.1)",
                          borderRadius: "16px",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <Box sx={{ fontSize: "48px", mb: 1 }}>📈</Box>
                        <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                          Grow
                        </Typography>
                      </Box>
                    </motion.div>
                  </Box>
                </Box>
              </Box>
            </motion.div>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
