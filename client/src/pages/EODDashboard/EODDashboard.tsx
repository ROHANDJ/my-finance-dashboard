import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Skeleton,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  CreditCard,
  ShoppingCart,
  Insights,
  OpenInNew,
  NotificationsActive,
  PieChart as PieChartIcon,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useQuery } from 'react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  topGainer: { symbol: string; changePercent: number } | null;
  topLoser: { symbol: string; changePercent: number } | null;
  holdingsCount: number;
}

interface ExpenseSummary {
  todayTotal: number;
  monthTotal: number;
  topCategory: string;
  recentTransactions: Array<{
    description: string;
    amount: number;
    category: string;
    date: string;
  }>;
}

interface CreditCardSummary {
  totalDue: number;
  nextDueDate: string;
  utilizationPercent: number;
  cardsCount: number;
}

interface SpendingCategory {
  category: string;
  amount: number;
  color: string;
}

interface PortfolioHourlyPoint {
  time: string;
  value: number;
}

interface EODAlert {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
}

interface Insight {
  id: string;
  icon: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

interface EODSummary {
  portfolio: PortfolioSummary;
  expenses: ExpenseSummary;
  creditCards: CreditCardSummary;
  marketIndices: MarketIndex[];
  alerts: EODAlert[];
  insights: Insight[];
  portfolioTrend: PortfolioHourlyPoint[];
  spendingByCategory: SpendingCategory[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#FF6B35',
  Transport: '#4CAF50',
  Shopping: '#9C27B0',
  Entertainment: '#FF9800',
  Utilities: '#2196F3',
  Health: '#F44336',
  Education: '#00BCD4',
  Other: '#607D8B',
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ─── API helper ───────────────────────────────────────────────────────────────

const fetchEODSummary = async (): Promise<EODSummary> => {
  const { data } = await axios.get('/api/eod/summary');
  return data;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatRowProps {
  label: string;
  value: React.ReactNode;
}
const StatRow: React.FC<StatRowProps> = ({ label, value }) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" py={0.75}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Box>{value}</Box>
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const EODDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const now = new Date();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<EODSummary>(
    'eod-summary',
    fetchEODSummary,
    {
      refetchInterval: REFRESH_INTERVAL_MS,
      onSuccess: () => setLastUpdated(new Date()),
      onError: () => toast.error('Failed to load EOD summary'),
    }
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success('Dashboard refreshed');
  }, [refetch]);

  // Auto-refresh countdown label
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_INTERVAL_MS / 1000 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const portfolio = data?.portfolio;
  const expenses = data?.expenses;
  const creditCards = data?.creditCards;
  const market = data?.marketIndices ?? [];
  const alerts = data?.alerts ?? [];
  const insights = data?.insights ?? [];
  const trend = data?.portfolioTrend ?? [];
  const spendingCats = data?.spendingByCategory ?? [];

  const dayChangePositive = (portfolio?.dayChange ?? 0) >= 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h4" fontWeight={700}>End of Day Summary</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(now)}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {formatTime(lastUpdated)} · Auto-refresh in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
          </Typography>
          <Tooltip title="Refresh now">
            <IconButton onClick={handleRefresh} color="primary" disabled={isFetching}>
              <Refresh sx={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Alert Banners ─────────────────────────────────────────────────────── */}
      {alerts.map((alert, i) => (
        <Alert
          key={i}
          severity={alert.type}
          icon={<NotificationsActive />}
          sx={{ mb: 1 }}
          onClose={() => {/* dismiss */}}
        >
          {alert.message}
        </Alert>
      ))}

      {isLoading ? (
        /* ── Loading Skeletons ─────────────────────────────────────────────────── */
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} lg={3} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : isError ? (
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={handleRefresh}>Retry</Button>
        }>
          Failed to load EOD summary. Please try again.
        </Alert>
      ) : (
        <>
          {/* ── Main Grid ────────────────────────────────────────────────────────── */}
          <Grid container spacing={3} mb={3}>
            {/* Portfolio Summary */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', borderTop: `4px solid ${dayChangePositive ? '#4CAF50' : '#F44336'}` }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <AccountBalance color="primary" />
                    <Typography variant="h6" fontWeight={600}>Portfolio</Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700} mb={0.5}>
                    {formatCurrency(portfolio?.totalValue ?? 0)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                    {dayChangePositive
                      ? <ArrowUpward sx={{ color: '#4CAF50', fontSize: 16 }} />
                      : <ArrowDownward sx={{ color: '#F44336', fontSize: 16 }} />}
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={dayChangePositive ? 'success.main' : 'error.main'}
                    >
                      {dayChangePositive ? '+' : ''}{formatCurrency(portfolio?.dayChange ?? 0)} ({(portfolio?.dayChangePercent ?? 0).toFixed(2)}%)
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />
                  <StatRow
                    label="Holdings"
                    value={<Typography variant="body2" fontWeight={600}>{portfolio?.holdingsCount ?? 0}</Typography>}
                  />
                  {portfolio?.topGainer && (
                    <StatRow
                      label="Top Gainer"
                      value={
                        <Chip
                          label={`${portfolio.topGainer.symbol} +${portfolio.topGainer.changePercent.toFixed(1)}%`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      }
                    />
                  )}
                  {portfolio?.topLoser && (
                    <StatRow
                      label="Top Loser"
                      value={
                        <Chip
                          label={`${portfolio.topLoser.symbol} ${portfolio.topLoser.changePercent.toFixed(1)}%`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Today's Expenses */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', borderTop: '4px solid #FF6B35' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <ShoppingCart sx={{ color: '#FF6B35' }} />
                    <Typography variant="h6" fontWeight={600}>Today's Expenses</Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700} mb={0.5}>
                    {formatCurrency(expenses?.todayTotal ?? 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Month: {formatCurrency(expenses?.monthTotal ?? 0)}
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">TOP CATEGORY</Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mb={1.5}>
                    <Box
                      sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: CATEGORY_COLORS[expenses?.topCategory ?? ''] ?? '#607D8B',
                      }}
                    />
                    <Typography variant="body2" fontWeight={600}>{expenses?.topCategory ?? '—'}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">RECENT</Typography>
                  {(expenses?.recentTransactions ?? []).slice(0, 3).map((tx, i) => (
                    <Box key={i} display="flex" justifyContent="space-between" py={0.4}>
                      <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>{tx.description}</Typography>
                      <Typography variant="caption" fontWeight={600} color="error.main">
                        -{formatCurrency(tx.amount)}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Credit Cards */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', borderTop: '4px solid #9C27B0' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <CreditCard sx={{ color: '#9C27B0' }} />
                    <Typography variant="h6" fontWeight={600}>Credit Cards</Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700} mb={0.5} color="error.main">
                    {formatCurrency(creditCards?.totalDue ?? 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>Total Due</Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <StatRow
                    label="Cards"
                    value={<Typography variant="body2" fontWeight={600}>{creditCards?.cardsCount ?? 0}</Typography>}
                  />
                  <StatRow
                    label="Next Due"
                    value={
                      <Typography variant="body2" fontWeight={600}>
                        {creditCards?.nextDueDate
                          ? new Date(creditCards.nextDueDate).toLocaleDateString('en-IN')
                          : '—'}
                      </Typography>
                    }
                  />
                  <StatRow
                    label="Utilization"
                    value={
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={
                          (creditCards?.utilizationPercent ?? 0) >= 75 ? 'error.main' :
                          (creditCards?.utilizationPercent ?? 0) >= 40 ? 'warning.main' : 'success.main'
                        }
                      >
                        {(creditCards?.utilizationPercent ?? 0).toFixed(1)}%
                      </Typography>
                    }
                  />
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(creditCards?.utilizationPercent ?? 0, 100)}
                    color={
                      (creditCards?.utilizationPercent ?? 0) >= 75 ? 'error' :
                      (creditCards?.utilizationPercent ?? 0) >= 40 ? 'warning' : 'success'
                    }
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Market Overview */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', borderTop: '4px solid #2196F3' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <TrendingUp color="info" />
                    <Typography variant="h6" fontWeight={600}>Market Overview</Typography>
                  </Box>
                  {market.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No market data</Typography>
                  ) : (
                    market.slice(0, 4).map((idx) => {
                      const up = idx.changePercent >= 0;
                      return (
                        <Box
                          key={idx.symbol}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          py={0.75}
                          borderBottom="1px solid"
                          borderColor="divider"
                        >
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{idx.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{idx.symbol}</Typography>
                          </Box>
                          <Box textAlign="right">
                            <Typography variant="body2" fontWeight={700}>
                              {idx.value.toLocaleString('en-IN')}
                            </Typography>
                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.3}>
                              {up
                                ? <TrendingUp sx={{ color: '#4CAF50', fontSize: 14 }} />
                                : <TrendingDown sx={{ color: '#F44336', fontSize: 14 }} />}
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                color={up ? 'success.main' : 'error.main'}
                              >
                                {up ? '+' : ''}{idx.changePercent.toFixed(2)}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Charts Row ───────────────────────────────────────────────────────── */}
          <Grid container spacing={3} mb={3}>
            {/* Portfolio P&L Trend */}
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Portfolio Value Trend — Today
                  </Typography>
                  {trend.length === 0 ? (
                    <Box
                      height={260}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Typography color="text.secondary">No trend data available</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                        />
                        <RechartsTooltip
                          formatter={(v: number) => [formatCurrency(v), 'Portfolio Value']}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={dayChangePositive ? '#4CAF50' : '#F44336'}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Spending Donut */}
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <PieChartIcon color="secondary" />
                    <Typography variant="h6" fontWeight={600}>Today's Spending</Typography>
                  </Box>
                  {spendingCats.length === 0 ? (
                    <Box
                      height={260}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Typography color="text.secondary">No expenses today</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={spendingCats}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                        >
                          {spendingCats.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.color || CATEGORY_COLORS[entry.category] || '#607D8B'}
                            />
                          ))}
                        </Pie>
                        <Legend />
                        <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Insights + Quick Actions ──────────────────────────────────────── */}
          <Grid container spacing={3}>
            {/* Insights */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Insights color="primary" />
                    <Typography variant="h6" fontWeight={600}>AI Insights</Typography>
                  </Box>
                  {insights.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No insights available for today.
                    </Typography>
                  ) : (
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {insights.map((insight) => (
                        <Chip
                          key={insight.id}
                          label={insight.text}
                          variant="outlined"
                          color={
                            insight.type === 'positive' ? 'success' :
                            insight.type === 'negative' ? 'error' : 'default'
                          }
                          sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>Quick Actions</Typography>
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    {[
                      {
                        label: 'View Portfolio',
                        icon: <AccountBalance />,
                        color: '#1976d2',
                        action: () => navigate('/portfolio'),
                      },
                      {
                        label: 'Add Expense',
                        icon: <ShoppingCart />,
                        color: '#FF6B35',
                        action: () => navigate('/expenses'),
                      },
                      {
                        label: 'Pay Credit Card',
                        icon: <CreditCard />,
                        color: '#9C27B0',
                        action: () => navigate('/credit-cards'),
                      },
                      {
                        label: 'Browse Stocks',
                        icon: <TrendingUp />,
                        color: '#4CAF50',
                        action: () => navigate('/stocks'),
                      },
                    ].map((btn) => (
                      <Button
                        key={btn.label}
                        variant="outlined"
                        startIcon={btn.icon}
                        endIcon={<OpenInNew fontSize="small" />}
                        onClick={btn.action}
                        fullWidth
                        sx={{
                          justifyContent: 'flex-start',
                          borderColor: btn.color + '60',
                          color: btn.color,
                          '&:hover': {
                            backgroundColor: btn.color + '10',
                            borderColor: btn.color,
                          },
                        }}
                      >
                        {btn.label}
                      </Button>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default EODDashboard;
