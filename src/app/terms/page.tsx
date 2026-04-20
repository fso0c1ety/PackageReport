"use client";

import React from 'react';
import { Box, Container, Typography, Stack, useTheme, Divider } from '@mui/material';

export default function TermsPage() {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default, py: 10 }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>Terms of Service</Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 6 }}>Last updated: April 21, 2026</Typography>
        
        <Stack spacing={4}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>1. Acceptance of Terms</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              By accessing and using Smart Manage (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>2. Description of Service</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              Smart Manage is a task and package management platform designed to help teams organize their work. We reserve the right to modify or discontinue the Service at any time.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>3. User Accounts</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>4. Intellectual Property</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              All content and materials available on the Service, including but not limited to text, graphics, website name, code, images, and logos are the intellectual property of Smart Manage.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>5. Limitation of Liability</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              Smart Manage shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>6. Governing Law</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              These terms shall be governed by and construed in accordance with the laws of Kosovo, without regard to its conflict of law provisions.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 8 }} />
        
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>
          If you have any questions about these Terms, please contact us at support@smart-manage.app
        </Typography>
      </Container>
    </Box>
  );
}
