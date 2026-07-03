"use client";

import React from 'react';
import { Box, Container, Typography, Stack, useTheme, Divider } from '@mui/material';

export default function RefundPage() {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default, py: 10 }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>Refund Policy</Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 6 }}>Last updated: April 21, 2026</Typography>
        
        <Stack spacing={4}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>1. 14-Day Money Back Guarantee</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              We offer a 14-day money-back guarantee for all new subscriptions. If you are not satisfied with our service, you can request a full refund within 14 days of your initial purchase.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>2. Eligibility for Refunds</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              To be eligible for a refund, you must submit your request via our support email within the specified timeframe. Refunds are typically processed within 5-10 business days.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>3. Renewal Refunds</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              Subscription renewals are generally non-refundable. We recommend canceling your subscription before the renewal date if you no longer wish to use the service.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>4. How to Request a Refund</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
              Please send an email to support@smart-manage.app with your account details and the reason for your refund request.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 8 }} />
        
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>
          Questions about our refund policy? Email us at billing@smart-manage.app
        </Typography>
      </Container>
    </Box>
  );
}
