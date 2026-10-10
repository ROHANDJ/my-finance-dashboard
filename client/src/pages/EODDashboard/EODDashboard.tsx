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
import IndexChartDialog, { ChartableIndex } from '../../components/IndexChart/IndexChartDialog';
import {
  StatCardsSkeleton,
  ChartSkeleton,
  ListSkeleton,
} from '../../components/Skeletons/Skeletons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketIndex {
  symbol: string;
  short?: string;
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
  Food: '#f97316',
  Transport: 'var(--fh-up)',
  Shopping: '#a855f7',
  Entertainment: 'var(--fh-warn)',
  Utilities: 'var(--fh-info)',
  Health: 'var(--fh-down)',
  Education: '#22d3ee',
  Other: 'var(--fh-muted)',
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--fh-paper-solid)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 8,
    color: 'var(--fh-text)',
  },
  labelStyle: { color: 'var(--fh-text-3)' },
  itemStyle: { color: 'var(--fh-text)' },
};

const AXIS_TICK = { fontSize: 11, fill: 'var(--fh-text-3)' };

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
  <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} py={0.75}>
    <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
    <Box sx={{ minWidth: 0, textAlign: 'right' }}>{value}</Box>
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const EODDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [chartIndex, setChartIndex] = useState<ChartableIndex | null>(null);
  const now = new Date();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<EODSummary>(
    'eod-summary',
    fetchEODSummary,
    {
      refetchInterval: REFRESH_INTERVAL_MS,
      onSuccess: () => setLastUpdated(new Date()),
      onError: () => { toast.error('Failed to load EOD summary'); },
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
    <Box sx={{ width: '100%', minWidth: 0 }}>
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: { xs: 1, sm: 2 },
          mb: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
            End of Day Summary
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)' }}>
            {formatDate(now)}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'var(--fh-muted)' }}>
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
      {alerts.filter((a) => !dismissedAlerts.has(a.message)).map((alert, i) => (
        <Alert
          key={`${alert.type}-${i}`}
          severity={alert.type}
          icon={<NotificationsActive />}
          sx={{ mb: 1 }}
          onClose={() => setDismissedAlerts((prev) => new Set(prev).add(alert.message))}
        >
          {alert.message}
        </Alert>
      ))}

      {isLoading ? (
        /* ── Loading Skeletons ─────────────────────────────────────────────────── */
        <Box>
          <StatCardsSkeleton count={4} />
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
            <Grid item xs={12} md={7}><ChartSkeleton height={240} /></Grid>
            <Grid item xs={12} md={5}><ChartSkeleton height={240} /></Grid>
          </Grid>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid item xs={12} md={8}><ListSkeleton rows={3} /></Grid>
            <Grid item xs={12} md={4}><ListSkeleton rows={4} /></Grid>
          </Grid>
        </Box>
      ) : isError ? (
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={handleRefresh}>Retry</Button>
        }>
          Failed to load EOD summary. Please try again.
        </Alert>
      ) : (
        <>
          {/* ── Main Grid ────────────────────────────────────────────────────────── */}
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
            {/* Portfolio Summary */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', borderTop: `4px solid ${dayChangePositive ? 'var(--fh-up)' : 'var(--fh-down)'}` }}>
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
                      ? <ArrowUpward sx={{ color: 'var(--fh-up)', fontSize: 16 }} />
                      : <ArrowDownward sx={{ color: 'var(--fh-down)', fontSize: 16 }} />}
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
              <Card sx={{ height: '100%', borderTop: '4px solid #f97316' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <ShoppingCart sx={{ color: '#f97316' }} />
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
                        backgroundColor: CATEGORY_COLORS[expenses?.topCategory ?? ''] ?? 'var(--fh-muted)',
                      }}
                    />
                    <Typography variant="body2" fontWeight={600}>{expenses?.topCategory ?? '—'}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">RECENT</Typography>
                  {(expenses?.recentTransactions ?? []).slice(0, 3).map((tx, i) => (
                    <Box key={i} display="flex" justifyContent="space-between" gap={1} py={0.4}>
                      <Typography variant="caption" noWrap sx={{ minWidth: 0, flex: 1, color: 'var(--fh-text-2)' }}>{tx.description}</Typography>
                      <Typography variant="caption" fontWeight={600} color="error.main" sx={{ flexShrink: 0 }}>
                        -{formatCurrency(tx.amount)}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Credit Cards */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', borderTop: '4px solid #a855f7' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <CreditCard sx={{ color: '#a855f7' }} />
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
              <Card sx={{ height: '100%', borderTop: '4px solid var(--fh-info)' }}>
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
                          onClick={() => setChartIndex({ symbol: idx.symbol, name: idx.name })}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChartIndex({ symbol: idx.symbol, name: idx.name }); } }}
                          title="View chart"
                          sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { background: 'rgba(99,102,241,0.08)' } }}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          py={0.75}
                          gap={1}
                          borderBottom="1px solid"
                          borderColor="divider"
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{idx.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap component="div">{idx.short || idx.symbol}</Typography>
                          </Box>
                          <Box textAlign="right" sx={{ flexShrink: 0 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {idx.value.toLocaleString('en-IN')}
                            </Typography>
                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.3}>
                              {up
                                ? <TrendingUp sx={{ color: 'var(--fh-up)', fontSize: 14 }} />
                                : <TrendingDown sx={{ color: 'var(--fh-down)', fontSize: 14 }} />}
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
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
            {/* Portfolio P&L Trend */}
            <Grid item xs={12} md={7}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Portfolio Value Trend — Today
                  </Typography>
                  {trend.length === 0 ? (
                    <Box
                      sx={{
                        height: { xs: 200, md: 260 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 2,
                        border: '1px dashed rgba(148,163,184,0.15)',
                        backgroundColor: 'var(--fh-surface-2)',
                      }}
                    >
                      <Typography sx={{ color: 'var(--fh-muted)' }}>No trend data available</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ height: { xs: 220, sm: 240, md: 260 } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis dataKey="time" tick={AXIS_TICK} stroke="var(--fh-faint)" />
                        <YAxis
                          tick={AXIS_TICK}
                          stroke="var(--fh-faint)"
                          width={56}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                        />
                        <RechartsTooltip
                          {...CHART_TOOLTIP_STYLE}
                          formatter={(v: number) => [formatCurrency(v), 'Portfolio Value']}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={dayChangePositive ? 'var(--fh-up)' : 'var(--fh-down)'}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Spending Donut */}
            <Grid item xs={12} md={5}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <PieChartIcon color="secondary" />
                    <Typography variant="h6" fontWeight={600}>Today's Spending</Typography>
                  </Box>
                  {spendingCats.length === 0 ? (
                    <Box
                      sx={{
                        height: { xs: 200, md: 260 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 2,
                        border: '1px dashed rgba(148,163,184,0.15)',
                        backgroundColor: 'var(--fh-surface-2)',
                      }}
                    >
                      <Typography sx={{ color: 'var(--fh-muted)' }}>No expenses today</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ height: { xs: 240, md: 260 } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={spendingCats}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius="45%"
                          outerRadius="70%"
                          stroke="var(--fh-paper-solid)"
                        >
                          {spendingCats.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.color || CATEGORY_COLORS[entry.category] || 'var(--fh-muted)'}
                            />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--fh-text-3)' }} />
                        <RechartsTooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Insights + Quick Actions ──────────────────────────────────────── */}
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {/* Insights */}
            <Grid item xs={12} md={8}>
              <Card sx={{ height: '100%' }}>
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
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>Quick Actions</Typography>
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    {[
                      {
                        label: 'View Portfolio',
                        icon: <AccountBalance />,
                        color: 'var(--fh-indigo)',
                        action: () => navigate('/portfolio'),
                      },
                      {
                        label: 'Add Expense',
                        icon: <ShoppingCart />,
                        color: '#f97316',
                        action: () => navigate('/expenses'),
                      },
                      {
                        label: 'Pay Credit Card',
                        icon: <CreditCard />,
                        color: '#a855f7',
                        action: () => navigate('/credit-cards'),
                      },
                      {
                        label: 'Browse Stocks',
                        icon: <TrendingUp />,
                        color: 'var(--fh-up)',
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
                          '& .MuiButton-endIcon': { ml: 'auto' },
                          borderColor: `color-mix(in srgb, ${btn.color} 38%, transparent)`,
                          color: btn.color,
                          '&:hover': {
                            backgroundColor: `color-mix(in srgb, ${btn.color} 6%, transparent)`,
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
      <IndexChartDialog
        open={!!chartIndex}
        onClose={() => setChartIndex(null)}
        index={chartIndex}
        indices={market.map((m: any) => ({ symbol: m.symbol, name: m.name }))}
      />
    </Box>
  );
};

export default EODDashboard;
