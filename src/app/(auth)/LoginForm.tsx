'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Paper,
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, redirectToAppRoute, isNativeStaticRuntime } from '../apiUrl';

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Always light mode — never affected by dark/light theme setting.
  const LIGHT = {
    bg: '#ffffff',
    text: '#0f172a',
    textMuted: 'rgba(15,23,42,0.75)',
    inputBg: '#f8fafc',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    secondary: '#6366f1',
    divider: 'rgba(15,23,42,0.10)',
    labelMuted: 'rgba(15,23,42,0.62)',
    disabledBg: 'rgba(15,23,42,0.08)',
    disabledText: 'rgba(15,23,42,0.38)',
  };
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? 'login' : 'register';

    try {
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const authError = new Error(
          data?.error || (response.status === 401 ? 'Invalid credentials' : 'Something went wrong')
        ) as Error & { status?: number };
        authError.status = response.status;
        throw authError;
      }

      if (isLogin) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          redirectToAppRoute('/home');
        }
      } else {
        setIsLogin(true);
        setError('Registration successful! Please log in.');
        window.setTimeout(() => emailInputRef.current?.focus(), 0);
      }
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : 0;
      const errorMsg = err?.message || 'Unknown error';
      setError(errorMsg);

      if (isLogin) {
        setFormData((prev) => ({ ...prev, password: '' }));
        window.setTimeout(() => passwordInputRef.current?.focus(), 0);
      }

      if (
        typeof window !== 'undefined' &&
        isNativeStaticRuntime() &&
        ![400, 401, 403].includes(status)
      ) {
        alert(`Login/Register Failed!\nURL: ${getApiUrl(endpoint)}\nError: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isLogin ? 'login' : 'signup'}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Paper
          sx={{
            p: { xs: 2.2, md: 3.2 },
            borderRadius: 4,
            border: `1px solid ${LIGHT.divider}`,
            background: LIGHT.bg,
            color: LIGHT.text,
            boxShadow: { xs: 'none', md: '0 20px 50px rgba(15,23,42,0.08)' },
          }}
        >
          <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Box component="img" src="/logo.png" alt="PackageReport" sx={{ width: 32, height: 32, borderRadius: 1.2, objectFit: 'contain' }} />
                  <Typography fontWeight={800} fontSize="1rem">PackageReport</Typography>
                </Stack>
                <Typography
                  component="h2"
                  sx={{
                    fontSize: { xs: '1.45rem', md: '1.9rem' },
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.95rem',
                    color: LIGHT.textMuted,
                    lineHeight: 1.6,
                  }}
                >
                  {isLogin
                    ? 'Log in to your account to access your workspace'
                    : 'Create your account to start managing packages'}
                </Typography>
              </Stack>
            </Stack>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: LIGHT.text,
                      backgroundColor: LIGHT.inputBg,
                      borderRadius: 3,
                      '& fieldset': { borderColor: 'transparent' },
                      '&:hover fieldset': { borderColor: 'transparent' },
                      '&.Mui-focused fieldset': { borderColor: 'transparent' },
                    },
                    '& .MuiInputLabel-root': {
                      color: LIGHT.labelMuted,
                      '&.Mui-focused': { color: LIGHT.secondary },
                    },
                  }}
                />
              </motion.div>
            )}

            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              required
              inputRef={emailInputRef}
              value={formData.email}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: LIGHT.text,
                  backgroundColor: LIGHT.inputBg,
                  borderRadius: 3,
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'transparent' },
                  '&.Mui-focused fieldset': { borderColor: 'transparent' },
                },
                '& .MuiInputLabel-root': {
                  color: LIGHT.labelMuted,
                  '&.Mui-focused': { color: LIGHT.secondary },
                },
              }}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              required
              inputRef={passwordInputRef}
              value={formData.password}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: LIGHT.text,
                  backgroundColor: LIGHT.inputBg,
                  borderRadius: 3,
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'transparent' },
                  '&.Mui-focused fieldset': { borderColor: 'transparent' },
                },
                '& .MuiInputLabel-root': {
                  color: LIGHT.labelMuted,
                  '&.Mui-focused': { color: LIGHT.secondary },
                },
              }}
            />

            {error && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Alert
                  severity={error.includes('successful') ? 'success' : 'error'}
                  sx={{
                    backgroundColor: error.includes('successful') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: LIGHT.text,
                    borderColor: error.includes('successful') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                  }}
                >
                  {error}
                </Alert>
              </motion.div>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                py: 1.5, mt: 2, borderRadius: 999, fontWeight: 800,
                textTransform: 'none', fontSize: '1rem', color: '#fff',
                background: LIGHT.primary, boxShadow: 'none',
                '&:hover': { background: LIGHT.primaryDark, boxShadow: 'none' },
                '&:disabled': { background: LIGHT.disabledBg, color: LIGHT.disabledText },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'inherit' }} />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
            </Box>

            {/* Toggle Mode */}
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', mt: 3 }}>
              <Typography sx={{ color: LIGHT.textMuted, fontSize: '0.95rem' }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </Typography>
              <Button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                sx={{
                  fontWeight: 800, textTransform: 'none', fontSize: '0.95rem',
                  color: LIGHT.secondary, p: 0,
                  '&:hover': { background: 'transparent', textDecoration: 'underline' },
                }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
}
