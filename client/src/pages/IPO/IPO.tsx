import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
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
  Button,
  IconButton,
} from '@mui/material';
import {
  Rocket,
  TrendingUp,
  TrendingDown,
  Refresh,
  Event,
  Assessment,
  Visibility,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface IPO {
  symbol: string;
  companyName: string;
  exchange: string;
  country: string;
  currency: string;
  status: 'upcoming' | 'open' | 'closed' | 'listed' | 'cancelled';
  timeline: {
    openDate?: string;
    closeDate?: string;
    listingDate?: string;
  };
  offering: {
    totalShares: number;
    priceRange?: { min: number; max: number };
    finalPrice?: number;
    totalAmount: number;
  };
  subscription?: {
    retail?: { percentage: number };
    total?: { percentage: number };
  };
  listing?: {
    listingPrice?: number;
    listingGain?: number;
    listingGainPercentage?: number;
    currentPrice?: number;
  };
  analysis?: {
    recommendation: 'subscribe' | 'avoid' | 'neutral';
    rating: number;
    pros: string[];
    cons: string[];
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

const IPO: React.FC = () => {
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [upcomingIPOs, setUpcomingIPOs] = useState<IPO[]>([]);
  const [openIPOs, setOpenIPOs] = useState<IPO[]>([]);
  const [listedIPOs, setListedIPOs] = useState<IPO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedIPO, setSelectedIPO] = useState<IPO | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [market, setMarket] = useState<'both' | 'us' | 'indian'>('both');

  useEffect(() => {
    fetchIPOs();
  }, [market]);

  const fetchIPOs = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/ipo', {
        params: { market }
      });
      const allIPOs = response.data.ipos || [];
      
      setIpos(allIPOs);
      setUpcomingIPOs(allIPOs.filter((ipo: IPO) => ipo.status === 'upcoming'));
      setOpenIPOs(allIPOs.filter((ipo: IPO) => ipo.status === 'open'));
      setListedIPOs(allIPOs.filter((ipo: IPO) => ipo.status === 'listed'));
    } catch (error) {
      toast.error('Failed to fetch IPOs');
    } finally {
      setIsLoading(false);
    }
  };

  const getIPOAnalysis = async (symbol: string) => {
    try {
      const response = await axios.get(`/api/ipo/analysis/${symbol}`);
      setSelectedIPO(response.data.ipo);
      setOpenDialog(true);
    } catch (error) {
      toast.error('Failed to fetch IPO analysis');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'info';
      case 'open': return 'success';
      case 'closed': return 'warning';
      case 'listed': return 'primary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'subscribe': return 'success';
      case 'avoid': return 'error';
      case 'neutral': return 'warning';
      default: return 'default';
    }
  };

  const mockIPOs: IPO[] = [
    {
      symbol: 'TECHIPO',
      companyName: 'Tech Innovators Ltd',
      exchange: 'NSE',
      country: 'IN',
      currency: 'INR',
      status: 'upcoming',
      timeline: {
        openDate: '2024-02-15',
        closeDate: '2024-02-20',
        listingDate: '2024-02-28'
      },
      offering: {
        totalShares: 10000000,
        priceRange: { min: 850, max: 900 },
        totalAmount: 8750000000
      },
      analysis: {
        recommendation: 'subscribe',
        rating: 4,
        pros: ['Strong growth potential', 'Experienced management', 'Growing market'],
        cons: ['High valuation', 'Competitive sector']
      }
    },
    {
      symbol: 'HEALTHIPO',
      companyName: 'Healthcare Solutions Inc',
      exchange: 'NSE',
      country: 'IN',
      currency: 'INR',
      status: 'open',
      timeline: {
        openDate: '2024-01-20',
        closeDate: '2024-01-25',
        listingDate: '2024-02-02'
      },
      offering: {
        totalShares: 5000000,
        priceRange: { min: 1200, max: 1250 },
        totalAmount: 6125000000
      },
      subscription: {
        retail: { percentage: 125 },
        total: { percentage: 145 }
      },
      analysis: {
        recommendation: 'subscribe',
        rating: 4,
        pros: ['Booming healthcare sector', 'Strong financials'],
        cons: ['Rich valuation']
      }
    },
    {
      symbol: 'FINTECHIPO',
      companyName: 'Fintech Solutions Ltd',
      exchange: 'NSE',
      country: 'IN',
      currency: 'INR',
      status: 'listed',
      timeline: {
        listingDate: '2024-01-10'
      },
      offering: {
        totalShares: 6666667,
        finalPrice: 750,
        totalAmount: 5000000000
      },
      listing: {
        listingPrice: 825,
        listingGain: 75,
        listingGainPercentage: 10,
        currentPrice: 890
      },
      analysis: {
        recommendation: 'neutral',
        rating: 3,
        pros: ['First-day listing gains'],
        cons: ['Volatile performance']
      }
    }
  ];

  const displayIPOs = ipos.length > 0 ? ipos : mockIPOs;
  const displayUpcoming = upcomingIPOs.length > 0 ? upcomingIPOs : mockIPOs.filter(ipo => ipo.status === 'upcoming');
  const displayOpen = openIPOs.length > 0 ? openIPOs : mockIPOs.filter(ipo => ipo.status === 'open');
  const displayListed = listedIPOs.length > 0 ? listedIPOs : mockIPOs.filter(ipo => ipo.status === 'listed');

  const mockSubscriptionData = [
    { name: 'Retail', value: 35, color: '#1976d2' },
    { name: 'NII', value: 25, color: '#388e3c' },
    { name: 'QIB', value: 40, color: '#f57c00' },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          IPO
        </Typography>
        <Box display="flex" gap={2}>
          <Chip
            label={market === 'both' ? 'All Markets' : market === 'indian' ? 'Indian' : 'US'}
            color="primary"
            onClick={() => {
              if (market === 'both') setMarket('indian');
              else if (market === 'indian') setMarket('us');
              else setMarket('both');
            }}
            clickable
          />
          <IconButton onClick={fetchIPOs} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Calendar" />
          <Tab label="Upcoming" />
          <Tab label="Open Now" />
          <Tab label="Listed" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Event color="info" />
                  <Typography variant="h6">Upcoming IPOs</Typography>
                </Box>
                <Typography variant="h4" color="primary.main">
                  {displayUpcoming.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Next 30 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Rocket color="success" />
                  <Typography variant="h6">Open IPOs</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {displayOpen.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Currently subscribing
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <TrendingUp color="primary" />
                  <Typography variant="h6">Recent Listings</Typography>
                </Box>
                <Typography variant="h4" color="primary.main">
                  {displayListed.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last 30 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Recent IPO Activity
                </Typography>
                {isLoading ? (
                  <LinearProgress />
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Company</TableCell>
                          <TableCell>Symbol</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Price Range</TableCell>
                          <TableCell>Open Date</TableCell>
                          <TableCell>Recommendation</TableCell>
                          <TableCell align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayIPOs.slice(0, 5).map((ipo) => (
                          <TableRow key={ipo.symbol} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {ipo.companyName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {ipo.exchange}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{ipo.symbol}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={ipo.status}
                                size="small"
                                color={getStatusColor(ipo.status) as any}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {ipo.offering.priceRange ? (
                                <Typography variant="body2">
                                  ₹{ipo.offering.priceRange.min} - ₹{ipo.offering.priceRange.max}
                                </Typography>
                              ) : ipo.offering.finalPrice ? (
                                <Typography variant="body2">
                                  ₹{ipo.offering.finalPrice}
                                </Typography>
                              ) : (
                                <Typography variant="body2">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {ipo.timeline.openDate || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {ipo.analysis && (
                                <Chip
                                  label={ipo.analysis.recommendation}
                                  size="small"
                                  color={getRecommendationColor(ipo.analysis.recommendation) as any}
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => getIPOAnalysis(ipo.symbol)}
                              >
                                <Visibility />
                              </IconButton>
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
          {displayUpcoming.map((ipo) => (
            <Grid item xs={12} md={6} lg={4} key={ipo.symbol}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    {ipo.companyName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {ipo.symbol} • {ipo.exchange}
                  </Typography>
                  
                  <Box display="flex" flexDirection="column" gap={1} mb={2}>
                    <Typography variant="body2">
                      <strong>Price Range:</strong> ₹{ipo.offering.priceRange?.min} - ₹{ipo.offering.priceRange?.max}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Open Date:</strong> {ipo.timeline.openDate}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Close Date:</strong> {ipo.timeline.closeDate}
                    </Typography>
                  </Box>

                  {ipo.analysis && (
                    <Box>
                      <Chip
                        label={ipo.analysis.recommendation}
                        size="small"
                        color={getRecommendationColor(ipo.analysis.recommendation) as any}
                        sx={{ mb: 1 }}
                      />
                      <Box display="flex" gap={0.5}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} style={{ color: star <= ipo.analysis!.rating ? '#ffc107' : '#e0e0e0' }}>
                            ★
                          </span>
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {displayOpen.map((ipo) => (
            <Grid item xs={12} md={6} key={ipo.symbol}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    {ipo.companyName}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Subscription:</strong>
                      </Typography>
                      {ipo.subscription && (
                        <Box mt={1}>
                          <Typography variant="body2">
                            Retail: {ipo.subscription.retail?.percentage}%
                          </Typography>
                          <Typography variant="body2">
                            Total: {ipo.subscription.total?.percentage}%
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    <Grid item xs={6}>
                      <ResponsiveContainer width="100%" height={100}>
                        <PieChart>
                          <Pie
                            data={mockSubscriptionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {mockSubscriptionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                  </Grid>

                  <Box mt={2}>
                    <Button variant="contained" fullWidth>
                      Apply Now
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          {displayListed.map((ipo) => (
            <Grid item xs={12} md={6} key={ipo.symbol}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    {ipo.companyName}
                  </Typography>
                  
                  {ipo.listing && (
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Typography variant="body2">
                        <strong>Listing Price:</strong> ₹{ipo.listing.listingPrice}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Current Price:</strong> ₹{ipo.listing.currentPrice}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        <strong>Listing Gain:</strong> +{ipo.listing.listingGainPercentage}%
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedIPO?.companyName}</DialogTitle>
        <DialogContent>
          {selectedIPO && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  IPO Details
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography variant="body2">
                    <strong>Symbol:</strong> {selectedIPO.symbol}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Exchange:</strong> {selectedIPO.exchange}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Total Issue Size:</strong> ₹{(selectedIPO.offering.totalAmount / 10000000).toFixed(1)} Cr
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Analysis
                </Typography>
                {selectedIPO.analysis && (
                  <Box>
                    <Chip
                      label={selectedIPO.analysis.recommendation}
                      color={getRecommendationColor(selectedIPO.analysis.recommendation) as any}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" gutterBottom>
                      <strong>Pros:</strong>
                    </Typography>
                    <ul>
                      {selectedIPO.analysis.pros.map((pro, index) => (
                        <li key={index}>{pro}</li>
                      ))}
                    </ul>
                    <Typography variant="body2" gutterBottom>
                      <strong>Cons:</strong>
                    </Typography>
                    <ul>
                      {selectedIPO.analysis.cons.map((con, index) => (
                        <li key={index}>{con}</li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default IPO;
