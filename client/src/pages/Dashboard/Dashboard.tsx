import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  Rocket,
  Refresh,
  Add,
  UploadFile,
  ErrorOutline,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import IndexChartDialog, { ChartableIndex } from '../../components/IndexChart/IndexChartDialog';
import {
  StatCardsSkeleton,
  ChartSkeleton,
  ListSkeleton,
} from '../../components/Skeletons/Skeletons';

interface MarketIndex {
  symbol: string;
  name: string;
  short?: string;
  price: number;
  change: number;
  changePercent: number;
  marketState?: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalReturns: number;
  totalReturnsPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
  holdingsCount: number;
}

interface IPOData {
  symbol: string;
  companyName: string;
  status: string;
  timeline?: { openDate?: string; closeDate?: string; listingDate?: string };
  offering?: { priceRange?: { min: number; max: number }; finalPrice?: number };
}

type SectionStatus = 'loading' | 'ready' | 'error';

// Indices quoted in rupees; commodities (USD) and FX are shown as plain numbers.

const formatCurrency = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatIndexPrice = (idx: MarketIndex) => {
  const num = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(idx.price || 0);
  // Indices are quoted in points, not rupees, so no currency symbol.
  return num;
};

const rowSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 1.5,
  px: 1.5,
  py: 1.25,
  borderRadius: 2,
  backgroundColor: 'var(--fh-surface-2)',
  border: '1px solid rgba(148,163,184,0.08)',
  transition: 'background-color 0.2s, border-color 0.2s',
  '&:hover': { backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' },
} as const;

const SectionMessage: React.FC<{ error?: boolean; text: string; onRetry?: () => void }> = ({ error, text, onRetry }) => (
  <Box sx={{ py: 4, textAlign: 'center', color: 'var(--fh-muted)' }}>
    {error && <ErrorOutline sx={{ color: 'error.main', mb: 1 }} />}
    <Typography variant="body2" sx={{ color: 'var(--fh-text-3)' }}>{text}</Typography>
    {onRetry && (
      <Button size="small" onClick={onRetry} sx={{ mt: 1 }} startIcon={<Refresh fontSize="small" />}>
        Retry
      </Button>
    )}
  </Box>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [indicesStatus, setIndicesStatus] = useState<SectionStatus>('loading');
  const [portfolioStatus, setPortfolioStatus] = useState<SectionStatus>('loading');
  const [ipoStatus, setIpoStatus] = useState<SectionStatus>('loading');
  const [marketData, setMarketData] = useState<MarketIndex[]>([]);
  const [chartIndex, setChartIndex] = useState<ChartableIndex | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [upcomingIPOs, setUpcomingIPOs] = useState<IPOData[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchIndices = useCallback(async () => {
    setIndicesStatus('loading');
    try {
      const res = await axios.get('/api/market/indices');
      setMarketData(res.data.indices || []);
      setIndicesStatus('ready');
    } catch (error) {
      console.error('Error fetching indices:', error);
      setIndicesStatus('error');
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setIndicesStatus('loading');
    setPortfolioStatus('loading');
    setIpoStatus('loading');

    const [marketResult, portfolioResult, ipoResult] = await Promise.allSettled([
      axios.get('/api/market/indices'),
      axios.get('/api/portfolio'),
      axios.get('/api/ipo/calendar/upcoming?limit=5'),
    ]);

    if (marketResult.status === 'fulfilled') {
      setMarketData(marketResult.value.data.indices || []);
      setIndicesStatus('ready');
    } else {
      console.error('Error fetching indices:', marketResult.reason);
      setIndicesStatus('error');
    }

    if (portfolioResult.status === 'fulfilled') {
      const portfolios = portfolioResult.value.data.portfolios || [];
      if (portfolios.length > 0) {
        const p = portfolios[0];
        setPortfolioSummary({
          totalValue: p.performance.currentValue,
          totalReturns: p.performance.totalReturns,
          totalReturnsPercentage: p.performance.totalReturnsPercentage,
          dayChange: p.performance.dayChange,
          dayChangePercentage: p.performance.dayChangePercentage,
          holdingsCount: (p.holdings || []).length,
        });
        // Build chart from real portfolio snapshot (invested vs current)
        setChartData([
          { date: 'Invested', value: p.performance.totalInvested },
          { date: 'Current', value: p.performance.currentValue },
        ]);
      } else {
        setPortfolioSummary(null);
        setChartData([]);
      }
      setPortfolioStatus('ready');
    } else {
      console.error('Error fetching portfolio:', portfolioResult.reason);
      setPortfolioStatus('error');
    }

    if (ipoResult.status === 'fulfilled') {
      setUpcomingIPOs(ipoResult.value.data.ipos || []);
      setIpoStatus('ready');
    } else {
      console.error('Error fetching IPOs:', ipoResult.reason);
      setIpoStatus('error');
    }

    if ([marketResult, portfolioResult, ipoResult].every((r) => r.status === 'rejected')) {
      toast.error('Failed to load dashboard data');
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const anyLoading = indicesStatus === 'loading' || portfolioStatus === 'loading' || ipoStatus === 'loading';

  const quickActions = [
    { label: 'Browse Stocks', icon: <TrendingUp fontSize="large" />, to: '/stocks' },
    { label: 'Portfolio', icon: <AccountBalance fontSize="large" />, to: '/portfolio' },
    { label: 'Mutual Funds', icon: <ShowChart fontSize="large" />, to: '/mutual-funds' },
    { label: 'Trading', icon: <Rocket fontSize="large" />, to: '/trading' },
  ];

  const statCards = portfolioSummary && (
    <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
      <Grid item xs={12} sm={6} lg={3}>
        <Card className="portfolio-summary-card" sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <AccountBalance sx={{ color: 'var(--fh-indigo-soft)' }} />
              <Typography variant="subtitle1" sx={{ color: 'var(--fh-indigo-soft)', fontWeight: 600 }}>
                Portfolio Value
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', wordBreak: 'break-word' }}>
              {formatCurrency(portfolioSummary.totalValue)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} lg={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              {portfolioSummary.totalReturns >= 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
              <Typography variant="subtitle1" color="text.secondary" fontWeight={600}>
                Total Returns
              </Typography>
            </Box>
            <Typography
              variant="h5"
              fontWeight={700}
              color={portfolioSummary.totalReturns >= 0 ? 'success.main' : 'error.main'}
            >
              {portfolioSummary.totalReturns >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(portfolioSummary.totalReturns))}
            </Typography>
            <Typography
              variant="body2"
              color={portfolioSummary.totalReturnsPercentage >= 0 ? 'success.main' : 'error.main'}
            >
              {portfolioSummary.totalReturnsPercentage >= 0 ? '+' : ''}
              {portfolioSummary.totalReturnsPercentage.toFixed(2)}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} lg={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <ShowChart color="info" />
              <Typography variant="subtitle1" color="text.secondary" fontWeight={600}>
                Day Change
              </Typography>
            </Box>
            <Typography
              variant="h5"
              fontWeight={700}
              color={portfolioSummary.dayChange >= 0 ? 'success.main' : 'error.main'}
            >
              {portfolioSummary.dayChange >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(portfolioSummary.dayChange))}
            </Typography>
            <Typography
              variant="body2"
              color={portfolioSummary.dayChangePercentage >= 0 ? 'success.main' : 'error.main'}
            >
              {portfolioSummary.dayChangePercentage >= 0 ? '+' : ''}
              {portfolioSummary.dayChangePercentage.toFixed(2)}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} lg={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <AccountBalance color="warning" />
              <Typography variant="subtitle1" color="text.secondary" fontWeight={600}>
                Holdings
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {portfolioSummary.holdingsCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active positions
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPerformance = () => {
    if (portfolioStatus === 'loading') return <ChartSkeleton height={260} />;
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Portfolio Performance
          </Typography>
          {portfolioStatus === 'error' ? (
            <SectionMessage error text="Couldn't load your portfolio." onRetry={fetchDashboardData} />
          ) : chartData.length === 0 ? (
            <Box
              sx={{
                minHeight: { xs: 220, md: 280 },
                py: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: 1.5,
                px: 2,
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.05) 100%)',
                border: '1px solid rgba(99,102,241,0.15)',
              }}
            >
              <ShowChart sx={{ fontSize: 44, color: 'var(--fh-indigo)' }} />
              <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'var(--fh-text)' }}>
                No portfolio yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--fh-text-3)', maxWidth: 380 }}>
                Add holdings or import your CAS statement to start tracking performance here.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/portfolio')}>
                  Create portfolio
                </Button>
                <Button variant="outlined" startIcon={<UploadFile />} onClick={() => navigate('/cas-upload')}>
                  Import CAS
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ height: { xs: 220, sm: 260, md: 300 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="date" stroke="var(--fh-muted)" tick={{ fill: 'var(--fh-text-3)', fontSize: 12 }} />
                  <YAxis
                    stroke="var(--fh-muted)"
                    tick={{ fill: 'var(--fh-text-3)', fontSize: 12 }}
                    width={70}
                    tickFormatter={(v: number) => new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}
                  />
                  <RechartsTooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ background: 'var(--fh-paper-solid)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: 'var(--fh-text)' }}
                    labelStyle={{ color: 'var(--fh-text-3)' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderIndices = () => {
    if (indicesStatus === 'loading') return <ListSkeleton rows={5} />;
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              Market Indices
            </Typography>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchIndices}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {indicesStatus === 'error' ? (
            <SectionMessage error text="Market data unavailable right now." onRetry={fetchIndices} />
          ) : marketData.length === 0 ? (
            <SectionMessage text="No index data available." />
          ) : (
            <Box display="flex" flexDirection="column" gap={1}>
              {marketData.slice(0, 7).map((index) => {
                const up = index.changePercent >= 0;
                return (
                  <Box
                    key={index.symbol}
                    sx={{ ...rowSx, cursor: 'pointer', '&:hover': { borderColor: 'rgba(99,102,241,0.45)', background: 'rgba(99,102,241,0.08)' } }}
                    onClick={() => setChartIndex({ symbol: index.symbol, name: index.name })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChartIndex({ symbol: index.symbol, name: index.name }); } }}
                    title="View chart">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ color: 'var(--fh-text-3)', fontWeight: 500 }}>
                        {index.name}
                      </Typography>
                      <Typography variant="subtitle1" noWrap fontWeight={700} sx={{ color: 'var(--fh-text)' }}>
                        {index.price ? formatIndexPrice(index) : '—'}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
                      {up ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
                      <Typography variant="body2" fontWeight={600} color={up ? 'success.main' : 'error.main'}>
                        {up ? '+' : ''}
                        {(index.changePercent || 0).toFixed(2)}%
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderIPOs = () => {
    if (ipoStatus === 'loading') return <ListSkeleton rows={3} />;
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              Upcoming IPOs
            </Typography>
            <Tooltip title="View all IPOs">
              <IconButton onClick={() => navigate('/ipo')} color="primary">
                <Rocket />
              </IconButton>
            </Tooltip>
          </Box>
          {ipoStatus === 'error' ? (
            <SectionMessage error text="Couldn't load IPOs." onRetry={fetchDashboardData} />
          ) : upcomingIPOs.length === 0 ? (
            <SectionMessage text="No upcoming IPOs right now." />
          ) : (
            <Box display="flex" flexDirection="column" gap={1.25}>
              {upcomingIPOs.slice(0, 3).map((ipo) => (
                <Box key={ipo.symbol} sx={{ ...rowSx, py: 1.5 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={600} noWrap sx={{ color: 'var(--fh-text)' }}>
                      {ipo.companyName}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ color: 'var(--fh-text-3)' }}>
                      {ipo.symbol}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Chip label={ipo.status} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                    <Typography variant="body2" mt={0.75} sx={{ color: 'var(--fh-text-2)', fontWeight: 500 }}>
                      {ipo.offering?.priceRange
                        ? `₹${ipo.offering.priceRange.min} - ₹${ipo.offering.priceRange.max}`
                        : ipo.offering?.finalPrice
                        ? `₹${ipo.offering.finalPrice}`
                        : 'TBA'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
            Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)' }}>
            Your portfolio, markets and upcoming IPOs at a glance
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={fetchDashboardData} color="primary" disabled={anyLoading}>
              <Refresh />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {portfolioStatus === 'loading' ? <StatCardsSkeleton count={4} /> : statCards}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} lg={8}>
          {renderPerformance()}
        </Grid>

        <Grid item xs={12} lg={4}>
          {renderIndices()}
        </Grid>

        <Grid item xs={12} md={6}>
          {renderIPOs()}
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Quick Actions
              </Typography>
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {quickActions.map((a) => (
                  <Grid item xs={6} key={a.to}>
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(a.to)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigate(a.to);
                      }}
                      sx={{
                        cursor: 'pointer',
                        textAlign: 'center',
                        py: { xs: 2, sm: 2.5 },
                        px: 1,
                        borderRadius: 3,
                        color: 'var(--fh-indigo-soft)',
                        backgroundColor: 'rgba(99,102,241,0.06)',
                        border: '1px solid rgba(99,102,241,0.15)',
                        transition: 'all 0.2s',
                        '&:hover, &:focus-visible': {
                          backgroundColor: 'rgba(99,102,241,0.16)',
                          borderColor: 'rgba(99,102,241,0.4)',
                          color: 'var(--fh-text)',
                          outline: 'none',
                        },
                      }}
                    >
                      {a.icon}
                      <Typography variant="body2" mt={1} fontWeight={500} sx={{ color: 'var(--fh-text)' }}>
                        {a.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <IndexChartDialog
        open={!!chartIndex}
        onClose={() => setChartIndex(null)}
        index={chartIndex}
        indices={marketData.map(m => ({ symbol: m.symbol, name: m.name }))}
      />
    </Box>
  );
};

export default Dashboard;
