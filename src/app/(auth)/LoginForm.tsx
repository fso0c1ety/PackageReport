'use client';

import { useEffect, useState } from 'react';
import {
  Paper,
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, redirectToAppRoute } from '../apiUrl';

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
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
      }
    } catch (err: any) {
      setError(err.message);
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
            border: '1px solid rgba(15, 23, 42, 0.06)',
            background: '#ffffff',
            boxShadow: { xs: 'none', md: '0 20px 50px rgba(15,23,42,0.08)' },
          }}
        >
          <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Box component="img" src="/icon.png" alt="PackageReport" sx={{ width: 32, height: 32, borderRadius: 1.2 }} />
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
                    color: alpha(theme.palette.text.primary, 0.75),
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
                      color: theme.palette.text.primary,
                      backgroundColor: '#f8fafc',
                      borderRadius: 3,
                      '& fieldset': {
                        borderColor: 'transparent',
                      },
                      '&:hover fieldset': {
                        borderColor: 'transparent',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'transparent',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: alpha(theme.palette.text.primary, 0.62),
                      '&.Mui-focused': {
                        color: theme.palette.secondary.main,
                      },
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
              value={formData.email}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: theme.palette.text.primary,
                  backgroundColor: '#f8fafc',
                  borderRadius: 3,
                  '& fieldset': {
                    borderColor: 'transparent',
                  },
                  '&:hover fieldset': {
                    borderColor: 'transparent',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'transparent',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: alpha(theme.palette.text.primary, 0.62),
                  '&.Mui-focused': {
                    color: theme.palette.secondary.main,
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: theme.palette.text.primary,
                  backgroundColor: '#f8fafc',
                  borderRadius: 3,
                  '& fieldset': {
                    borderColor: 'transparent',
                  },
                  '&:hover fieldset': {
                    borderColor: 'transparent',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'transparent',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: alpha(theme.palette.text.primary, 0.62),
                  '&.Mui-focused': {
                    color: theme.palette.secondary.main,
                  },
                },
              }}
            />

            {error && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Alert
                  severity={error.includes('successful') ? 'success' : 'error'}
                  sx={{
                    backgroundColor: error.includes('successful')
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                    color: theme.palette.text.primary,
                    borderColor: error.includes('successful') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
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
                py: 1.5,
                mt: 2,
                borderRadius: 999,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '1rem',
                color: '#fff',
                background: theme.palette.primary.main,
                boxShadow: 'none',
                '&:hover': {
                  background: theme.palette.primary.dark,
                  boxShadow: 'none',
                },
                '&:disabled': {
                  background: alpha(theme.palette.action.disabledBackground, 0.6),
                  color: theme.palette.action.disabled,
                },
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
              <Typography sx={{ color: alpha(theme.palette.text.primary, 0.72), fontSize: '0.95rem' }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </Typography>
              <Button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                sx={{
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  color: theme.palette.secondary.main,
                  p: 0,
                  '&:hover': {
                    background: 'transparent',
                    textDecoration: 'underline',
                  },
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
