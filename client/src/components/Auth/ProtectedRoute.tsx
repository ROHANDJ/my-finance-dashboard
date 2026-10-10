import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, Skeleton } from '@mui/material';
import { PageSkeleton } from '../Skeletons/Skeletons';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Mirrors Layout (sidebar + top bar + page) while the session is restored,
// so the app doesn't flash a spinner and then jump.
const AppShellSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
    <Box sx={{
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      gap: 1,
      width: 264,
      flexShrink: 0,
      p: 2.5,
      borderRight: '1px solid rgba(99, 102, 241, 0.12)',
      background: 'var(--fh-sidebar)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Skeleton variant="rounded" width={36} height={36} />
        <Skeleton variant="text" sx={{ fontSize: '1rem', width: 110 }} />
      </Box>
      {Array.from({ length: 11 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={34} sx={{ mb: 0.5, opacity: 1 - i * 0.06 }} />
      ))}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{
        height: 60, px: { xs: 2, md: 3 },
        display: 'flex', alignItems: 'center', gap: 2,
        borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
      }}>
        <Skeleton variant="text" sx={{ fontSize: '1rem', width: 120 }} />
        <Box sx={{ flex: 1 }} />
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <PageSkeleton />
      </Box>
    </Box>
  </Box>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AppShellSkeleton />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
