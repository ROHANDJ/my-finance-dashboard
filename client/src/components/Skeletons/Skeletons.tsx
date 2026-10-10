import React from 'react';
import { Box, Card, CardContent, Grid, Skeleton } from '@mui/material';

/*
 * Shared skeleton loaders. Each one mirrors the shape of the real content it
 * stands in for, so the page doesn't jump when data arrives.
 * Colour + wave animation come from the MuiSkeleton theme override in App.tsx.
 */

export const PageHeaderSkeleton: React.FC<{ withAction?: boolean }> = ({ withAction = true }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2 }}>
    <Box sx={{ flex: 1, maxWidth: 360 }}>
      <Skeleton variant="text" sx={{ fontSize: '2rem', width: '60%' }} />
      <Skeleton variant="text" sx={{ fontSize: '0.85rem', width: '85%' }} />
    </Box>
    {withAction && <Skeleton variant="rounded" width={120} height={38} />}
  </Box>
);

export const StatCardSkeleton: React.FC = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Skeleton variant="rounded" width={36} height={36} />
        <Skeleton variant="text" sx={{ fontSize: '0.9rem', flex: 1 }} />
      </Box>
      <Skeleton variant="text" sx={{ fontSize: '1.8rem', width: '70%' }} />
      <Skeleton variant="text" sx={{ fontSize: '0.8rem', width: '45%' }} />
    </CardContent>
  </Card>
);

/** Row of stat cards; collapses 1 → 2 → N columns across breakpoints. */
export const StatCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
    {Array.from({ length: count }).map((_, i) => (
      <Grid item xs={12} sm={6} lg={12 / Math.min(count, 4)} key={i}>
        <StatCardSkeleton />
      </Grid>
    ))}
  </Grid>
);

export const ChartSkeleton: React.FC<{ height?: number; title?: boolean }> = ({ height = 300, title = true }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      {title && <Skeleton variant="text" sx={{ fontSize: '1.1rem', width: 180, mb: 2 }} />}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 0.75, sm: 1.5 }, height }}>
        {[45, 70, 55, 85, 60, 95, 75, 65, 88, 50, 72, 80].map((h, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            sx={{ flex: 1, height: `${h}%`, display: { xs: i > 7 ? 'none' : 'block', sm: 'block' } }}
          />
        ))}
      </Box>
    </CardContent>
  </Card>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; title?: boolean }> = ({
  rows = 6,
  columns = 5,
  title = true,
}) => (
  <Card>
    <CardContent>
      {title && <Skeleton variant="text" sx={{ fontSize: '1.1rem', width: 200, mb: 2 }} />}
      <Box sx={{ display: 'flex', gap: 2, pb: 1.5, mb: 1, borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} variant="text" sx={{ flex: c === 0 ? 2 : 1, fontSize: '0.75rem', display: { xs: c > 2 ? 'none' : 'block', md: 'block' } }} />
        ))}
      </Box>
      {Array.from({ length: rows }).map((_, r) => (
        <Box key={r} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.25 }}>
          {Array.from({ length: columns }).map((_, c) => (
            <Box key={c} sx={{ flex: c === 0 ? 2 : 1, display: { xs: c > 2 ? 'none' : 'block', md: 'block' } }}>
              <Skeleton variant="text" sx={{ fontSize: '0.9rem', width: c === 0 ? '80%' : '60%' }} />
              {c === 0 && <Skeleton variant="text" sx={{ fontSize: '0.7rem', width: '45%' }} />}
            </Box>
          ))}
        </Box>
      ))}
    </CardContent>
  </Card>
);

/** Vertical list of items (e.g. IPOs, transactions, indices). */
export const ListSkeleton: React.FC<{ rows?: number; title?: boolean; avatar?: boolean }> = ({
  rows = 4,
  title = true,
  avatar = false,
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      {title && <Skeleton variant="text" sx={{ fontSize: '1.1rem', width: 160, mb: 2 }} />}
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25 }}>
          {avatar && <Skeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0 }} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" sx={{ fontSize: '0.9rem', width: '65%' }} />
            <Skeleton variant="text" sx={{ fontSize: '0.75rem', width: '40%' }} />
          </Box>
          <Skeleton variant="text" sx={{ fontSize: '0.9rem', width: 64 }} />
        </Box>
      ))}
    </CardContent>
  </Card>
);

/** Grid of content cards (e.g. mutual funds, credit cards, stock tiles). */
export const CardGridSkeleton: React.FC<{ count?: number; height?: number }> = ({ count = 6, height = 160 }) => (
  <Grid container spacing={{ xs: 2, md: 3 }}>
    {Array.from({ length: count }).map((_, i) => (
      <Grid item xs={12} sm={6} lg={4} key={i}>
        <Card>
          <CardContent sx={{ height }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Skeleton variant="text" sx={{ fontSize: '1rem', width: '55%' }} />
              <Skeleton variant="rounded" width={64} height={22} />
            </Box>
            <Skeleton variant="text" sx={{ fontSize: '1.6rem', width: '45%' }} />
            <Skeleton variant="text" sx={{ fontSize: '0.8rem', width: '70%' }} />
            <Skeleton variant="text" sx={{ fontSize: '0.8rem', width: '35%' }} />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

/** Generic full-page placeholder: header, stat cards, chart + list, table. */
export const PageSkeleton: React.FC<{ stats?: number }> = ({ stats = 4 }) => (
  <Box>
    <PageHeaderSkeleton />
    {stats > 0 && <StatCardsSkeleton count={stats} />}
    <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
      <Grid item xs={12} lg={8}><ChartSkeleton /></Grid>
      <Grid item xs={12} lg={4}><ListSkeleton rows={5} /></Grid>
    </Grid>
    <TableSkeleton />
  </Box>
);
