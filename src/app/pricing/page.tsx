"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Stack, 
  useTheme,
  alpha,
  Divider,
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticatedFetch, getApiUrl } from '../apiUrl';

const tiers = [
  {
    title: 'Free',
    price: '0',
    plan: 'trial',
    description: 'Full access for 7 days. Then view-only for 30 days before deletion.',
    features: [
      'Up to 5 Team Members',
      'Full product trial',
      '30-day recovery window',
    ],
    buttonText: 'Start for Free',
    buttonVariant: 'outlined',
  },
  {
    title: 'Basic',
    price: '0.50',
    plan: 'basic',
    description: 'For teams with 1-5 seats.',
    features: [
      'Up to 5 seats',
      'Equivalent to €8 per seat at 5 seats',
      'Unlimited boards and views',
    ],
    buttonText: 'Get Started',
    buttonVariant: 'contained',
  },
  {
    title: 'Standard',
    subheader: 'Most Popular',
    price: '75',
    plan: 'standard',
    description: 'For teams with 6-10 seats.',
    features: [
      'Up to 10 seats',
      'Equivalent to €7.50 per seat at 10 seats',
      'Automations and reporting',
    ],
    buttonText: 'Choose Standard',
    buttonVariant: 'contained',
    featured: true,
  },
  {
    title: 'Pro',
    price: '180',
    plan: 'pro',
    description: 'For teams with 11-20 seats.',
    features: ['Up to 20 seats', 'Equivalent to €9 per seat at 20 seats', 'Advanced collaboration and permissions'],
    buttonText: 'Choose Pro',
    buttonVariant: 'outlined',
  },
  {
    title: 'Enterprise',
    price: null,
    plan: 'enterprise',
    description: 'Custom pricing for organizations with more than 20 seats.',
    features: ['21+ seats', 'Custom onboarding', 'Dedicated commercial support'],
    buttonText: 'Contact Sales',
    buttonVariant: 'outlined',
  },
];

function PricingContent() {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkoutMessage, setCheckoutMessage] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId || searchParams.get('checkout') !== 'success') return;
    authenticatedFetch(getApiUrl('billing/confirm'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment confirmation failed');
      setCheckoutMessage('Payment confirmed. Your plan is active and archived boards are restored.');
    }).catch((error) => setCheckoutMessage(error.message));
  }, [searchParams]);

  const choosePlan = async (plan: string) => {
    if (plan === 'enterprise') {
      window.location.href = 'mailto:a.gjendzz@gmail.com?subject=Smart%20Manage%20Enterprise%20Plan';
      return;
    }
    if (!localStorage.getItem('token')) {
      router.push('/login/?mode=signup');
      return;
    }
    if (plan === 'trial') {
      router.push('/home/');
      return;
    }
    const response = await authenticatedFetch(getApiUrl('billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Unable to start checkout');
      return;
    }
    window.location.href = data.url;
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.background.default,
      py: 10,
      px: 2
    }}>
      <Container maxWidth="lg">
        {checkoutMessage && <Alert severity={checkoutMessage.startsWith('Payment confirmed') ? 'success' : 'error'} sx={{ mb: 3 }}>{checkoutMessage}</Alert>}
        {/* Header */}
        <Box textAlign="center" mb={10}>
          <Typography 
            variant="overline" 
            sx={{ 
              color: theme.palette.primary.main, 
              fontWeight: 800, 
              letterSpacing: 2,
              mb: 2,
              display: 'block'
            }}
          >
            PRICING PLANS
          </Typography>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 800, 
              color: theme.palette.text.primary,
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.75rem' }
            }}
          >
            Choose the right plan for your business
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: theme.palette.text.secondary, 
              maxWidth: 700, 
              mx: 'auto',
              fontWeight: 400
            }}
          >
            Manage your packages and tasks more efficiently with our powerful platform.
            Simple, transparent pricing for teams of all sizes.
          </Typography>
        </Box>

        {/* Pricing Cards */}
        <Grid container spacing={4} alignItems="stretch">
          {tiers.map((tier) => (
            <Grid key={tier.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  bgcolor: theme.palette.background.paper,
                  borderRadius: 6,
                  border: `1px solid ${tier.featured ? theme.palette.primary.main : theme.palette.divider}`,
                  boxShadow: tier.featured ? `0 20px 40px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: theme.shadows[10]
                  },
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                {tier.featured && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: -12, 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      bgcolor: theme.palette.primary.main,
                      color: '#fff',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      zIndex: 1
                    }}
                  >
                    MOST POPULAR
                  </Box>
                )}
                <CardContent sx={{ p: 4, flexGrow: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {tier.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                    {tier.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 4 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>
                      {tier.price === null ? 'Custom' : `€${tier.price}`}
                    </Typography>
                    <Typography variant="h6" sx={{ color: theme.palette.text.secondary, ml: 1 }}>
                      {tier.price === null ? '' : '/mo'}
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 4, opacity: 0.5 }} />
                  <Stack spacing={2}>
                    {tier.features.map((feature) => (
                      <Stack key={feature} direction="row" spacing={1.5} alignItems="center">
                        <CheckCircleIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
                <CardActions sx={{ p: 4, pt: 0 }}>
                  <Button 
                    fullWidth 
                    variant={tier.buttonVariant as 'contained' | 'outlined'}
                    size="large"
                    onClick={() => choosePlan(tier.plan)}
                    sx={{ 
                      borderRadius: 3, 
                      py: 1.5, 
                      fontWeight: 700,
                      textTransform: 'none',
                      ...(tier.buttonVariant === 'contained' && {
                        boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                          bgcolor: theme.palette.primary.dark,
                          boxShadow: `0 12px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                        }
                      })
                    }}
                  >
                    {tier.buttonText}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingContent />
    </Suspense>
  );
}
