import { createTheme, Theme } from '@mui/material/styles';
import type { ColorMode } from '../contexts/ColorModeContext';

/*
 * MUI theme for each colour mode. Palette values must be real colours (MUI
 * derives hover/disabled shades from them); component overrides use the
 * var(--fh-*) tokens from index.css so they switch with <html data-theme>.
 */
export function buildTheme(mode: ColorMode): Theme {
  const dark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#ffffff' },
      secondary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
      background: dark
        ? { default: '#060818', paper: '#0f172a' }
        : { default: '#f4f6fb', paper: '#ffffff' },
      success: dark ? { main: '#10b981', light: '#34d399' } : { main: '#047857', light: '#10b981' },
      error:   dark ? { main: '#f43f5e', light: '#fb7185' } : { main: '#e11d48', light: '#f43f5e' },
      warning: dark ? { main: '#f59e0b', light: '#fbbf24' } : { main: '#b45309', light: '#f59e0b' },
      info:    dark ? { main: '#06b6d4' } : { main: '#0e7490' },
      text: dark
        ? { primary: '#e2e8f0', secondary: '#94a3b8' }
        : { primary: '#0f172a', secondary: '#475569' },
      divider: dark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.08)',
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: '2rem',   fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontSize: '1.75rem',fontWeight: 700 },
      h4: { fontSize: '1.5rem', fontWeight: 600 },
      h5: { fontSize: '1.25rem',fontWeight: 600 },
      h6: { fontSize: '1rem',   fontWeight: 600 },
      body1: { fontSize: '0.9rem' },
      body2: { fontSize: '0.8rem' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: 'var(--fh-bg-gradient)',
            backgroundAttachment: 'fixed',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: 'var(--fh-surface)',
            backdropFilter: dark ? 'blur(16px)' : 'none',
            border: dark ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: dark
              ? '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
            borderRadius: 16,
            transition: 'all 0.3s ease',
            '&:hover': {
              border: '1px solid rgba(99, 102, 241, 0.4)',
              boxShadow: dark
                ? '0 8px 40px rgba(99, 102, 241, 0.15), 0 4px 24px rgba(0,0,0,0.5)'
                : '0 8px 28px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(15,23,42,0.06)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          // Solid surface so full-screen dialogs on phones never show the page through.
          paper: { backgroundColor: 'var(--fh-dialog)' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            background: 'var(--fh-paper)',
            backgroundImage: 'none',
            border: dark ? '1px solid rgba(99, 102, 241, 0.1)' : '1px solid rgba(15, 23, 42, 0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10,
            fontWeight: 600,
            letterSpacing: '0.01em',
          },
          containedPrimary: {
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: dark ? '0 4px 16px rgba(99, 102, 241, 0.4)' : '0 4px 12px rgba(99, 102, 241, 0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: dark ? '0 6px 24px rgba(99, 102, 241, 0.6)' : '0 6px 18px rgba(99, 102, 241, 0.35)',
            },
          },
          containedSecondary: {
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
          },
          outlined: {
            borderColor: 'rgba(99, 102, 241, 0.4)',
            '&:hover': {
              borderColor: '#6366f1',
              background: 'rgba(99, 102, 241, 0.08)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.75rem',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: dark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(99, 102, 241, 0.5)' },
              '&.Mui-focused fieldset': { borderColor: '#6366f1' },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: dark ? '1px solid rgba(148, 163, 184, 0.08)' : '1px solid rgba(15, 23, 42, 0.06)',
          },
          head: {
            color: 'var(--fh-text-3)',
            fontWeight: 700,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: 'var(--fh-table-head)',
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              background: 'rgba(99, 102, 241, 0.06)',
            },
          },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: {
            backgroundColor: dark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            '&::after': {
              background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.08), transparent)',
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            background: 'rgba(99, 102, 241, 0.15)',
          },
          bar: {
            borderRadius: 4,
            background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            '&.Mui-selected': { color: dark ? '#818cf8' : '#4f46e5' },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            height: 3,
            borderRadius: 2,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: dark ? {} : { background: '#0f172a', color: '#f8fafc' },
        },
      },
    },
  });
}
