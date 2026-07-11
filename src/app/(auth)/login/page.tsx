'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

const LoginForm = dynamic(() => import('../LoginForm').then((mod) => mod.LoginForm), {
  ssr: false,
  loading: () => <Box sx={{ p: 3 }}>Loading...</Box>,
});

const navItems = [
  ['Home', '/'],
  ['Services', '/#services'],
  ['About Us', '/#about'],
  ['Pricing', '/pricing'],
  ['Contact', '/#contact'],
];

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f7fb', color: '#11152d' }}>
      <Box component="header" sx={{ position: 'relative', zIndex: 10, bgcolor: 'rgba(255,255,255,.88)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(17,21,45,.08)' }}>
        <Container maxWidth="xl">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 76, gap: 2 }}>
            <Stack component={Link} href="/" direction="row" alignItems="center" spacing={1.2} sx={{ textDecoration: 'none', color: 'inherit' }}>
              <Box component="img" src="/icon.png" alt="Smart Manage" sx={{ width: 38, height: 38, borderRadius: 2.5 }} />
              <Typography sx={{ fontWeight: 900, letterSpacing: '-.035em', fontSize: '1.08rem' }}>Smart Manage</Typography>
            </Stack>

            <Stack component="nav" direction="row" spacing={{ sm: 1, lg: 2.5 }} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {navItems.map(([label, href]) => (
                <Button key={label} component={Link} href={href} sx={{ color: '#596078', textTransform: 'none', fontWeight: 700, px: 1, '&:hover': { color: '#5b5cf0', bgcolor: 'transparent' } }}>
                  {label}
                </Button>
              ))}
            </Stack>

            <Button component={Link} href="/" startIcon={<ArrowBackRoundedIcon />} sx={{ borderRadius: 999, px: 2, color: '#11152d', border: '1px solid rgba(17,21,45,.12)', textTransform: 'none', fontWeight: 800, bgcolor: '#fff' }}>
              Back home
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 6 } }}>
        <Box sx={{ minHeight: { md: 'calc(100vh - 124px)' }, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.08fr) minmax(420px,.92fr)' }, gap: { xs: 3, lg: 4 }, alignItems: 'stretch' }}>
          <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: { xs: 5, md: 7 }, p: { xs: 3, sm: 5, md: 7 }, minHeight: { xs: 380, lg: 650 }, color: '#fff', background: 'linear-gradient(135deg,#15173b 0%,#3f3fc9 55%,#7258ef 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 30px 80px rgba(55,52,170,.25)' }}>
            <Box sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', right: -150, top: -130, bgcolor: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)' }} />
            <Box sx={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', left: -100, bottom: -120, bgcolor: '#88f0d2', opacity: .22, filter: 'blur(4px)' }} />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: 'fit-content', px: 1.5, py: .8, borderRadius: 999, bgcolor: 'rgba(255,255,255,.11)', border: '1px solid rgba(255,255,255,.15)' }}>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 17, color: '#9ff3d9' }} />
                <Typography sx={{ fontSize: '.8rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>One workspace. Total clarity.</Typography>
              </Stack>
              <Typography component="h1" sx={{ mt: 4, maxWidth: 670, fontSize: { xs: '2.5rem', sm: '3.6rem', xl: '4.5rem' }, lineHeight: .98, fontWeight: 900, letterSpacing: '-.065em' }}>
                Turn busy work into smooth progress.
              </Typography>
              <Typography sx={{ mt: 3, maxWidth: 560, color: 'rgba(255,255,255,.74)', fontSize: { xs: '1rem', md: '1.12rem' }, lineHeight: 1.7 }}>
                Organize packages, automate follow-ups and give your whole team a clear view of what moves next.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ position: 'relative', zIndex: 1, mt: 5 }}>
              {['7-day free trial', 'No card required', 'Live team updates'].map((item) => (
                <Stack key={item} direction="row" spacing={.7} alignItems="center" sx={{ px: 1.4, py: 1, borderRadius: 2.5, bgcolor: 'rgba(9,12,35,.20)' }}>
                  <CheckRoundedIcon sx={{ fontSize: 18, color: '#9ff3d9' }} />
                  <Typography sx={{ fontSize: '.88rem', fontWeight: 700 }}>{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 0, sm: 3, xl: 7 }, py: { xs: 0, lg: 3 } }}>
            <Box sx={{ width: '100%', maxWidth: 500 }}><LoginForm /></Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
