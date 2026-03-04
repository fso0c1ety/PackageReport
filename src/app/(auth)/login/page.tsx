'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Avatar,
  Alert,
  Paper,
  Fade,
  InputAdornment,
  useTheme,
  alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import { useRouter } from 'next/navigation';
import { getServerUrl } from '../../apiUrl';

// --- Styled Components ---

const GlassCard = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.background.paper, 0.7) 
    : alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(12px)',
  borderRadius: '24px',
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(5),
  boxShadow: theme.shadows[10],
  color: theme.palette.text.primary,
  width: '100%',
  maxWidth: '440px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.common.white, 0.03) 
      : alpha(theme.palette.common.black, 0.03),
    borderRadius: '12px',
    color: theme.palette.text.primary,
    transition: 'all 0.2s ease-in-out',
    '& fieldset': {
      borderColor: theme.palette.divider,
    },
    '&:hover fieldset': {
      borderColor: theme.palette.action.hover,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
  '& .MuiInputBase-input': {
    padding: '16px',
    color: theme.palette.text.primary,
  },
  marginBottom: '20px',
}));

const GradientButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '14px',
  fontSize: '1rem',
  fontWeight: 700,
  textTransform: 'none',
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: theme.palette.primary.contrastText,
  boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const ToggleButton = styled(Button)(({ theme }) => ({
  color: theme.palette.text.secondary,
  textTransform: 'none',
  fontSize: '0.875rem',
  '&:hover': {
    color: theme.palette.primary.main,
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
}));

export default function LoginPage() {
  const router = useRouter();
  const theme = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/register';

    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    <Fade in={true} timeout={800}>
      <Container maxWidth="sm" sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          alignItems: 'center',
          py: 4
      }}>
        <GlassCard elevation={0}>
          <Avatar
            sx={{
              m: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              width: 56,
              height: 56,
              mb: 3,
              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            <LockOutlinedIcon fontSize="medium" />
          </Avatar>

          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              mb: 1,
              textAlign: 'center',
              letterSpacing: '-0.02em',
              background: theme.palette.mode === 'dark' 
                ? 'linear-gradient(to right, #fff, #94a3b8)' 
                : `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              // Fallback for non-webkit if needed, but background-clip text handles it nicely usually
              color: 'transparent' // Important for text fill
            }}
          >
            {isLogin ? 'Welcome back' : 'Create account'}
          </Typography>

          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 4, textAlign: 'center' }}>
            {isLogin
              ? 'Enter your credentials to access your workspaces'
              : 'Join Smart Manage to start managing your projects'}
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
            {!isLogin && (
              <StyledTextField
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            <StyledTextField
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus={isLogin}
              value={formData.email}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <StyledTextField
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Alert
                severity={error.includes('successful') ? 'success' : 'error'}
                sx={{
                  mb: 2,
                  borderRadius: '12px',
                  bgcolor: error.includes('successful') ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                  color: error.includes('successful') ? theme.palette.success.main : theme.palette.error.main,
                  border: `1px solid ${error.includes('successful') ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.error.main, 0.2)}`,
                  '& .MuiAlert-icon': { color: error.includes('successful') ? theme.palette.success.main : theme.palette.error.main }
                }}
              >
                {error}
              </Alert>
            )}

            <GradientButton
              type="submit"
              fullWidth
              disabled={loading}
              sx={{ mt: 1, mb: 3 }}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Get Started')}
            </GradientButton>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <ToggleButton
                disableRipple
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
              >
                {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign In"}
              </ToggleButton>
            </Box>
          </Box>
        </GlassCard>
      </Container>
    </Fade>
  );
}
