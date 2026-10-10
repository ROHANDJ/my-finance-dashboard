import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  AccountBalance,
  Refresh,
  UploadFile,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import DhanConnect from '../../components/DhanConnect/DhanConnect';
import {
  StatCardsSkeleton,
  ChartSkeleton,
  ListSkeleton,
  TableSkeleton,
} from '../../components/Skeletons/Skeletons';

interface PortfolioData {
  id?: string;
  _id?: string;
  name: string;
  accountType: 'us' | 'indian';
  performance: {
    totalInvested: number;
    currentValue: number;
    totalReturns: number;
    totalReturnsPercentage: number;
    dayChange: number;
    dayChangePercentage: number;
  };
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    currency: string;
  }>;
}

// Tokens so slices and chips adapt to light/dark; chips blend them with color-mix().
const COLORS = ['#6366f1', 'var(--fh-info)', 'var(--fh-up)', 'var(--fh-warn)', 'var(--fh-down)', '#8b5cf6', '#ec4899'];

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: 'var(--fh-paper-solid)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: 'var(--fh-text)' },
  labelStyle: { color: 'var(--fh-text-3)' },
  itemStyle: { color: 'var(--fh-text)' },
};

const formatCurrency = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const portfolioKey = (p: PortfolioData, i: number) => p.id || p._id || `${p.name}-${i}`;

const headCellSx = {
  color: 'var(--fh-text-3)',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  whiteSpace: 'nowrap',
  borderBottomColor: 'rgba(148,163,184,0.12)',
} as const;

const bodyCellSx = { borderBottomColor: 'rgba(148,163,184,0.08)', whiteSpace: 'nowrap' } as const;

const Portfolio: React.FC = () => {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<PortfolioData[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const response = await axios.get('/api/portfolio');
      setPortfolios(response.data.portfolios);
      if (response.data.portfolios.length > 0) {
        setSelectedPortfolio(response.data.portfolios[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch portfolios');
    } finally {
      setIsLoading(false);
    }
  };

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;

    try {
      const response = await axios.post('/api/portfolio', {
        name: newPortfolioName,
        accountType: 'indian',
      });

      setPortfolios([...portfolios, response.data.portfolio]);
      if (!selectedPortfolio) setSelectedPortfolio(response.data.portfolio);
      setOpenDialog(false);
      setNewPortfolioName('');
      toast.success('Portfolio created successfully');
    } catch (error) {
      toast.error('Failed to create portfolio');
    }
  };

  const allocationData = selectedPortfolio
    ? (() => {
        const total = selectedPortfolio.holdings.reduce(
          (s, h) => s + h.quantity * (h.currentPrice || h.averagePrice), 0,
        );
        return selectedPortfolio.holdings
          .map((h, i) => ({
            name: h.symbol,
            value: total > 0
              ? Math.round((h.quantity * (h.currentPrice || h.averagePrice) / total) * 100)
              : 0,
            color: COLORS[i % COLORS.length],
          }))
          .filter(a => a.value > 0)
          .slice(0, 7);
      })()
    : [];

  const performanceData = selectedPortfolio
    ? [
        { date: 'Invested', value: selectedPortfolio.performance.totalInvested },
        { date: 'Current',  value: selectedPortfolio.performance.currentValue },
      ]
    : [];

  const header = (
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
          Portfolio
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--fh-muted)' }}>
          Track holdings, returns and allocation
        </Typography>
      </Box>
      <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
        <Tooltip title="Refresh">
          <IconButton onClick={fetchPortfolios} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          New Portfolio
        </Button>
      </Box>
    </Box>
  );

  const loadingSkeleton = (
    <Box>
      <StatCardsSkeleton count={4} />
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid item xs={12} lg={8}><ChartSkeleton height={260} /></Grid>
        <Grid item xs={12} lg={4}><ListSkeleton rows={5} /></Grid>
      </Grid>
      <TableSkeleton rows={5} columns={6} />
    </Box>
  );

  const pnlColor = (v: number) => (v >= 0 ? 'success.main' : 'error.main');

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      {header}

      {/* Dhan broker integration */}
      <Box mb={{ xs: 2, md: 3 }}>
        <DhanConnect onSynced={fetchPortfolios} />
      </Box>

      {isLoading ? loadingSkeleton : selectedPortfolio ? (
        <>
          {portfolios.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: { xs: 2, md: 3 } }}>
              {portfolios.map((p, i) => {
                const active = p === selectedPortfolio;
                return (
                  <Chip
                    key={portfolioKey(p, i)}
                    label={p.name}
                    onClick={() => setSelectedPortfolio(p)}
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    sx={{ maxWidth: 220 }}
                  />
                );
              })}
            </Box>
          )}

          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <Card className="portfolio-summary-card" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography sx={{ color: 'var(--fh-indigo-soft)', fontWeight: 600 }} gutterBottom>
                    Total Value
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', wordBreak: 'break-word' }}>
                    {formatCurrency(selectedPortfolio.performance.currentValue)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--fh-indigo-soft)' }}>
                    Invested {formatCurrency(selectedPortfolio.performance.totalInvested)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" fontWeight={600} gutterBottom>
                    Total Returns
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={pnlColor(selectedPortfolio.performance.totalReturns)}>
                    {selectedPortfolio.performance.totalReturns >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(selectedPortfolio.performance.totalReturns))}
                  </Typography>
                  <Typography variant="body2" color={pnlColor(selectedPortfolio.performance.totalReturnsPercentage)}>
                    {selectedPortfolio.performance.totalReturnsPercentage >= 0 ? '+' : ''}
                    {selectedPortfolio.performance.totalReturnsPercentage.toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" fontWeight={600} gutterBottom>
                    Day Change
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={pnlColor(selectedPortfolio.performance.dayChange)}>
                    {selectedPortfolio.performance.dayChange >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(selectedPortfolio.performance.dayChange))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography color="text.secondary" fontWeight={600} gutterBottom>
                    Holdings
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {selectedPortfolio.holdings.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={8}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Performance
                  </Typography>
                  <Box sx={{ height: { xs: 220, sm: 260, md: 300 } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis dataKey="date" stroke="var(--fh-faint)" tick={{ fill: 'var(--fh-text-3)', fontSize: 12 }} />
                        <YAxis
                          stroke="var(--fh-faint)"
                          width={64}
                          tick={{ fill: 'var(--fh-text-3)', fontSize: 12 }}
                          tickFormatter={(v: number) => new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}
                        />
                        <RechartsTooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Allocation
                  </Typography>
                  {allocationData.length === 0 ? (
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
                      <Typography variant="body2" sx={{ color: 'var(--fh-muted)' }}>No holdings to allocate yet</Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ height: { xs: 220, md: 260 } }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={allocationData}
                              cx="50%"
                              cy="50%"
                              innerRadius="45%"
                              outerRadius="75%"
                              stroke="var(--fh-paper-solid)"
                              dataKey="value"
                            >
                              {allocationData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                      <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                        {allocationData.map((item) => (
                          <Chip
                            key={item.name}
                            label={`${item.name}: ${item.value}%`}
                            size="small"
                            sx={{
                              backgroundColor: `color-mix(in srgb, ${item.color} 13%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${item.color} 40%, transparent)`,
                              color: 'var(--fh-text)',
                              maxWidth: '100%',
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Holdings
                  </Typography>
                  {selectedPortfolio.holdings.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'var(--fh-text-3)', mb: 2 }}>
                        This portfolio has no holdings yet. Sync your broker above or import a CAS statement.
                      </Typography>
                      <Button variant="outlined" startIcon={<UploadFile />} onClick={() => navigate('/cas-upload')}>
                        Import CAS
                      </Button>
                    </Box>
                  ) : (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                      <Table size="small" sx={{ minWidth: { xs: 0, sm: 640 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={headCellSx}>Symbol</TableCell>
                            <TableCell sx={headCellSx} align="right">Qty</TableCell>
                            <TableCell sx={{ ...headCellSx, display: { xs: 'none', sm: 'table-cell' } }} align="right">Avg Price</TableCell>
                            <TableCell sx={{ ...headCellSx, display: { xs: 'none', md: 'table-cell' } }} align="right">LTP</TableCell>
                            <TableCell sx={headCellSx} align="right">Value</TableCell>
                            <TableCell sx={{ ...headCellSx, display: { xs: 'none', sm: 'table-cell' } }} align="right">P&amp;L</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedPortfolio.holdings.map((holding, index) => {
                            const value = holding.quantity * holding.currentPrice;
                            const invested = holding.quantity * holding.averagePrice;
                            const pnl = value - invested;
                            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                            return (
                              <TableRow key={`${holding.symbol}-${index}`} hover>
                                <TableCell sx={{ ...bodyCellSx, maxWidth: { xs: 140, sm: 260 } }}>
                                  <Typography variant="body2" fontWeight={600} noWrap sx={{ color: 'var(--fh-text)' }}>
                                    {holding.symbol}
                                  </Typography>
                                  {holding.name && holding.name !== holding.symbol && (
                                    <Typography variant="caption" noWrap component="div" sx={{ color: 'var(--fh-muted)' }}>
                                      {holding.name}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={bodyCellSx} align="right">{holding.quantity}</TableCell>
                                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }} align="right">
                                  {formatCurrency(holding.averagePrice)}
                                </TableCell>
                                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', md: 'table-cell' } }} align="right">
                                  {formatCurrency(holding.currentPrice)}
                                </TableCell>
                                <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }} align="right">
                                  {formatCurrency(value)}
                                </TableCell>
                                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }} align="right">
                                  <Typography variant="body2" fontWeight={600} color={pnlColor(pnl)}>
                                    {pnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(pnl))}
                                  </Typography>
                                  <Typography variant="caption" color={pnlColor(pnl)}>
                                    {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: { xs: 6, md: 8 }, px: 2 }}>
            <AccountBalance sx={{ fontSize: 64, color: 'var(--fh-indigo)', mb: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ color: 'var(--fh-text)' }}>
              No Portfolio Yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--fh-text-3)' }} mb={3}>
              Create your first portfolio to start tracking your investments
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
                Create Portfolio
              </Button>
              <Button variant="outlined" startIcon={<UploadFile />} onClick={() => navigate('/cas-upload')}>
                Import CAS
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreenDialog}
      >
        <DialogTitle>Create New Portfolio</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Portfolio Name"
            fullWidth
            variant="outlined"
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createPortfolio();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={createPortfolio} variant="contained" disabled={!newPortfolioName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Portfolio;
