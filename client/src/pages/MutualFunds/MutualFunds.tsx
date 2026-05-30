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
  Paper,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Refresh,
  ShowChart,
  Calculate,
  Star,
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

const MutualFunds: React.FC = () => {
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedFund, setSelectedFund] = useState<MutualFund | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [sipAmount, setSipAmount] = useState('1000');
  const [sipPeriod, setSipPeriod] = useState('12');
  const [sipResult, setSipResult] = useState<any>(null);

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
    try {
      const response = await axios.get('/api/mutualfunds/sip-calculator', {
        params: { amount: sipAmount, period: sipPeriod }
      });
      setSipResult(response.data);
    } catch (error) {
      toast.error('Failed to calculate SIP');
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Mutual Funds
        </Typography>
        <IconButton onClick={fetchTopFunds} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Explore Funds" />
          <Tab label="SIP Calculator" />
          <Tab label="Compare Funds" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" gap={2} mb={3}>
                  <TextField
                    fullWidth
                    placeholder="Search mutual funds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                  <Button variant="contained" onClick={handleSearch}>
                    Search
                  </Button>
                </Box>

                {isLoading ? (
                  <LinearProgress />
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Fund Name</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">NAV</TableCell>
                          <TableCell align="right">1Y Return</TableCell>
                          <TableCell align="right">3Y Return</TableCell>
                          <TableCell align="center">Rating</TableCell>
                          <TableCell align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayFunds.map((fund) => (
                          <TableRow key={fund.schemeCode} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {fund.schemeName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {fund.amc}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={fund.category} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                ₹{fund.nav ? Number(fund.nav).toFixed(2) : '—'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {fund.date}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={(fund.returns?.['1Y'] || 0) >= 0 ? 'success.main' : 'error.main'}
                              >
                                {(fund.returns?.['1Y'] || 0).toFixed(2)}%
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={(fund.returns?.['3Y'] || 0) >= 0 ? 'success.main' : 'error.main'}
                              >
                                {(fund.returns?.['3Y'] || 0).toFixed(2)}%
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" justifyContent="center" gap={1}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    fontSize="small"
                                    color={star <= (fund.rating?.morningstar || 0) ? 'warning' : 'disabled'}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => getFundDetails(fund.schemeCode)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
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
                    startIcon={<Calculate />}
                    onClick={calculateSIP}
                  >
                    Calculate Returns
                  </Button>
                </Box>

                {sipResult && (
                  <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                      Results
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Typography variant="body2">
                        Total Investment: ₹{sipResult.investment.toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        Future Value: ₹{sipResult.futureValue.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        Total Returns: ₹{sipResult.returns.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        Return Percentage: {sipResult.returnPercentage.toFixed(2)}%
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  SIP Benefits
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
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
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <ShowChart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Fund Comparison Tool
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Compare multiple mutual funds side by side to make informed investment decisions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select up to 4 funds to compare their performance, risk, and other metrics
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedFund?.schemeName}</DialogTitle>
        <DialogContent>
          {selectedFund && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Performance
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={navChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="nav" stroke="#1976d2" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Returns
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography variant="body2">
                    1 Year: {selectedFund.returns?.['1Y']?.toFixed(2)}%
                  </Typography>
                  <Typography variant="body2">
                    3 Year: {selectedFund.returns?.['3Y']?.toFixed(2)}%
                  </Typography>
                  <Typography variant="body2">
                    5 Year: {selectedFund.returns?.['5Y']?.toFixed(2)}%
                  </Typography>
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
