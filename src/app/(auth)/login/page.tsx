'use client';

import { Suspense } from 'react';
import { Box, Container, Stack, Typography, alpha, useTheme } from '@mui/material';
import { LoginForm } from '../LoginForm';
import { useThemeContext } from '../../ThemeContext';

export default function LoginPage() {
  const theme = useTheme();
  const { mode } = useThemeContext();
  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        color: theme.palette.text.primary,
        background:
          isDark
            ? 'radial-gradient(circle at 12% 20%, rgba(16, 185, 129, 0.20) 0%, transparent 38%), radial-gradient(circle at 80% 10%, rgba(245, 158, 11, 0.18) 0%, transparent 36%), linear-gradient(135deg, #0b1220 0%, #0f172a 52%, #111827 100%)'
            : 'radial-gradient(circle at 10% 18%, rgba(16, 185, 129, 0.16) 0%, transparent 40%), radial-gradient(circle at 85% 12%, rgba(245, 158, 11, 0.14) 0%, transparent 34%), linear-gradient(135deg, #f6f9ff 0%, #eef6ff 50%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 8 }}
          alignItems="center"
          sx={{ py: { xs: 4, md: 8 } }}
        >
          <Stack flex={1} spacing={2.4} sx={{ maxWidth: 520 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                component="img"
                src="/icon.png"
                alt="PackageReport logo"
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                }}
              />
              <Typography fontWeight={900} fontSize="1.2rem">PackageReport</Typography>
            </Stack>
            <Typography component="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 900, letterSpacing: '-0.02em' }}>
              Organize everything in one clean workspace.
            </Typography>
            <Typography sx={{ color: alpha(theme.palette.text.primary, 0.75), lineHeight: 1.7 }}>
              Sign in to continue managing tasks, teammate updates, and package workflows with full visibility.
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
                background: alpha(theme.palette.background.paper, isDark ? 0.46 : 0.8),
              }}
            >
              <Typography fontWeight={700} fontSize="0.95rem">Realtime activity, automations, and files all connected.</Typography>
            </Box>
          </Stack>

          <Box flex={1} sx={{ width: '100%', maxWidth: 520 }}>
          <Suspense fallback={<Box sx={{ p: 3 }}>Loading...</Box>}>
            <LoginForm />
          </Suspense>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
