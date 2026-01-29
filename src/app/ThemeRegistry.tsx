"use client";
import * as React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import theme from '../theme';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

function createEmotionCache() {
  return createCache({ key: 'mui', prepend: true });
}


export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const cache = React.useMemo(() => createEmotionCache(), []);
  return (
    <CacheProvider value={cache}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
          <CssBaseline />
          {children}
      </LocalizationProvider>
    </CacheProvider>
  );
}
