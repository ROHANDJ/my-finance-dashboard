import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Skeleton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  Refresh,
  ShowChart,
  Calculate,
  Star,
  Close,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface MutualFund {
  schemeCode: string;
  schemeName: string;
  amc: string;
  category: string;
  nav: number;
  date: string;
  returns?: {
    '1D'?: number;
    '1W'?: number;
    '1M'?: number;
    '3M'?: number;
    '6M'?: number;
    '1Y'?: number;
    '3Y'?: number;
    '5Y'?: number;
  };
  risk?: {
    standardDeviation: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  rating?: {
    morningstar: number;
    valueResearch: number;
    crisil: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const headCellSx = {
  background: 'var(--fh-table-head)',
  color: 'var(--fh-text-2)',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
} as const;

/** Low-value columns hidden on narrow screens. */
const hideOnXs = { display: { xs: 'none', sm: 'table-cell' } } as const;
const hideBelowMd = { display: { xs: 'none', md: 'table-cell' } } as const;

const MutualFunds: React.FC = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedFund, setSelectedFund] = useState<MutualFund | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [sipAmount, setSipAmount] = useState('1000');
  const [sipPeriod, setSipPeriod] = useState('12');
  const [sipResult, setSipResult] = useState<any>(null);
  const [sipCalculating, setSipCalculating] = useState(false);

  useEffect(() => {
    fetchTopFunds();
  }, []);

  const fetchTopFunds = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/mutualfunds/top');
      setFunds(response.data.funds || []);
    } catch (error) {
      toast.error('Failed to fetch mutual funds');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.get('/api/mutualfunds/search', {
        params: { q: searchQuery }
      });
      setFunds(response.data.funds || []);
    } catch (error) {
      toast.error('Failed to search mutual funds');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSIP = async () => {
    setSipCalculating(true);
    try {
      const response = await axios.get('/api/mutualfunds/sip-calculator', {
        params: { amount: sipAmount, period: sipPeriod }
      });
      setSipResult(response.data);
    } catch (error) {
      toast.error('Failed to calculate SIP');
    } finally {
      setSipCalculating(false);
    }
  };

  const getFundDetails = async (schemeCode: string) => {
    try {
      const response = await axios.get(`/api/mutualfunds/details/${schemeCode}`);
      setSelectedFund(response.data.fund);
      setOpenDialog(true);
    } catch (error) {
      toast.error('Failed to fetch fund details');
    }
  };

  const displayFunds = funds;
  const navChartData = displayFunds.slice(0, 6).map(f => ({
    date: f.schemeName.slice(0, 12),
    nav: f.nav,
  }));

  const returnColor = (v: number) => (v >= 0 ? 'var(--fh-up)' : 'var(--fh-down)');

  return (
    <Box>
      <Box
        sx={{
          display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 2, mb: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
            Mutual Funds
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)', mt: 0.5 }}>
            Explore top funds, plan SIPs and compare performance
          </Typography>
        </Box>
        <IconButton onClick={fetchTopFunds} color="primary" disabled={isLoading} aria-label="Refresh">
          <Refresh />
        </IconButton>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 2, md: 3 } }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Explore Funds" />
          <Tab label="SIP Calculator" />
          <Tab label="Compare Funds" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Box display="flex" gap={{ xs: 1.5, sm: 2 }} mb={3} flexDirection={{ xs: 'column', sm: 'row' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search mutual funds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'var(--fh-muted)' }} />,
                }}
              />
              <Button variant="contained" onClick={handleSearch} disabled={isLoading} sx={{ flexShrink: 0, px: 3 }}>
                Search
              </Button>
            </Box>

            <TableContainer
              sx={{ overflowX: 'auto', borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.12)' }}
            >
              <Table size="small" sx={{ minWidth: { xs: 480, md: 860 } }}>
                <TableHead>
                  <TableRow sx={{ '&:hover': { background: 'transparent' } }}>
                    <TableCell sx={headCellSx}>Fund Name</TableCell>
                    <TableCell sx={{ ...headCellSx, ...hideBelowMd }}>Category</TableCell>
                    <TableCell sx={headCellSx} align="right">NAV</TableCell>
                    <TableCell sx={headCellSx} align="right">1Y Return</TableCell>
                    <TableCell sx={{ ...headCellSx, ...hideOnXs }} align="right">3Y Return</TableCell>
                    <TableCell sx={{ ...headCellSx, ...hideBelowMd }} align="center">Rating</TableCell>
                    <TableCell sx={headCellSx} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, r) => (
                      <TableRow key={r}>
                        {Array.from({ length: 7 }).map((__, c) => (
                          <TableCell
                            key={c}
                            sx={c === 1 || c === 5 ? hideBelowMd : c === 4 ? hideOnXs : undefined}
                          >
                            {c === 6 ? (
                              <Skeleton variant="rounded" width={96} height={28} sx={{ mx: 'auto' }} />
                            ) : (
                              <>
                                <Skeleton variant="text" sx={{ fontSize: '0.9rem', width: c === 0 ? '85%' : '60%', ml: c >= 2 && c <= 4 ? 'auto' : 0 }} />
                                {(c === 0 || c === 2) && <Skeleton variant="text" sx={{ fontSize: '0.7rem', width: '45%', ml: c === 2 ? 'auto' : 0 }} />}
                              </>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : displayFunds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'var(--fh-text-3)' }}>
                        No funds found
                      </TableCell>
                    </TableRow>
                  ) : displayFunds.map((fund) => (
                    <TableRow key={fund.schemeCode} hover>
                      <TableCell sx={{ maxWidth: 340 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'var(--fh-text)' }} title={fund.schemeName}>
                          {fund.schemeName}
                        </Typography>
                        <Typography variant="caption" noWrap component="div" sx={{ color: 'var(--fh-muted)' }}>
                          {fund.amc}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ ...hideBelowMd, maxWidth: 200 }}>
                        {fund.category && (
                          <Chip
                            label={fund.category}
                            size="small"
                            variant="outlined"
                            sx={{ maxWidth: '100%', color: 'var(--fh-text-2)', borderColor: 'rgba(148,163,184,0.3)' }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--fh-text)' }}>
                          ₹{fund.nav ? Number(fund.nav).toFixed(2) : '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--fh-muted)' }}>
                          {fund.date}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: returnColor(fund.returns?.['1Y'] || 0) }}>
                          {(fund.returns?.['1Y'] || 0).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={hideOnXs}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: returnColor(fund.returns?.['3Y'] || 0) }}>
                          {(fund.returns?.['3Y'] || 0).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={hideBelowMd}>
                        <Box display="flex" justifyContent="center" gap={0.25}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              sx={{ fontSize: '1rem', color: star <= (fund.rating?.morningstar || 0) ? 'var(--fh-warn)' : 'var(--fh-faint)' }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => getFundDetails(fund.schemeCode)}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'var(--fh-text)' }}>
                  SIP Calculator
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Monthly Investment (₹)"
                    type="number"
                    value={sipAmount}
                    onChange={(e) => setSipAmount(e.target.value)}
                  />
                  <TextField
                    label="Investment Period (months)"
                    type="number"
                    value={sipPeriod}
                    onChange={(e) => setSipPeriod(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    startIcon={sipCalculating ? <CircularProgress size={16} color="inherit" /> : <Calculate />}
                    onClick={calculateSIP}
                    disabled={sipCalculating}
                  >
                    Calculate Returns
                  </Button>
                </Box>

                {sipResult && (
                  <Box mt={3}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700, color: 'var(--fh-text)' }}>
                      Results
                    </Typography>
                    <Grid container spacing={1.5}>
                      {[
                        { label: 'Total Investment', value: `₹${sipResult.investment?.toLocaleString('en-IN')}`, color: 'var(--fh-text)' },
                        { label: 'Future Value', value: `₹${sipResult.futureValue?.toLocaleString('en-IN')}`, color: 'var(--fh-text)' },
                        { label: 'Total Returns', value: `₹${sipResult.returns?.toLocaleString('en-IN')}`, color: 'var(--fh-up)' },
                        { label: 'Return %', value: `${sipResult.returnPercentage?.toFixed(2)}%`, color: 'var(--fh-up)' },
                      ].map(item => (
                        <Grid item xs={6} key={item.label}>
                          <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                            <Typography variant="caption" sx={{ color: 'var(--fh-muted)', fontWeight: 600 }}>{item.label}</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: item.color, wordBreak: 'break-word' }}>
                              {item.value}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'var(--fh-text)' }}>
                  SIP Benefits
                </Typography>
                <Box display="flex" flexDirection="column" gap={2} sx={{ color: 'var(--fh-text-2)' }}>
                  <Typography variant="body2">
                    • Rupee cost averaging reduces market timing risk
                  </Typography>
                  <Typography variant="body2">
                    • Power of compounding grows your wealth exponentially
                  </Typography>
                  <Typography variant="body2">
                    • Disciplined investing habit development
                  </Typography>
                  <Typography variant="body2">
                    • Flexible investment amounts and durations
                  </Typography>
                  <Typography variant="body2">
                    • Tax benefits under ELSS funds (80C)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: { xs: 5, md: 8 } }}>
            <ShowChart sx={{ fontSize: 64, color: 'var(--fh-faint)', mb: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'var(--fh-text)' }}>
              Fund Comparison Tool
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--fh-text-3)', mb: 2 }}>
              Compare multiple mutual funds side by side to make informed investment decisions
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--fh-muted)' }}>
              Select up to 4 funds to compare their performance, risk, and other metrics
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{ sx: { background: 'var(--fh-dialog)', border: '1px solid rgba(99,102,241,0.2)' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography component="span" sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: '1.1rem', flex: 1, minWidth: 0 }}>
            {selectedFund?.schemeName}
          </Typography>
          <IconButton onClick={() => setOpenDialog(false)} size="small" sx={{ color: 'var(--fh-text-3)' }} aria-label="Close">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          {selectedFund && (
            <Grid container spacing={{ xs: 2, md: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: '1rem' }}>
                  Performance
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={navChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--fh-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--fh-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--fh-paper-solid)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: 'var(--fh-text)' }}
                      labelStyle={{ color: 'var(--fh-text-3)' }}
                    />
                    <Line type="monotone" dataKey="nav" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: '1rem' }}>
                  Returns
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  {(['1Y', '3Y', '5Y'] as const).map(k => {
                    const v = selectedFund.returns?.[k];
                    return (
                      <Box key={k} display="flex" justifyContent="space-between" sx={{ py: 0.75, borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                        <Typography variant="body2" sx={{ color: 'var(--fh-text-3)' }}>{k.replace('Y', ' Year')}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: v === undefined ? 'var(--fh-muted)' : returnColor(v) }}>
                          {v === undefined ? '—' : `${v.toFixed(2)}%`}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MutualFunds;
