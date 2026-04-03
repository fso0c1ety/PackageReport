'use client';

import { Suspense } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import { LoginForm } from '../LoginForm';

export default function LoginPage() {
  const theme = useTheme();

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh', 
      width: '100vw',
      flexDirection: { xs: 'column', md: 'row' },
      background: '#0f172a'
    }}>
      {/* Visual Section - Left side on Desktop */}
      <Box sx={{
        flex: 1.2,
        display: { xs: 'none', md: 'flex' },
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.28) 0%, transparent 32%),
          radial-gradient(circle at 75% 30%, rgba(34, 197, 94, 0.18) 0%, transparent 30%),
          linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e293b 100%)
        `,
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.8) 100%)',
        }
      }}>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ position: 'relative', zIndex: 1, padding: '0 80px' }}
        >
          <Typography variant="h1" fontWeight={800} sx={{ 
            fontSize: '4.5rem', 
            lineHeight: 1.1, 
            mb: 2,
            backgroundImage: 'linear-gradient(to bottom right, #fff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-2px'
          }}>
            Experience Perfection.
          </Typography>
          <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: '480px', fontWeight: 400 }}>
            Management redefined with elegance and speed. Welcome to the future of Package Reporting.
          </Typography>
        </motion.div>
      </Box>

      {/* Form Section - Right side on Desktop */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { xs: 3, md: 8 },
        position: 'relative',
        zIndex: 2
      }}>
        <Suspense fallback={<Box sx={{ p: 3 }}>Loading...</Box>}>
          <LoginForm />
        </Suspense>
      </Box>
    </Box>
  );
}
