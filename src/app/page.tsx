"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Box, Button, Container, Stack, Typography } from "@mui/material";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      router.replace("/home");
    }
  }, [router]);

  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");

  const handleGetStarted = () => {
    if (hasToken) {
      router.push("/home");
      return;
    }
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
        alignItems: "center",
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4} sx={{ py: { xs: 8, md: 10 } }}>
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
              fontSize: { xs: "2.2rem", md: "4.4rem" },
              lineHeight: 1.04,
              fontWeight: 900,
              maxWidth: "16ch",
              letterSpacing: "-0.03em",
            }}
          >
            Run workspaces that move fast and stay crystal clear.
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: "1rem", md: "1.2rem" },
              color: "rgba(226, 232, 240, 0.84)",
              maxWidth: "58ch",
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
      </Container>
    </Box>
  );
}
