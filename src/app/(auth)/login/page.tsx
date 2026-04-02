'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  IconButton,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { AnimatePresence, motion } from 'framer-motion';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { getServerUrl } from '../../apiUrl';
import smartManageLogo from '../../../../assets/icon.png';

const LoginShell = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  width: '100%',
  position: 'relative',
  overflowX: 'hidden',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'center',
  background: `
    radial-gradient(circle at top left, ${alpha('#38bdf8', 0.22)} 0%, transparent 28%),
    radial-gradient(circle at bottom right, ${alpha(theme.palette.primary.main, 0.28)} 0%, transparent 34%),
    linear-gradient(135deg, #07111f 0%, #0d1628 48%, #111c34 100%)
  `,
  [theme.breakpoints.down('sm')]: {
    alignItems: 'flex-start',
  },
}));

const FloatingOrb = styled(Box)<{ size: number; top?: string; left?: string; right?: string; bottom?: string; color: string }>(
  ({ size, top, left, right, bottom, color }) => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: '50%',
    top,
    left,
    right,
    bottom,
    background: color,
    filter: 'blur(10px)',
    opacity: 0.55,
    pointerEvents: 'none',
  }),
);

const ContentGrid = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '1400px',
  minHeight: '100vh',
  padding: theme.spacing(3),
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 520px)',
  gap: theme.spacing(3),
  position: 'relative',
  zIndex: 1,
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: 'auto',
    padding: theme.spacing(1.25),
    gap: theme.spacing(1.25),
  },
}));

const HeroPanel = styled(Paper)(({ theme }) => ({
  minHeight: 'calc(100vh - 48px)',
  borderRadius: 36,
  padding: theme.spacing(5),
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  background: `
    linear-gradient(160deg, ${alpha('#0f172a', 0.88)} 0%, ${alpha('#111827', 0.68)} 45%, ${alpha('#172554', 0.82)} 100%),
    radial-gradient(circle at top right, ${alpha('#22d3ee', 0.18)} 0%, transparent 30%)
  `,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  boxShadow: '0 40px 120px rgba(2, 6, 23, 0.55)',
  [theme.breakpoints.down('md')]: {
    minHeight: 'auto',
    padding: theme.spacing(3),
  },
  [theme.breakpoints.down('sm')]: {
    borderRadius: 24,
    padding: theme.spacing(2.25),
    order: 2,
  },
}));

const FormPanel = styled(Paper)(({ theme }) => ({
  minHeight: 'calc(100vh - 48px)',
  borderRadius: 36,
  padding: theme.spacing(4),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: alpha('#08111f', 0.72),
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  boxShadow: '0 40px 120px rgba(2, 6, 23, 0.5)',
  [theme.breakpoints.down('md')]: {
    minHeight: 'auto',
    padding: theme.spacing(2),
  },
  [theme.breakpoints.down('sm')]: {
    borderRadius: 24,
    padding: theme.spacing(1),
    order: 1,
  },
}));

const FormCard = styled(motion.div)(({ theme }) => ({
  width: '100%',
  borderRadius: 28,
  padding: theme.spacing(4),
  background: `
    linear-gradient(180deg, ${alpha('#f8fafc', 0.08)} 0%, ${alpha('#e2e8f0', 0.04)} 100%),
    ${alpha('#020617', 0.48)}
  `,
  border: `1px solid ${alpha(theme.palette.common.white, 0.09)}`,
  backdropFilter: 'blur(18px)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3),
    borderRadius: 24,
  },
  [theme.breakpoints.down(420)]: {
    padding: theme.spacing(2.25),
    borderRadius: 20,
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 18,
    backgroundColor: alpha('#ffffff', 0.04),
    transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
    '& fieldset': {
      borderColor: alpha(theme.palette.common.white, 0.1),
    },
    '&:hover fieldset': {
      borderColor: alpha(theme.palette.primary.light, 0.5),
    },
    '&.Mui-focused': {
      transform: 'translateY(-1px)',
      backgroundColor: alpha('#ffffff', 0.06),
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.light,
      borderWidth: 2,
    },
  },
  '& .MuiInputBase-input': {
    color: theme.palette.common.white,
    fontWeight: 600,
    paddingTop: 16,
    paddingBottom: 16,
  },
  '& .MuiInputLabel-root': {
    color: alpha(theme.palette.common.white, 0.64),
  },
}));

const PrimaryButton = styled(Button)(({ theme }) => ({
  minHeight: 56,
  borderRadius: 18,
  fontWeight: 800,
  fontSize: '1rem',
  textTransform: 'none',
  background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 50%, #2563eb 100%)`,
  boxShadow: `0 18px 40px ${alpha(theme.palette.primary.main, 0.42)}`,
  '&:hover': {
    background: `linear-gradient(135deg, #a5b4fc 0%, ${theme.palette.primary.main} 50%, #1d4ed8 100%)`,
    boxShadow: `0 22px 48px ${alpha(theme.palette.primary.main, 0.52)}`,
  },
}));

const SecondaryButton = styled(Button)(({ theme }) => ({
  minHeight: 52,
  borderRadius: 16,
  textTransform: 'none',
  fontWeight: 700,
  color: theme.palette.common.white,
  borderColor: alpha(theme.palette.common.white, 0.12),
  backgroundColor: alpha(theme.palette.common.white, 0.03),
  '&:hover': {
    borderColor: alpha(theme.palette.primary.light, 0.45),
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));

const MetricCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.2),
  borderRadius: 24,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  background: alpha('#0f172a', 0.35),
  backdropFilter: 'blur(14px)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.75),
    borderRadius: 18,
  },
}));

const SignalCard = styled(motion.div)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 20,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  background: alpha('#ffffff', 0.04),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5),
    borderRadius: 16,
  },
}));

const featurePoints = [
  {
    title: 'Live shipment visibility',
    copy: 'See package flow, blockers, and team movement from one clean control layer.',
    icon: <Inventory2RoundedIcon sx={{ color: '#7dd3fc' }} />,
  },
  {
    title: 'Faster daily decisions',
    copy: 'Keep reports moving with automation, status checks, and fewer handoff delays.',
    icon: <BoltRoundedIcon sx={{ color: '#a5b4fc' }} />,
  },
  {
    title: 'Traceable team activity',
    copy: 'Every change stays visible, auditable, and easy to follow across workspaces.',
    icon: <ShieldRoundedIcon sx={{ color: '#86efac' }} />,
  },
];

export default function LoginPage() {
  const theme = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login/' : '/api/auth/register/';

    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse server response:', parseError, 'Status:', response.status);
        throw new Error(`Server returned an unexpected response (${response.status}). Please try again.`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (isLogin) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = '/';
        }
      } else {
        setIsLogin(true);
        setError('Registration successful! Please sign in.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const successMessage = error.includes('successful');

  return (
    <LoginShell>
      <FloatingOrb size={240} top="-60px" left="-30px" color={alpha('#38bdf8', 0.22)} />
      <FloatingOrb size={320} bottom="-120px" right="-80px" color={alpha(theme.palette.primary.main, 0.22)} />

      <ContentGrid>
        <HeroPanel elevation={0} sx={{ display: { xs: 'flex', sm: 'flex' } }}>
          <Box>
            <Stack direction="row" spacing={{ xs: 1.25, sm: 1.75 }} alignItems="center" sx={{ mb: { xs: 2.5, sm: 3.5 } }}>
              <Box
                sx={{
                  width: { xs: 52, sm: 64 },
                  height: { xs: 52, sm: 64 },
                  borderRadius: 3.5,
                  overflow: 'hidden',
                  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.45)',
                  border: `1px solid ${alpha('#ffffff', 0.08)}`,
                  flexShrink: 0,
                }}
              >
                <Image src={smartManageLogo} alt="Smart Manage logo" width={64} height={64} priority />
              </Box>
              <Box>
                <Typography sx={{ color: '#f8fafc', fontSize: { xs: '1.1rem', sm: '1.35rem' }, fontWeight: 900, letterSpacing: '-0.03em' }}>
                  Smart Manage
                </Typography>
                <Chip
                  label="Operations Workspace"
                  sx={{
                    mt: 0.75,
                    color: '#dbeafe',
                    bgcolor: alpha('#60a5fa', 0.12),
                    border: `1px solid ${alpha('#93c5fd', 0.2)}`,
                    fontWeight: 700,
                    height: { xs: 26, sm: 32 },
                    '& .MuiChip-label': {
                      px: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.72rem', sm: '0.8125rem' },
                    },
                  }}
                />
              </Box>
            </Stack>

            <Typography
              sx={{
                color: '#f8fafc',
                fontSize: { xs: '1.95rem', sm: '2.75rem', md: '4.5rem' },
                lineHeight: { xs: 1.02, sm: 0.98, md: 0.96 },
                letterSpacing: '-0.05em',
                fontWeight: 900,
                maxWidth: { xs: '12ch', sm: '10ch' },
              }}
            >
              Make every package update feel under control.
            </Typography>

            <Typography
              sx={{
                color: alpha('#e2e8f0', 0.72),
                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' },
                lineHeight: { xs: 1.6, sm: 1.7 },
                mt: { xs: 1.5, sm: 2.5 },
                maxWidth: 620,
              }}
            >
              Smart Manage gives your team a calmer operations workspace for reporting, task tracking, teammate
              coordination, and the daily details that keep shipments moving.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: { xs: 2.5, sm: 4 } }}>
              <MetricCard>
                <Typography sx={{ color: '#f8fafc', fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 900 }}>24/7</Typography>
                <Typography sx={{ color: alpha('#cbd5e1', 0.72), mt: 0.5 }}>
                  Visibility across active workspaces and report queues.
                </Typography>
              </MetricCard>
              <MetricCard>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <TimelineRoundedIcon sx={{ color: '#93c5fd' }} />
                  <Typography sx={{ color: '#f8fafc', fontWeight: 800 }}>Realtime status rhythm</Typography>
                </Stack>
                <Typography sx={{ color: alpha('#cbd5e1', 0.72), mt: 1 }}>
                  Clean handoffs, clearer priorities, and fewer missed updates.
                </Typography>
              </MetricCard>
            </Stack>
          </Box>

          <Stack spacing={1.5} sx={{ mt: { xs: 2.5, md: 8 } }}>
            {featurePoints.map((point, index) => (
              <SignalCard
                key={point.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08, duration: 0.45 }}
                sx={{ display: { xs: index === 0 ? 'block' : 'none', sm: 'block' } }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: alpha('#ffffff', 0.06),
                      flexShrink: 0,
                    }}
                  >
                    {point.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#f8fafc', fontWeight: 800, mb: 0.5 }}>{point.title}</Typography>
                    <Typography sx={{ color: alpha('#cbd5e1', 0.7), lineHeight: 1.6 }}>{point.copy}</Typography>
                  </Box>
                </Stack>
              </SignalCard>
            ))}
          </Stack>
        </HeroPanel>

        <FormPanel elevation={0}>
          <AnimatePresence mode="wait">
            <FormCard
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.985 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={{ xs: 1.2, sm: 1.5 }} alignItems="center" sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: { xs: 46, sm: 54 },
                      height: { xs: 46, sm: 54 },
                      borderRadius: 3,
                      overflow: 'hidden',
                      boxShadow: '0 14px 34px rgba(37, 99, 235, 0.3)',
                      border: `1px solid ${alpha('#ffffff', 0.08)}`,
                      flexShrink: 0,
                    }}
                  >
                    <Image src={smartManageLogo} alt="Smart Manage logo" width={54} height={54} priority />
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#f8fafc', fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 900, letterSpacing: '-0.03em' }}>
                      Smart Manage
                    </Typography>
                    <Typography sx={{ color: alpha('#cbd5e1', 0.62), fontSize: { xs: '0.8rem', sm: '0.9rem' }, fontWeight: 600 }}>
                      Secure workspace access
                    </Typography>
                  </Box>
                </Stack>

                <Typography sx={{ color: alpha('#93c5fd', 0.92), fontSize: { xs: '0.74rem', sm: '0.82rem' }, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {isLogin ? 'Welcome Back' : 'Create Your Access'}
                </Typography>
                <Typography sx={{ color: '#f8fafc', fontSize: { xs: '1.65rem', sm: '2rem', md: '2.5rem' }, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: { xs: 1.05, sm: 1.08 } }}>
                  {isLogin ? 'Sign in to your workspace' : 'Open a new team account'}
                </Typography>
                <Typography sx={{ color: alpha('#cbd5e1', 0.72), lineHeight: { xs: 1.6, sm: 1.7 }, maxWidth: 420, fontSize: { xs: '0.92rem', sm: '1rem' } }}>
                  {isLogin
                    ? 'Pick up where your reporting flow left off with your latest tables, teammates, and updates in place.'
                    : 'Set up your account and step into a cleaner package reporting workspace in a few seconds.'}
                </Typography>
              </Stack>

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: { xs: 3, sm: 4 }, display: 'grid', gap: { xs: 1.5, sm: 2 } }}>
                {!isLogin && (
                  <StyledTextField
                    fullWidth
                    label="Full name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonRoundedIcon sx={{ color: alpha('#cbd5e1', 0.7) }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                <StyledTextField
                  fullWidth
                  label="Email address"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailRoundedIcon sx={{ color: alpha('#cbd5e1', 0.7) }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <StyledTextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon sx={{ color: alpha('#cbd5e1', 0.7) }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((value) => !value)} edge="end" sx={{ color: alpha('#cbd5e1', 0.68) }}>
                          {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {error && (
                  <Alert
                    severity={successMessage ? 'success' : 'error'}
                    sx={{
                      borderRadius: 3,
                      color: successMessage ? '#dcfce7' : '#fee2e2',
                      bgcolor: successMessage ? alpha('#14532d', 0.35) : alpha('#7f1d1d', 0.35),
                      border: `1px solid ${successMessage ? alpha('#22c55e', 0.25) : alpha('#ef4444', 0.25)}`,
                    }}
                  >
                    {error}
                  </Alert>
                )}

                <PrimaryButton type="submit" fullWidth disabled={loading} endIcon={!loading ? <ArrowOutwardRoundedIcon /> : undefined}>
                  {loading ? 'Processing...' : isLogin ? 'Continue to dashboard' : 'Create account'}
                </PrimaryButton>

                <Divider sx={{ borderColor: alpha('#ffffff', 0.08), color: alpha('#cbd5e1', 0.48), fontSize: '0.75rem', fontWeight: 700 }}>
                  {isLogin ? 'Need access?' : 'Already registered?'}
                </Divider>

                <SecondaryButton variant="outlined" fullWidth onClick={() => { setIsLogin((value) => !value); setError(''); }}>
                  {isLogin ? 'Create a new account' : 'Return to sign in'}
                </SecondaryButton>
              </Box>
            </FormCard>
          </AnimatePresence>
        </FormPanel>
      </ContentGrid>
    </LoginShell>
  );
}
