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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useRouter, useSearchParams } from 'next/navigation';
import brand from '../../../config/brand.json';
import { authenticatedFetch, getApiUrl } from '../apiUrl';

type BillingCycle = 'monthly' | 'yearly';
type Plan = {
  name: string;
  price?: number;
  type?: 'free';
  custom?: boolean;
  plan: string;
  description: string;
  features: readonly string[];
  buttonText: string;
  buttonVariant: 'contained' | 'outlined';
  featured?: boolean;
  subheader?: string;
};

function calculateFinalPrice(desired: number) {
  if (desired === 0) return 0;
  return Number(((desired + 0.25) / (1 - 0.015)).toFixed(2));
}

const plans: Plan[] = [
  {
    name: 'Free',
    price: 0,
    type: 'free',
    plan: 'trial',
    description: 'Great for testing Smart Manage quickly.',
    features: [
      '2 seats',
      '1 workspace',
      '3 boards',
      '250 MB storage',
      '7-day full trial',
    ],
    buttonText: 'Start for Free',
    buttonVariant: 'outlined',
  },
  {
    name: 'Basic',
    price: 40,
    plan: 'basic',
    description: 'For growing teams that need reliable operations.',
    features: [
      'Up to 5 seats',
      '3 workspaces',
      '15 boards',
      '100 Nexus Brain credits/month',
      '100 automation actions/month',
      '5 GB storage',
      '1 portal',
    ],
    buttonText: 'Get Started',
    buttonVariant: 'contained',
  },
  {
    name: 'Standard',
    subheader: 'Most Popular',
    price: 75,
    plan: 'standard',
    description: 'Best value for multi-team collaboration.',
    features: [
      'Up to 10 seats',
      '10 workspaces',
      '50 boards',
      '500 Nexus Brain credits/month',
      '1,000 automation actions/month',
      '25 GB storage',
      '3 portals',
    ],
    buttonText: 'Choose Standard',
    buttonVariant: 'contained',
    featured: true,
  },
  {
    name: 'Pro',
    price: 180,
    plan: 'pro',
    description: 'Advanced scale, control and analytics.',
    features: [
      'Up to 20 seats',
      '25 workspaces',
      'Unlimited boards',
      '2,000 Nexus Brain credits/month',
      '10,000 automation actions/month',
      '100 GB storage',
      'Advanced permissions',
      'Up to 10 portals',
    ],
    buttonText: 'Choose Pro',
    buttonVariant: 'outlined',
  },
  {
    name: 'Enterprise',
    custom: true,
    plan: 'enterprise',
    description: 'Custom limits, security and onboarding.',
    features: ['Custom seats', 'Custom workspaces', 'Custom AI/automation capacity', 'Enterprise security', 'Dedicated support'],
    buttonText: 'Contact Sales',
    buttonVariant: 'outlined',
  },
] as const;

function getPlanPricing(plan: Plan, billing: BillingCycle) {
  if (plan.custom) {
    return { label: 'Custom', suffix: '', billed: '' };
  }

  const price = plan.price || 0;
  if (price === 0) {
    return { label: '€0', suffix: '', billed: '' };
  }

  if (billing === 'yearly') {
    const yearlyBase = price * 12 * 0.9;
    return {
      label: `€${yearlyBase.toFixed(0)}`,
      suffix: '/year',
      billed: `billed €${calculateFinalPrice(yearlyBase).toFixed(2)}`,
    };
  }

  return {
    label: `€${price}`,
    suffix: '/mo',
    billed: `billed €${calculateFinalPrice(price).toFixed(2)}`,
  };
}

function PricingContent() {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  const goBack = () => {
    const from = searchParams.get('from');
    const authenticated = Boolean(localStorage.getItem('token'));
    if (authenticated && from === 'billing') {
      router.push('/settings/?tab=billing');
      return;
    }
    if (authenticated) {
      router.push('/home/');
      return;
    }
    router.push('/');
  };

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
      window.location.href = `${brand.supportMailto}?subject=Smart%20Manage%20Enterprise%20Plan`;
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
      body: JSON.stringify({ plan, billing }),
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
        <Button onClick={goBack} startIcon={<ArrowBackRoundedIcon />} sx={{ textTransform: 'none', fontWeight: 800, mb: 2 }}>
          Back
        </Button>
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
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 4 }}>
            {(['monthly', 'yearly'] as const).map((option) => (
              <Button
                key={option}
                variant={billing === option ? 'contained' : 'outlined'}
                onClick={() => setBilling(option)}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                {option === 'monthly' ? 'Monthly' : 'Yearly'}
              </Button>
            ))}
          </Stack>
        </Box>

        {/* Pricing Cards */}
        <Grid container spacing={4} alignItems="stretch">
          {plans.map((tier) => {
            const pricing = getPlanPricing(tier, billing);
            return (
              <Grid key={tier.name} size={{ xs: 12, sm: 6, md: 4 }}>
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
                      {tier.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                      {tier.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: pricing.billed ? 1 : 4 }}>
                      <Typography variant="h3" sx={{ fontWeight: 800 }}>
                        {pricing.label}
                      </Typography>
                      <Typography variant="h6" sx={{ color: theme.palette.text.secondary, ml: 1 }}>
                        {pricing.suffix}
                      </Typography>
                    </Box>
                    {pricing.billed && (
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3, fontWeight: 600 }}>
                        {pricing.billed}
                      </Typography>
                    )}
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
                    <Typography variant="body2" sx={{ mt: 2.2, color: theme.palette.text.secondary, fontWeight: 700 }}>
                      See all features in plan details.
                    </Typography>
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
            );
          })}
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
