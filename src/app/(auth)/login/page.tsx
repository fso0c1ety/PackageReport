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
  backgroundColor: 'rgba(44, 45, 74, 0.7)',
  backdropFilter: 'blur(12px)',
  borderRadius: '24px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: theme.spacing(5),
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  color: '#fff',
  width: '100%',
  maxWidth: '440px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    color: '#fff',
    transition: 'all 0.2s ease-in-out',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#6366f1',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#94a3b8',
    '&.Mui-focused': {
      color: '#6366f1',
    },
  },
  '& .MuiInputBase-input': {
    padding: '16px',
  },
  marginBottom: '20px',
});

const GradientButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '14px',
  fontSize: '1rem',
  fontWeight: 700,
  textTransform: 'none',
  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  color: '#fff',
  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const ToggleButton = styled(Button)({
  color: '#94a3b8',
  textTransform: 'none',
  fontSize: '0.875rem',
  '&:hover': {
    color: '#6366f1',
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
});

export default function LoginPage() {
  const router = useRouter();
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
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/';
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
      <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center' }}>
        <GlassCard elevation={0}>
          <Avatar
            sx={{
              m: 1,
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              width: 56,
              height: 56,
              mb: 3,
              border: '2px solid rgba(99, 102, 241, 0.2)'
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
              background: 'linear-gradient(to right, #fff, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {isLogin ? 'Welcome back' : 'Create account'}
          </Typography>

          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 4, textAlign: 'center' }}>
            {isLogin
              ? 'Enter your credentials to access your workspaces'
              : 'Join PackageReport to start managing your projects'}
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
                      <PersonIcon sx={{ color: '#6366f1', fontSize: 20 }} />
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
                    <EmailIcon sx={{ color: '#6366f1', fontSize: 20 }} />
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
                    <LockIcon sx={{ color: '#6366f1', fontSize: 20 }} />
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
                  bgcolor: error.includes('successful') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: error.includes('successful') ? '#4ade80' : '#f87171',
                  border: `1px solid ${error.includes('successful') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  '& .MuiAlert-icon': { color: error.includes('successful') ? '#4ade80' : '#f87171' }
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
