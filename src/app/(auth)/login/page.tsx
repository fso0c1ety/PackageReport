'use client';

import { Suspense } from 'react';
import { Box, Container, Stack } from '@mui/material';
import { LoginForm } from '../LoginForm';

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        color: '#f8fafc',
        background:
          'radial-gradient(circle at 12% 20%, rgba(16, 185, 129, 0.35) 0%, transparent 38%), radial-gradient(circle at 80% 10%, rgba(245, 158, 11, 0.28) 0%, transparent 36%), linear-gradient(135deg, #0b1220 0%, #0f172a 52%, #111827 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={4} sx={{ py: { xs: 4, md: 6 } }}>
          <Suspense fallback={<Box sx={{ p: 3 }}>Loading...</Box>}>
            <LoginForm />
          </Suspense>
        </Stack>
      </Container>
    </Box>
  );
}
