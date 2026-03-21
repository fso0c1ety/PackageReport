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
    borderRadius: 12,
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
        root: ({ theme }: { theme: any }) => ({
          backgroundImage: 'none',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', // For Safari support
          borderRadius: 16,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'dark' ? '0 40px 100px rgba(0,0,0,0.8)' : '0 40px 100px rgba(0,0,0,0.1)',
        }),
      },
    },
    MuiCssBaseline: {
      styleOverrides: (themeParam: any) => `
        body {
          background-image: ${
            themeParam.palette.mode === 'dark'
              ? 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0)'
              : 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0)'
          };
          background-size: 24px 24px;
        }

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
      default: '#F8FAFC', // Slate 50 (Slightly cooler backboard)
      paper: 'rgba(255, 255, 255, 0.85)', // Glassy white
    },
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#64748B', // Slate 500
    },
    divider: 'rgba(0, 0, 0, 0.06)', // Subtle dark line
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366F1', // Indigo 500
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10B981', // Emerald 500
      contrastText: '#ffffff',
    },
    background: {
      default: '#0A0B10', // Deep obsidian background
      paper: 'rgba(18, 18, 30, 0.6)', // Glassy deep blue/black
    },
    text: {
      primary: '#F8FAFC', // Slate 50
      secondary: '#94A3B8', // Slate 400
    },
    divider: 'rgba(255, 255, 255, 0.05)', // Subtle white line
  },
});

export const getTheme = (mode: 'light' | 'dark') => (mode === 'light' ? lightTheme : darkTheme);
const defaultTheme = lightTheme; 
export default defaultTheme; // Fallback export

