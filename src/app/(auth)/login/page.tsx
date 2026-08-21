'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PublicHeader from '../../PublicHeader';
import { isElectronRuntime } from '../../apiUrl';

const LoginForm = dynamic(() => import('../LoginForm').then((mod) => mod.LoginForm), {
  ssr: false,
  loading: () => <Box sx={{ p: 3 }}>Loading...</Box>,
});

export default function LoginPage() {
  const [signup, setSignup] = useState(false);
  const [electronRuntime, setElectronRuntime] = useState(false);
  useEffect(() => setSignup(new URLSearchParams(window.location.search).get('mode') === 'signup'), []);
  useEffect(() => setElectronRuntime(isElectronRuntime()), []);
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f7fb', color: '#11152d' }}>
      {!electronRuntime && <PublicHeader active={signup ? 'signup' : 'signin'} />}

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 6 } }}>
        <Box sx={{ minHeight: { md: electronRuntime ? 'calc(100vh - 48px)' : 'calc(100vh - 124px)' }, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,.82fr) minmax(480px,1.18fr)' }, gap: { xs: 3, lg: 4 }, alignItems: 'stretch' }}>
          <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: { xs: 5, md: 7 }, p: { xs: 3, sm: 5, md: 6 }, minHeight: { xs: 340, lg: 610 }, color: '#fff', background: 'linear-gradient(135deg,#15173b 0%,#3f3fc9 55%,#7258ef 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 30px 80px rgba(55,52,170,.25)' }}>
            <Box sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', right: -150, top: -130, bgcolor: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)' }} />
            <Box sx={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', left: -100, bottom: -120, bgcolor: '#88f0d2', opacity: .22, filter: 'blur(4px)' }} />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography component="h1" sx={{ maxWidth: 590, fontSize: { xs: '2.5rem', sm: '3.35rem', xl: '4rem' }, lineHeight: .98, fontWeight: 900, letterSpacing: '-.065em' }}>
                Your workspace. Ready when you are.
              </Typography>
              <Typography sx={{ mt: 3, maxWidth: 560, color: 'rgba(255,255,255,.74)', fontSize: { xs: '1rem', md: '1.12rem' }, lineHeight: 1.7 }}>
                Organize packages, automate follow-ups and give your whole team a clear view of what moves next.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 1.2, mt: 4, maxWidth: 650 }}>
                {['No card required', 'Secure workspace', 'Cancel anytime'].map((item) => (
                  <Stack key={item} direction="row" spacing={1} alignItems="center" sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.10)' }}>
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(159,243,217,.15)' }}><CheckRoundedIcon sx={{ fontSize: 16, color: '#9ff3d9' }} /></Box>
                    <Typography sx={{ fontSize: '.78rem', fontWeight: 800 }}>{item}</Typography>
                  </Stack>
                ))}
              </Box>
            </Box>

          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 0, sm: 3, xl: 7 }, py: { xs: 0, lg: 3 } }}>
            <Box sx={{ width: '100%', maxWidth: 570 }}><LoginForm /></Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
