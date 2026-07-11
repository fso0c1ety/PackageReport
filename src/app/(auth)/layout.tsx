"use client";

import { Box, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: '#F8FAFC',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(380px, .9fr) minmax(560px, 1.1fr)' },
        position: 'relative',
        overflow: { xs: 'auto', md: 'hidden' },
      }}
    >
      <Box sx={{ display: { xs: 'none', md: 'flex' }, minHeight: '100vh', p: { md: 5, lg: 8 }, color: '#fff', background: 'linear-gradient(145deg, #0F172A 0%, #172554 52%, #312E81 100%)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', bgcolor: 'rgba(37,99,235,.22)', filter: 'blur(10px)', right: -180, top: -140 }} />
        <Stack sx={{ position: 'relative', zIndex: 1, justifyContent: 'space-between', width: '100%' }}>
          <Stack direction="row" spacing={1.4} alignItems="center">
            <Box component="img" src="/icon.png" alt="Smart Manage" sx={{ width: 44, height: 44, borderRadius: 2.5 }} />
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800 }}>Smart Manage</Typography>
          </Stack>
          <Box>
            <Typography component="h1" sx={{ fontSize: { md: '2.65rem', lg: '3.6rem' }, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-.045em', maxWidth: 580 }}>Manage reports with clarity and confidence.</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.72)', fontSize: '1.08rem', lineHeight: 1.75, maxWidth: 530, mt: 2.5 }}>One secure workspace for your reports, packages, teams and daily operations.</Typography>
            <Stack spacing={1.7} sx={{ mt: 4 }}>
              {["Create reports faster", "Manage packages easily", "Keep your data organized"].map((benefit) => <Stack key={benefit} direction="row" spacing={1.2} alignItems="center"><CheckCircleRoundedIcon sx={{ color: '#93C5FD', fontSize: 21 }} /><Typography fontWeight={650}>{benefit}</Typography></Stack>)}
            </Stack>
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,.5)', fontSize: '.82rem' }}>Simple. Secure. Built for modern businesses.</Typography>
        </Stack>
      </Box>
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', minHeight: { xs: '100vh', md: '100%' }, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 4, md: 6 }, bgcolor: '#F8FAFC' }}>
        <Box sx={{ width: '100%', maxWidth: 620 }}>{children}</Box>
      </Box>
    </Box>
  );
}
