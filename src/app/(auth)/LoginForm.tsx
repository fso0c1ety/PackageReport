'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Avatar,
  Alert,
  Paper,
  InputAdornment,
  useTheme,
  alpha,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import LoginIcon from '@mui/icons-material/Login';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { getApiUrl } from '../apiUrl';

// --- Styled Components ---

const GlassCard = styled(motion(Paper))(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.7),
  backdropFilter: 'blur(34px) saturate(180%)',
  borderRadius: '32px',
  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  padding: theme.spacing(6),
  boxShadow: `0 24px 80px ${alpha(theme.palette.common.black, 0.4)}`,
  width: '100%',
  maxWidth: '480px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  zIndex: 10,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: alpha(theme.palette.common.white, 0.05),
    borderRadius: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '& fieldset': {
      borderColor: alpha(theme.palette.divider, 0.1),
    },
    '&:hover fieldset': {
      borderColor: alpha(theme.palette.primary.main, 0.3),
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
    },
    '&.Mui-focused': {
      backgroundColor: alpha(theme.palette.common.white, 0.08),
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.2)}`,
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    fontSize: '0.95rem',
  },
  '& .MuiInputBase-input': {
    padding: '18px 14px',
    fontWeight: 500,
  },
  marginBottom: '24px',
}));

const MainActionButton = styled(Button)(({ theme }) => ({
  borderRadius: '18px',
  padding: '16px',
  fontSize: '1.1rem',
  fontWeight: 700,
  textTransform: 'none',
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: '#fff',
  boxShadow: `0 12px 30px ${alpha(theme.palette.primary.main, 0.4)}`,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
    transform: 'translateY(-4px) scale(1.02)',
    boxShadow: `0 18px 45px ${alpha(theme.palette.primary.main, 0.5)}`,
  },
  '&:active': {
    transform: 'translateY(0) scale(0.98)',
  },
  '&.Mui-disabled': {
    opacity: 0.7,
    background: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },
}));

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
          window.location.href = '/';
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
      <GlassCard
        key={isLogin ? 'login' : 'signup'}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <Avatar sx={{
          width: 80,
          height: 80,
          mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
        }}>
          <LoginIcon sx={{ fontSize: 40, color: '#fff' }} />
        </Avatar>

        <Typography variant="h4" fontWeight={900} sx={{
          mb: 1,
          textAlign: 'center',
          letterSpacing: '-1px',
          color: '#fff'
        }}>
          {isLogin ? 'Welcome Back' : 'Join Us'}
        </Typography>

        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', mb: 5, textAlign: 'center' }}>
          {isLogin ? 'Login to manage your workspace' : 'Create an account to get started'}
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          {!isLogin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <StyledTextField
                fullWidth
                label="Full Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: theme.palette.primary.main }} />
                    </InputAdornment>
                  ),
                }}
              />
            </motion.div>
          )}

          <StyledTextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: theme.palette.primary.main }} />
                </InputAdornment>
              ),
            }}
          />

          <StyledTextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: theme.palette.primary.main }} />
                </InputAdornment>
              ),
            }}
          />

          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Alert severity={error.includes('successful') ? 'success' : 'error'} sx={{ 
                mb: 3, 
                borderRadius: '16px',
                bgcolor: alpha(error.includes('successful') ? theme.palette.success.main : theme.palette.error.main, 0.1),
                color: error.includes('successful') ? theme.palette.success.light : theme.palette.error.light,
              }}>
                {error}
              </Alert>
            </motion.div>
          )}

          <MainActionButton
            type="submit"
            fullWidth
            disabled={loading}
            endIcon={!loading && <ArrowForwardIcon />}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Get Started')}
          </MainActionButton>

          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 2 }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </Typography>
            <Button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              sx={{ 
                color: theme.palette.primary.main, 
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': { background: 'transparent', textDecoration: 'underline' }
              }}
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </GlassCard>
    </AnimatePresence>
  );
}
