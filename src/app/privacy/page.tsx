"use client";

import React from 'react';
import { Box, Container, Typography, Stack, useTheme, Divider } from '@mui/material';

export default function PrivacyPage() {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default, py: 10 }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>Privacy Policy</Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 6 }}>Last updated: April 21, 2026</Typography>
        
        <Stack spacing={4}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>1. Information We Collect</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              We collect information you provide directly to us, such as when you create an account, update your profile, or use our task management features. This includes your name, email address, and any content you upload.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>2. How We Use Your Information</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to protect Smart Manage and our users.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>3. Data Sharing</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              We do not share your personal information with third parties except as described in this policy, such as with your consent or for legal reasons.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>4. Data Security</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>5. Cookies</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              We use cookies to improve your experience on our platform and to understand how our service is being used.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 8 }} />
        
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>
          For any privacy-related concerns, please contact us at privacy@smart-manage.app
        </Typography>
      </Container>
    </Box>
  );
}
