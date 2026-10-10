import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  PieChart as PieChartIcon,
  Warning,
  TrendingUp,
  Lightbulb,
  Shield,
  SwapHoriz,
  MonetizationOn,
  Explore,
  CheckCircle,
  Info,
  Refresh,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { CardGridSkeleton, TableSkeleton } from '../../components/Skeletons/Skeletons';

// ─── Types ────────────────────────────────────────────────────────────────────

type SuggestionPriority = 'HIGH' | 'MEDIUM' | 'LOW';
type SuggestionType = 'diversification' | 'risk' | 'profit' | 'rebalance' | 'general';

interface Suggestion {
  _id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  potentialImpact: number; // percentage
  actionLabel: string;
}

type RebalanceAction = 'BUY' | 'SELL' | 'HOLD';

interface RebalanceRow {
  symbol: string;
  name: string;
  currentPercent: number;
  suggestedPercent: number;
  action: RebalanceAction;
  reason: string;
}

interface TaxOpportunity {
  _id: string;
  symbol: string;
  holdingPeriod: number; // days
  unrealizedGainLoss: number;
  taxRate: number; // percent
  suggestion: string;
  potentialTaxSaving: number;
}

interface MarketOpportunity {
  _id: string;
  symbol: string;
  name: string;
  reason: string;
  currentPrice: number;
  targetPrice: number;
  upsidePercent: number;
  sector: string;
}

interface OptimizationData {
  healthScore: number;
  riskScore: number;
  suggestions: Suggestion[];
  rebalancing: RebalanceRow[];
  taxOpportunities: TaxOpportunity[];
  opportunities: MarketOpportunity[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const healthColor = (score: number) => {
  if (score >= 70) return 'var(--fh-up)';
  if (score >= 40) return 'var(--fh-warn)';
  return 'var(--fh-down)';
};

const riskLabel = (score: number) => {
  if (score >= 70) return { label: 'High Risk', color: 'error' as const };
  if (score >= 40) return { label: 'Medium Risk', color: 'warning' as const };
  return { label: 'Low Risk', color: 'success' as const };
};

const priorityConfig: Record<SuggestionPriority, { color: 'error' | 'warning' | 'success'; label: string }> = {
  HIGH: { color: 'error', label: 'HIGH' },
  MEDIUM: { color: 'warning', label: 'MEDIUM' },
  LOW: { color: 'success', label: 'LOW' },
};

const actionConfig: Record<RebalanceAction, { color: 'success' | 'error' | 'default'; label: string }> = {
  BUY: { color: 'success', label: 'BUY' },
  SELL: { color: 'error', label: 'SELL' },
  HOLD: { color: 'default', label: 'HOLD' },
};

const SuggestionIcon: React.FC<{ type: SuggestionType }> = ({ type }) => {
  const icons: Record<SuggestionType, React.ReactNode> = {
    diversification: <PieChartIcon />,
    risk: <Warning />,
    profit: <TrendingUp />,
    rebalance: <SwapHoriz />,
    general: <Lightbulb />,
  };
  return <>{icons[type] ?? <Info />}</>;
};

const SuggestionTypeColor: Record<SuggestionType, string> = {
  diversification: '#a855f7',
  risk: 'var(--fh-down)',
  profit: 'var(--fh-up)',
  rebalance: 'var(--fh-info)',
  general: 'var(--fh-warn)',
};

const PRIORITY_BORDER: Record<'error' | 'warning' | 'success', string> = {
  error: 'rgba(244,63,94,0.35)',
  warning: 'rgba(245,158,11,0.35)',
  success: 'rgba(16,185,129,0.35)',
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchOptimization = async (): Promise<OptimizationData> => {
  const { data } = await axios.get('/api/optimization/suggestions');
  return data;
};

// ─── Tab Panel ───────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: { xs: 1, md: 2 } }}>
    {value === index && children}
  </Box>
);

// ─── Health Score Ring ───────────────────────────────────────────────────────

interface HealthRingProps {
  score: number;
  riskScore: number;
  isLoading: boolean;
}

const HealthRing: React.FC<HealthRingProps> = ({ score, riskScore, isLoading }) => {
  const color = healthColor(score);
  const risk = riskLabel(riskScore);

  return (
    <Card sx={{ mb: { xs: 2, md: 3 } }}>
      <CardContent>
        <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
          <Grid item xs={12} sm="auto" sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box
              position="relative"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
            >
              {isLoading ? (
                <Skeleton variant="circular" width={140} height={140} />
              ) : (
                <>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={140}
                    thickness={5}
                    sx={{ color: 'rgba(148,163,184,0.15)', position: 'absolute' }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={score}
                    size={140}
                    thickness={5}
                    sx={{ color }}
                  />
                  <Box
                    position="absolute"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <Typography variant="h4" fontWeight={800} sx={{ color }}>
                      {score}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      / 100
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} sm sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} mb={0.5} sx={{ color: 'var(--fh-text)' }}>
              Portfolio Health Score
            </Typography>
            {isLoading ? (
              <>
                <Skeleton variant="text" sx={{ fontSize: '0.9rem', width: '80%', mb: 2 }} />
                <Skeleton variant="rounded" width={220} height={24} />
              </>
            ) : (
            <>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {score >= 70
                ? 'Your portfolio is well-balanced and performing strongly.'
                : score >= 40
                ? 'There are some areas to improve for better returns.'
                : 'Your portfolio needs attention. Review the suggestions below.'}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Shield sx={{ color: risk.color === 'error' ? 'var(--fh-down)' : risk.color === 'warning' ? 'var(--fh-warn)' : 'var(--fh-up)' }} />
              <Typography variant="body2" fontWeight={600}>Risk Score:</Typography>
              <Chip
                label={risk.label}
                size="small"
                color={risk.color}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                ({riskScore}/100)
              </Typography>
            </Box>
            </>
            )}
          </Grid>
          <Grid item xs={12} md="auto">
            <Box display="flex" flexDirection="column" gap={1} sx={{ minWidth: { xs: 0, md: 240 } }}>
              {[
                { label: 'Diversification', pct: Math.min(score + 10, 100) },
                { label: 'Risk Management', pct: Math.max(100 - riskScore, 20) },
                { label: 'Return Potential', pct: score },
              ].map((metric) => (
                <Box key={metric.label}>
                  <Box display="flex" justifyContent="space-between" mb={0.3}>
                    <Typography variant="caption" color="text.secondary">{metric.label}</Typography>
                    <Typography variant="caption" fontWeight={600}>{isLoading ? '—' : `${metric.pct}%`}</Typography>
                  </Box>
                  <LinearProgress
                    variant={isLoading ? 'indeterminate' : 'determinate'}
                    value={metric.pct}
                    sx={{
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: 'rgba(148,163,184,0.15)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: healthColor(metric.pct),
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Optimization: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery<OptimizationData>(
    'optimization',
    fetchOptimization,
    {
      onError: () => { toast.error('Failed to load optimization data'); },
      staleTime: 5 * 60 * 1000,
    }
  );

  const applyRebalancingMutation = useMutation(
    () => axios.post('/api/optimization/rebalance'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('optimization');
        toast.success('Rebalancing recommendations applied');
      },
      onError: () => { toast.error('Failed to apply rebalancing'); },
    }
  );

  const suggestions = data?.suggestions ?? [];
  const rebalancing = data?.rebalancing ?? [];
  const taxOpportunities = data?.taxOpportunities ?? [];
  const opportunities = data?.opportunities ?? [];
  const healthScore = data?.healthScore ?? 0;
  const riskScore = data?.riskScore ?? 0;

  const totalTaxSaving = taxOpportunities.reduce((s, t) => s + t.potentialTaxSaving, 0);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
            Portfolio Optimizer
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)', mt: 0.5 }}>
            AI-powered suggestions to maximize your returns and minimize risk.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      {/* Health Score */}
      <HealthRing score={healthScore} riskScore={riskScore} isLoading={isLoading} />

      {/* Tabs */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 0, sm: 2 } }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab label={`Suggestions${suggestions.length ? ` (${suggestions.length})` : ''}`} />
            <Tab label="Rebalancing" />
            <Tab label="Tax Optimizer" />
            <Tab label="Opportunities" />
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* ── Error ──────────────────────────────────────────────────────── */}
            {isError && (
              <Alert severity="error" action={
                <Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>
              }>
                Failed to load optimization data.
              </Alert>
            )}

            {/* ── Tab 0: Suggestions ─────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={0}>
              {isLoading ? (
                <CardGridSkeleton count={4} height={200} />
              ) : suggestions.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>Your portfolio looks great!</Typography>
                  <Typography variant="body2" color="text.secondary">
                    No suggestions at this time. Keep up the good work.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  {suggestions.map((s) => {
                    const { color, label } = priorityConfig[s.priority];
                    const iconColor = SuggestionTypeColor[s.type];
                    return (
                      <Grid item xs={12} md={6} xl={4} key={s._id}>
                        <Card
                          variant="outlined"
                          sx={{
                            height: '100%',
                            borderColor: PRIORITY_BORDER[color],
                          }}
                        >
                          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                              <Box
                                sx={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 2,
                                  backgroundColor: `color-mix(in srgb, ${iconColor} 13%, transparent)`,
                                  color: iconColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <SuggestionIcon type={s.type} />
                              </Box>
                              <Chip label={label} size="small" color={color} />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: 'var(--fh-text)' }}>
                              {s.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2} sx={{ flex: 1 }}>
                              {s.description}
                            </Typography>
                            <Divider sx={{ mb: 1.5 }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <TrendingUp sx={{ color: 'var(--fh-up)', fontSize: 16 }} />
                                <Typography variant="body2" color="success.main" fontWeight={600}>
                                  +{s.potentialImpact}% potential impact
                                </Typography>
                              </Box>
                              <Button size="small" variant="outlined" color={color}>
                                {s.actionLabel}
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </TabPanel>

            {/* ── Tab 1: Rebalancing ─────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={1}>
              {isLoading ? (
                <TableSkeleton rows={5} columns={6} title={false} />
              ) : rebalancing.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>Portfolio is balanced</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your current allocation matches the suggested targets.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box display="flex" justifyContent="flex-end" mb={2}>
                    <Tooltip title="Apply all rebalancing suggestions">
                      <Button
                        variant="contained"
                        startIcon={<SwapHoriz />}
                        onClick={() => applyRebalancingMutation.mutate()}
                        disabled={applyRebalancingMutation.isLoading}
                      >
                        {applyRebalancingMutation.isLoading ? 'Applying...' : 'Apply Rebalancing'}
                      </Button>
                    </Tooltip>
                  </Box>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ overflowX: 'auto', backgroundColor: 'transparent', backgroundImage: 'none' }}
                  >
                    <Table size="small" sx={{ minWidth: { xs: 520, md: 720 } }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(148,163,184,0.06)' }}>
                          <TableCell><strong>Symbol</strong></TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>Name</strong></TableCell>
                          <TableCell align="right"><strong>Current %</strong></TableCell>
                          <TableCell align="right"><strong>Suggested %</strong></TableCell>
                          <TableCell align="center"><strong>Action</strong></TableCell>
                          <TableCell><strong>Reason</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rebalancing.map((row, i) => {
                          const { color, label } = actionConfig[row.action];
                          const diff = row.suggestedPercent - row.currentPercent;
                          return (
                            <TableRow key={i} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700}>{row.symbol}</Typography>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                <Typography variant="body2">{row.name}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">{row.currentPercent.toFixed(1)}%</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5} sx={{ whiteSpace: 'nowrap' }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {row.suggestedPercent.toFixed(1)}%
                                  </Typography>
                                  {diff !== 0 && (
                                    <Typography
                                      variant="caption"
                                      color={diff > 0 ? 'success.main' : 'error.main'}
                                    >
                                      ({diff > 0 ? '+' : ''}{diff.toFixed(1)}%)
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={label} size="small" color={color} />
                              </TableCell>
                              <TableCell sx={{ minWidth: 180 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {row.reason}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </TabPanel>

            {/* ── Tab 2: Tax Optimizer ───────────────────────────────────────── */}
            <TabPanel value={activeTab} index={2}>
              {isLoading ? (
                <CardGridSkeleton count={3} height={220} />
              ) : taxOpportunities.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <MonetizationOn sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>No tax-loss opportunities found</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your holdings don't currently offer tax-loss harvesting benefits.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Summary Banner */}
                  <Alert severity="info" sx={{ mb: 3 }} icon={<MonetizationOn />}>
                    <strong>Potential Total Tax Saving: {formatCurrency(totalTaxSaving)}</strong> — Review the opportunities below.
                  </Alert>
                  <Grid container spacing={{ xs: 2, md: 3 }}>
                    {taxOpportunities.map((opp) => {
                      const isLoss = opp.unrealizedGainLoss < 0;
                      return (
                        <Grid item xs={12} sm={6} lg={4} key={opp._id}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardContent>
                              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} mb={1.5}>
                                <Typography variant="h6" fontWeight={700} noWrap sx={{ color: 'var(--fh-text)', minWidth: 0 }}>{opp.symbol}</Typography>
                                <Chip
                                  label={isLoss ? 'Harvest Loss' : 'Book Gains'}
                                  size="small"
                                  color={isLoss ? 'warning' : 'info'}
                                />
                              </Box>
                              <Grid container spacing={1} mb={1.5}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Holding Period</Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {opp.holdingPeriod} days
                                    {opp.holdingPeriod >= 365 && (
                                      <Chip label="LTCG" size="small" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} color="success" />
                                    )}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Tax Rate</Typography>
                                  <Typography variant="body2" fontWeight={600}>{opp.taxRate}%</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Unrealized P&L</Typography>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color={isLoss ? 'error.main' : 'success.main'}
                                  >
                                    {isLoss ? '' : '+'}{formatCurrency(opp.unrealizedGainLoss)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" color="text.secondary">Tax Saving</Typography>
                                  <Typography variant="body2" fontWeight={700} color="success.main">
                                    {formatCurrency(opp.potentialTaxSaving)}
                                  </Typography>
                                </Grid>
                              </Grid>
                              <Divider sx={{ mb: 1.5 }} />
                              <Typography variant="body2" color="text.secondary">
                                {opp.suggestion}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </>
              )}
            </TabPanel>

            {/* ── Tab 3: Opportunities ───────────────────────────────────────── */}
            <TabPanel value={activeTab} index={3}>
              {isLoading ? (
                <CardGridSkeleton count={6} height={220} />
              ) : opportunities.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <Explore sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>No opportunities found</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Check back later for new market opportunities.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  {opportunities.map((opp) => {
                    const upColor = opp.upsidePercent >= 20 ? 'var(--fh-up)' : opp.upsidePercent >= 10 ? 'var(--fh-info)' : 'var(--fh-warn)';
                    const upLabel = opp.upsidePercent >= 20 ? 'Strong Buy' : opp.upsidePercent >= 10 ? 'Buy' : 'Watch';
                    return (
                      <Grid item xs={12} sm={6} lg={4} xl={3} key={opp._id}>
                        <Card
                          variant="outlined"
                          sx={{
                            height: '100%',
                            borderColor: `color-mix(in srgb, ${upColor} 38%, transparent)`,
                            '&:hover': { borderColor: upColor },
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="h6" fontWeight={700} noWrap sx={{ color: 'var(--fh-text)' }}>{opp.symbol}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap component="div">{opp.name}</Typography>
                              </Box>
                              <Chip
                                label={upLabel}
                                size="small"
                                sx={{ backgroundColor: upColor, color: 'white', fontWeight: 700, flexShrink: 0 }}
                              />
                            </Box>

                            <Chip label={opp.sector} size="small" variant="outlined" sx={{ mb: 1.5, fontSize: '0.65rem', height: 20 }} />

                            <Grid container spacing={1} mb={1.5}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Current Price</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {formatCurrency(opp.currentPrice)}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">Target Price</Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ color: upColor }}>
                                  {formatCurrency(opp.targetPrice)}
                                </Typography>
                              </Grid>
                            </Grid>

                            <Box
                              display="flex"
                              alignItems="center"
                              gap={0.5}
                              p={1}
                              borderRadius={1}
                              sx={{ backgroundColor: `color-mix(in srgb, ${upColor} 8%, transparent)`, mb: 1.5 }}
                            >
                              <TrendingUp sx={{ color: upColor, fontSize: 18 }} />
                              <Typography variant="body2" fontWeight={700} sx={{ color: upColor }}>
                                +{opp.upsidePercent.toFixed(1)}% upside potential
                              </Typography>
                            </Box>

                            <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                              {opp.reason}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </TabPanel>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Optimization;
