// src/theme.ts - Custom MUI theme for premium SaaS To-Do app
import { createTheme } from '@mui/material/styles';
import { red, blue, green, orange, grey } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0073ea', // monday.com blue
      contrastText: '#fff',
    },
    secondary: {
      main: '#00c875', // monday.com green
      contrastText: '#fff',
    },
    background: {
      default: '#f6f7fb',
      paper: '#fff',
    },
    text: {
      primary: '#323338',
      secondary: '#676879',
    },
    success: { main: '#00c875' },
    error: { main: '#e2445c' },
    warning: { main: '#ffcb00' },
    info: { main: '#579bfc' },
    divider: '#e0e4ef',
  },
  // shape, typography, and shadows defined above only
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px 0 rgba(32,40,62,0.08)',
          background: '#fff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
          boxShadow: 'none',
          background: '#0073ea',
          color: '#fff',
          '&:hover': {
            background: '#005bb5',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1.5px solid #e0e4ef',
          fontSize: '1rem',
        },
        head: {
          fontWeight: 700,
          background: 'rgba(0,0,0,0.02)',
        },
      },
    },
  },
  // removed duplicate shape, typography, shadows, and invalid spread
});

export default theme;
