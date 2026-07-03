"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from '../theme';

interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check local storage or system preference
    const savedMode = localStorage.getItem('themeMode') as 'light' | 'dark';
    if (savedMode) {
      setMode(savedMode);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((currentMode) => {
      const nextMode = currentMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', nextMode);
      document.documentElement.dataset.theme = nextMode;
      document.documentElement.style.colorScheme = nextMode;
      return nextMode;
    });
  }, []);

  const theme = React.useMemo(() => getTheme(mode), [mode]);
  const contextValue = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
