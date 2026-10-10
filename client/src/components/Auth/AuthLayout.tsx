import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ShowChart, LightMode, DarkMode } from '@mui/icons-material';
import { useColorMode } from '../../contexts/ColorModeContext';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  /** Max width of the form card; wider forms (e.g. register) need more room. */
  formMaxWidth?: number;
  children: React.ReactNode;
}

const FEATURES = [
  { label: 'Portfolio Tracking', color: 'var(--fh-indigo)' },
  { label: 'Mutual Funds',       color: 'var(--fh-info)' },
  { label: 'Expense Manager',    color: 'var(--fh-up)' },
  { label: 'AI Chatbot',         color: '#8b5cf6' },
];

const Logo: React.FC<{ size: number }> = ({ size }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Box sx={{
      width: size, height: size, borderRadius: size > 40 ? '12px' : '10px',
      background: 'linear-gradient(135deg, #6366f1 0%, var(--fh-info) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 24px rgba(99,102,241,0.5)',
    }}>
      <ShowChart sx={{ color: '#fff', fontSize: size > 40 ? '1.3rem' : '1rem' }} />
    </Box>
    <Typography sx={{
      fontWeight: 800, fontSize: size > 40 ? '1.3rem' : '1rem',
      background: 'linear-gradient(135deg, var(--fh-indigo), var(--fh-info))',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    }}>
      FinanceHub
    </Typography>
  </Box>
);

const ColorModeToggle: React.FC = () => {
  const { mode, toggle } = useColorMode();
  const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <Tooltip title={label}>
      <IconButton
        onClick={toggle}
        aria-label={label}
        sx={{
          position: 'absolute', top: 16, right: 16, zIndex: 2,
          color: 'var(--fh-text-3)',
          background: 'var(--fh-surface)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          '&:hover': { color: '#6366f1', background: 'rgba(99,102,241,0.1)' },
        }}
      >
        {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, formMaxWidth = 420, children }) => (
  <Box
    sx={{
      // App wraps routes in a flex row, so claim the full width explicitly.
      flex: 1,
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--fh-bg)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <ColorModeToggle />

    {/* Decorative blobs */}
    <Box sx={{
      position: 'absolute', top: '-20%', left: '-10%',
      width: 600, height: 600,
      background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />
    <Box sx={{
      position: 'absolute', bottom: '-20%', right: '-10%',
      width: 700, height: 700,
      background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />

    {/* Left panel — branding */}
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        px: { md: 6, lg: 10 },
        position: 'relative',
        borderRight: '1px solid rgba(99, 102, 241, 0.08)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 520 }}>
        <Box sx={{ mb: 6 }}><Logo size={44} /></Box>

        <Typography variant="h2" sx={{ fontWeight: 800, color: 'var(--fh-text)', mb: 2, lineHeight: 1.15 }}>
          Your money,<br />
          <Box component="span" sx={{
            background: 'linear-gradient(135deg, #6366f1, var(--fh-info))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            under control.
          </Box>
        </Typography>
        <Typography sx={{ color: 'var(--fh-muted)', fontSize: '1rem', maxWidth: 420, lineHeight: 1.7 }}>
          Track your portfolio, manage expenses, monitor mutual funds, and get AI-powered insights — all in one place.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 5, flexWrap: 'wrap' }}>
          {FEATURES.map(f => (
            <Box key={f.label} sx={{
              px: 1.5, py: 0.6,
              borderRadius: '8px',
              background: `color-mix(in srgb, ${f.color} 9%, transparent)`,
              border: `1px solid color-mix(in srgb, ${f.color} 20%, transparent)`,
              color: f.color,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              {f.label}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>

    {/* Right panel — form */}
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 6 },
        py: 6,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: formMaxWidth,
          background: 'var(--fh-surface)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '20px',
          p: { xs: 3, md: 4 },
          boxShadow: '0 24px 64px var(--fh-shadow)',
        }}
      >
        <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 3 }}><Logo size={36} /></Box>

        <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--fh-text)', mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'var(--fh-muted)', fontSize: '0.85rem', mb: 3 }}>
          {subtitle}
        </Typography>

        {children}
      </Box>
    </Box>
  </Box>
);

export const authLinkSx = {
  color: '#6366f1',
  fontWeight: 600,
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
};

export const AuthAlert: React.FC<{ severity: 'error' | 'success'; children: React.ReactNode }> = ({ severity, children }) => {
  const color = severity === 'error' ? '244, 63, 94' : '16, 185, 129';
  return (
    <Box sx={{
      mb: 2.5, p: 1.5, borderRadius: '10px',
      background: `rgba(${color}, 0.1)`,
      border: `1px solid rgba(${color}, 0.3)`,
    }}>
      <Typography sx={{ color: `rgb(${color})`, fontSize: '0.82rem' }}>{children}</Typography>
    </Box>
  );
};

export default AuthLayout;
