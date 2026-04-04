'use client';

import { Suspense } from 'react';
import { Box, Container, useTheme } from '@mui/material';
import { LoginForm } from '../LoginForm';

export default function LoginPage() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(180deg, #090b11 0%, #111827 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(380px, 460px) 1fr' },
            gap: { xs: 3, md: 4 },
            alignItems: 'stretch',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: 460 }}>
              <Suspense fallback={<Box sx={{ p: 3 }}>Loading...</Box>}>
                <LoginForm />
              </Suspense>
            </Box>
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 620,
              overflow: 'hidden',
              borderRadius: 4,
              background: theme.palette.mode === 'dark' ? 'rgba(18, 18, 30, 0.82)' : '#ffffff',
            }}
          >
            <Box
              component="video"
              src="/login-side-video.mp4"
              autoPlay
              loop
              muted
              playsInline
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
