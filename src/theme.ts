import { createTheme, ThemeOptions } from '@mui/material/styles';

const baseTheme: any = {
  typography: {
    fontFamily: 'var(--font-outfit), var(--font-geist-sans), "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700 }, // 40px
    h2: { fontSize: '2rem', fontWeight: 600 }, // 32px
    h3: { fontSize: '1.5rem', fontWeight: 600 }, // 24px
    h4: { fontSize: '1.25rem', fontWeight: 600 }, // 20px
    h5: { fontSize: '1rem', fontWeight: 600 }, // 16px
    h6: { fontSize: '0.875rem', fontWeight: 600 }, // 14px
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        /* Scrollbar styles */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.7); }
      `,
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#4F46E5', // Indigo 600
      light: '#818CF8',
      dark: '#4338CA',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10B981', // Emerald 500
      contrastText: '#ffffff',
    },
    background: {
      default: '#F3F4F6', // Gray 100
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827', // Gray 900
      secondary: '#6B7280', // Gray 500
    },
    divider: '#E5E7EB', // Gray 200
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366F1', // Indigo 500 (Brighter for dark mode)
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10B981', // Emerald 500
      contrastText: '#ffffff',
    },
    background: {
      default: '#0F172A', // Slate 900
      paper: '#1E293B',   // Slate 800
    },
    text: {
      primary: '#F9FAFB', // Gray 50
      secondary: '#9CA3AF', // Gray 400
    },
    divider: 'rgba(255, 255, 255, 0.08)', // Subtle white
  },
});

export const getTheme = (mode: 'light' | 'dark') => (mode === 'light' ? lightTheme : darkTheme);
const defaultTheme = lightTheme; 
export default defaultTheme; // Fallback export

