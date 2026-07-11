import { createTheme, ThemeOptions } from '@mui/material/styles';

const baseTheme: any = {
  typography: {
    fontFamily: 'var(--font-geist-sans), "Inter", "Plus Jakarta Sans", "Segoe UI", sans-serif',
    h1: { fontSize: 'clamp(2.35rem, 5vw, 4.75rem)', fontWeight: 800, letterSpacing: '-0.045em' },
    h2: { fontSize: 'clamp(1.85rem, 3vw, 3rem)', fontWeight: 800, letterSpacing: '-0.035em' },
    h3: { fontSize: '1.5rem', fontWeight: 750, letterSpacing: '-0.025em' },
    h4: { fontSize: '1.25rem', fontWeight: 750 },
    h5: { fontSize: '1rem', fontWeight: 600 }, // 16px
    h6: { fontSize: '0.875rem', fontWeight: 600 }, // 14px
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 10,
          paddingInline: 20,
          transition: 'background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none', transform: 'translateY(-1px)' },
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
          borderRadius: 14,
          border: '1px solid var(--app-paper-divider)',
          boxShadow: 'var(--app-paper-shadow)',
        },
      },
    },
    MuiCard: { styleOverrides: { root: { backgroundImage: 'none', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(15,23,42,.04)' } } },
    MuiTextField: { defaultProps: { variant: 'outlined' } },
    MuiOutlinedInput: { styleOverrides: { root: { minHeight: 48, borderRadius: 10, backgroundColor: '#FFFFFF', '& fieldset': { borderColor: '#CBD5E1' }, '&:hover fieldset': { borderColor: '#94A3B8' }, '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: 2 }, '&.Mui-error fieldset': { borderColor: '#DC2626' } } } },
    MuiInputLabel: { styleOverrides: { root: { fontWeight: 600, color: '#475569' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 24px 64px rgba(15,23,42,.18)' } } },
    MuiTableCell: { styleOverrides: { head: { backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 700, borderColor: '#E2E8F0' }, body: { borderColor: '#E2E8F0' } } },
    MuiTableRow: { styleOverrides: { root: { transition: 'background-color .15s ease', '&:hover': { backgroundColor: '#F8FAFC' } } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 700 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 10, border: '1px solid currentColor' } } },
    MuiCssBaseline: {
      styleOverrides: (themeParam: any) => `
        body {
          background-image: ${
            themeParam.palette.mode === 'dark'
              ? 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0)'
              : 'none'
          };
          background-size: 24px 24px;
          color: ${themeParam.palette.text.primary};
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
      main: '#2563EB',
      light: '#818CF8',
      dark: '#1D4ED8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4F46E5',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F8FAFC', // Slate 50 (Slightly cooler backboard)
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#64748B', // Slate 500
    },
    divider: '#E2E8F0',
    success: { main: '#16A34A' },
    warning: { main: '#F59E0B' },
    error: { main: '#DC2626' },
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10B981',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0A0B10',
      paper: 'rgba(18, 18, 30, 0.6)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    divider: 'rgba(255, 255, 255, 0.05)',
  },
});

export const getTheme = (mode: 'light' | 'dark') => (mode === 'light' ? lightTheme : darkTheme);
const defaultTheme = lightTheme;
export default defaultTheme; // Fallback export
