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
  IconButton,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, redirectToAppRoute, isNativeStaticRuntime, publicFetch } from '../apiUrl';

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
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    birth_date: '',
    gender: '',
    job_title: '',
    company: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState("");
  const [twoFactorEmailHint, setTwoFactorEmailHint] = useState("");
  const [otpCode, setOtpCode] = useState("");
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

    const endpoint = twoFactorChallengeId ? 'login/verify-2fa' : isLogin ? 'login' : 'register';

    try {
      const response = await publicFetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twoFactorChallengeId
          ? { challengeId: twoFactorChallengeId, code: otpCode }
          : {
              ...formData,
              name: isLogin
                ? formData.name
                : `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim(),
            }),
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

      if (isLogin && data?.requiresTwoFactor) {
        setTwoFactorChallengeId(data.challengeId);
        setTwoFactorEmailHint(data.emailHint || formData.email);
        setOtpCode("");
        setError("");
        return;
      }

      if (isLogin) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.removeItem('subscriptionBannerDismissed');
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

      if (isLogin && !twoFactorChallengeId) {
        setFormData((prev) => ({ ...prev, password: '' }));
        window.setTimeout(() => passwordInputRef.current?.focus(), 0);
      } else if (twoFactorChallengeId) {
        setOtpCode("");
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
                  {twoFactorChallengeId ? 'Verify Your Login' : isLogin ? 'Welcome Back' : 'Create Account'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.95rem',
                    color: LIGHT.textMuted,
                    lineHeight: 1.6,
                  }}
                >
                  {twoFactorChallengeId
                    ? `We sent a 6-digit code to ${twoFactorEmailHint}`
                    : isLogin
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
                <Stack spacing={2} sx={{
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
                }}>
                  <Typography sx={{ fontSize: '.72rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: LIGHT.secondary }}>Personal details</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField fullWidth label="First Name" name="first_name" required value={formData.first_name} onChange={handleChange} />
                    <TextField fullWidth label="Last Name" name="last_name" required value={formData.last_name} onChange={handleChange} />
                  </Stack>
                  <TextField fullWidth label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="Birthday"
                      name="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField fullWidth select label="Gender" name="gender" value={formData.gender} onChange={handleChange}>
                      <MenuItem value="">Prefer not to say</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                  </Stack>
                  <Typography sx={{ pt: .5, fontSize: '.72rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: LIGHT.secondary }}>Professional details</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField fullWidth label="Job Title" name="job_title" value={formData.job_title} onChange={handleChange} />
                    <TextField fullWidth label="Company" name="company" value={formData.company} onChange={handleChange} />
                  </Stack>
                </Stack>
              </motion.div>
            )}

            {!isLogin && !twoFactorChallengeId && <Typography sx={{ fontSize: '.72rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: LIGHT.secondary }}>Account details</Typography>}

            {!twoFactorChallengeId && <TextField
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
            />}
            {!twoFactorChallengeId && <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              inputRef={passwordInputRef}
              value={formData.password}
              onChange={handleChange}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        edge="end"
                        onClick={() => setShowPassword((visible) => !visible)}
                        onMouseDown={(event) => event.preventDefault()}
                        sx={{ color: LIGHT.textMuted, mr: 0.25 }}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
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
            />}

            {!isLogin && !twoFactorChallengeId && formData.password && (
              <Box>
                <Stack direction="row" spacing={.6}>{[0,1,2].map((index) => { const strength = Number(formData.password.length >= 8) + Number(/[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password)) + Number(/\d/.test(formData.password)); return <Box key={index} sx={{ flex: 1, height: 4, borderRadius: 4, bgcolor: index < strength ? ["#ef4444","#f59e0b","#22c55e"][strength - 1] : "#e5e7eb" }} />; })}</Stack>
                <Typography sx={{ mt: .6, fontSize: '.72rem', color: LIGHT.textMuted }}>Password strength: {formData.password.length < 8 ? "Weak" : /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) && /\d/.test(formData.password) ? "Strong" : "Medium"}</Typography>
              </Box>
            )}

            {twoFactorChallengeId && (
              <TextField
                fullWidth
                autoFocus
                label="Verification Code"
                name="otpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                helperText="The code expires in 10 minutes"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: LIGHT.text,
                    backgroundColor: LIGHT.inputBg,
                    borderRadius: 3,
                    fontSize: '1.25rem',
                    letterSpacing: '0.35em',
                    '& fieldset': { borderColor: 'transparent' },
                    '&:hover fieldset': { borderColor: 'transparent' },
                    '&.Mui-focused fieldset': { borderColor: LIGHT.primary },
                  },
                }}
              />
            )}

            {isLogin && !twoFactorChallengeId && (
              <Button
                type="button"
                onClick={() => router.push('/forgot-password/')}
                sx={{
                  alignSelf: 'flex-end',
                  p: 0,
                  minWidth: 0,
                  color: LIGHT.secondary,
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { background: 'transparent', textDecoration: 'underline' },
                }}
              >
                Forgot password?
              </Button>
            )}

            {twoFactorChallengeId && (
              <Button
                type="button"
                onClick={() => {
                  setTwoFactorChallengeId("");
                  setTwoFactorEmailHint("");
                  setOtpCode("");
                  setError("");
                }}
                sx={{ alignSelf: 'flex-start', p: 0, minWidth: 0, textTransform: 'none' }}
              >
                Back to password
              </Button>
            )}

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
              ) : twoFactorChallengeId ? (
                'Verify Code'
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
            </Box>

            {/* Toggle Mode */}
            {!twoFactorChallengeId && <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', mt: 3 }}>
              <Typography sx={{ color: LIGHT.textMuted, fontSize: '0.95rem' }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </Typography>
              <Button
                onClick={() => { setIsLogin(!isLogin); setError(''); setTwoFactorChallengeId(''); setOtpCode(''); }}
                sx={{
                  fontWeight: 800, textTransform: 'none', fontSize: '0.95rem',
                  color: LIGHT.secondary, p: 0,
                  '&:hover': { background: 'transparent', textDecoration: 'underline' },
                }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Button>
            </Stack>}
          </Stack>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
}
