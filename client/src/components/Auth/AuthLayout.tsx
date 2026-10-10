import React from 'react';
import { Box, Typography } from '@mui/material';
import { ShowChart } from '@mui/icons-material';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  /** Max width of the form card; wider forms (e.g. register) need more room. */
  formMaxWidth?: number;
  children: React.ReactNode;
}

const FEATURES = [
  { label: 'Portfolio Tracking', color: '#6366f1' },
  { label: 'Mutual Funds',       color: '#06b6d4' },
  { label: 'Expense Manager',    color: '#10b981' },
  { label: 'AI Chatbot',         color: '#8b5cf6' },
];

const Logo: React.FC<{ size: number }> = ({ size }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Box sx={{
      width: size, height: size, borderRadius: size > 40 ? '12px' : '10px',
      background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 24px rgba(99,102,241,0.5)',
    }}>
      <ShowChart sx={{ color: '#fff', fontSize: size > 40 ? '1.3rem' : '1rem' }} />
    </Box>
    <Typography sx={{
      fontWeight: 800, fontSize: size > 40 ? '1.3rem' : '1rem',
      background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    }}>
      FinanceHub
    </Typography>
  </Box>
);

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, formMaxWidth = 420, children }) => (
  <Box
    sx={{
      // App wraps routes in a flex row, so claim the full width explicitly.
      flex: 1,
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      background: '#060818',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
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
        px: { md: 6, lg: 10 },
        position: 'relative',
        borderRight: '1px solid rgba(99, 102, 241, 0.08)',
      }}
    >
      <Box sx={{ maxWidth: 520 }}>
        <Box sx={{ mb: 6 }}><Logo size={44} /></Box>

        <Typography variant="h2" sx={{ fontWeight: 800, color: '#e2e8f0', mb: 2, lineHeight: 1.15 }}>
          Your money,<br />
          <Box component="span" sx={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            under control.
          </Box>
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '1rem', maxWidth: 420, lineHeight: 1.7 }}>
          Track your portfolio, manage expenses, monitor mutual funds, and get AI-powered insights — all in one place.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 5, flexWrap: 'wrap' }}>
          {FEATURES.map(f => (
            <Box key={f.label} sx={{
              px: 1.5, py: 0.6,
              borderRadius: '8px',
              background: `${f.color}18`,
              border: `1px solid ${f.color}33`,
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
        flex: { xs: 1, md: '0 0 auto' },
        width: { md: formMaxWidth + 96 },
        maxWidth: '100%',
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
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '20px',
          p: { xs: 3, md: 4 },
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 3 }}><Logo size={36} /></Box>

        <Typography variant="h5" sx={{ fontWeight: 700, color: '#e2e8f0', mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 3 }}>
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
