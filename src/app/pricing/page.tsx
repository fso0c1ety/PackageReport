"use client";

import React from 'react';
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
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const tiers = [
  {
    title: 'Free',
    price: '0',
    description: 'Perfect for individuals and small projects.',
    features: [
      '1 Table Board',
      'Up to 5 Team Members',
      'Basic Task Management',
      'Mobile App Access',
      'Community Support',
    ],
    buttonText: 'Start for Free',
    buttonVariant: 'outlined',
  },
  {
    title: 'Pro',
    subheader: 'Most Popular',
    price: '19',
    description: 'Everything you need to scale your team.',
    features: [
      'Unlimited Table Boards',
      'Up to 20 Team Members',
      'Advanced Task Views (Kanban, Gantt)',
      'Custom Automations',
      'Priority Email Support',
    ],
    buttonText: 'Get Started',
    buttonVariant: 'contained',
    featured: true,
  },
  {
    title: 'Enterprise',
    price: '49',
    description: 'Advanced features for large organizations.',
    features: [
      'Unlimited Everything',
      'Unlimited Team Members',
      'Advanced Security & Permissions',
      'Dedicated Account Manager',
      'API Access & Custom Integrations',
    ],
    buttonText: 'Contact Sales',
    buttonVariant: 'outlined',
  },
];

export default function PricingPage() {
  const theme = useTheme();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.background.default,
      py: 10,
      px: 2
    }}>
      <Container maxWidth="lg">
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
                      ${tier.price}
                    </Typography>
                    <Typography variant="h6" sx={{ color: theme.palette.text.secondary, ml: 1 }}>
                      /mo
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
