'use client';

import { useEffect, useState } from 'react';
import {
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
import { getApiUrl } from '../apiUrl';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
          window.location.href = '/home';
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
        <Stack spacing={2}>
          {/* Header */}
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: '1.8rem', md: '2.4rem' },
                fontWeight: 900,
                letterSpacing: '-0.02em',
              }}
            >
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                color: 'rgba(226, 232, 240, 0.72)',
                lineHeight: 1.6,
              }}
            >
              {isLogin
                ? 'Log in to your account to access your workspace'
                : 'Create your account to start managing packages'}
            </Typography>
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
                      color: '#f8fafc',
                      '& fieldset': {
                        borderColor: 'rgba(241, 245, 249, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(241, 245, 249, 0.35)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#10b981',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(226, 232, 240, 0.6)',
                      '&.Mui-focused': {
                        color: '#10b981',
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
                  color: '#f8fafc',
                  '& fieldset': {
                    borderColor: 'rgba(241, 245, 249, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(241, 245, 249, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#10b981',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(226, 232, 240, 0.6)',
                  '&.Mui-focused': {
                    color: '#10b981',
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
                  color: '#f8fafc',
                  '& fieldset': {
                    borderColor: 'rgba(241, 245, 249, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(241, 245, 249, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#10b981',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(226, 232, 240, 0.6)',
                  '&.Mui-focused': {
                    color: '#10b981',
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
                    color: error.includes('successful') ? '#86efac' : '#fca5a5',
                    borderColor: error.includes('successful') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  {error}
                </Alert>
              </motion.div>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              sx={{
                py: 1.5,
                mt: 2,
                borderRadius: 999,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 14px 34px rgba(16, 185, 129, 0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #34d399, #10b981)',
                  boxShadow: '0 20px 45px rgba(16, 185, 129, 0.4)',
                },
                '&:disabled': {
                  background: 'rgba(241, 245, 249, 0.15)',
                  color: 'rgba(241, 245, 249, 0.5)',
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
            <Typography sx={{ color: 'rgba(226, 232, 240, 0.6)', fontSize: '0.95rem' }}>
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
                color: '#fde68a',
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
      </motion.div>
    </AnimatePresence>
  );
}
