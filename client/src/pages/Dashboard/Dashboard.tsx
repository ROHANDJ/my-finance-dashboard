import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  Rocket,
  Refresh,
  Add,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalReturns: number;
  totalReturnsPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
}

interface IPOData {
  symbol: string;
  companyName: string;
  status: string;
  timeline?: { openDate?: string; closeDate?: string; listingDate?: string };
  offering?: { priceRange?: { min: number; max: number }; finalPrice?: number };
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [upcomingIPOs, setUpcomingIPOs] = useState<IPOData[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [marketResponse, portfolioResponse, ipoResponse] = await Promise.all([
        axios.get('/api/stocks/indices'),
        axios.get('/api/portfolio'),
        axios.get('/api/ipo/calendar/upcoming?limit=5')
      ]);

      setMarketData(marketResponse.data.indices || []);
      
      if (portfolioResponse.data.portfolios.length > 0) {
        const portfolio = portfolioResponse.data.portfolios[0];
        setPortfolioSummary({
          totalValue: portfolio.performance.currentValue,
          totalReturns: portfolio.performance.totalReturns,
          totalReturnsPercentage: portfolio.performance.totalReturnsPercentage,
          dayChange: portfolio.performance.dayChange,
          dayChangePercentage: portfolio.performance.dayChangePercentage,
        });
      }

      setUpcomingIPOs(ipoResponse.data.ipos || []);

      // Build chart from real portfolio snapshot (invested vs current)
      if (portfolioResponse.data.portfolios.length > 0) {
        const p = portfolioResponse.data.portfolios[0];
        setChartData([
          { date: 'Invested', value: p.performance.totalInvested },
          { date: 'Current',  value: p.performance.currentValue },
        ]);
      } else {
        setChartData([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} lg={3} key={item}>
              <Card>
                <CardContent>
                  <LinearProgress />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Dashboard
        </Typography>
        <IconButton onClick={fetchDashboardData} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {portfolioSummary && (
          <>
            <Grid item xs={12} sm={6} lg={3}>
              <Card className="portfolio-summary-card">
                <CardContent>
                  <Typography color="white" variant="h6" gutterBottom>
                    Portfolio Value
                  </Typography>
                  <Typography color="white" variant="h4" fontWeight={600}>
                    {formatCurrency(portfolioSummary.totalValue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TrendingUp color="success" />
                    <Typography variant="h6" color="text.secondary">
                      Total Returns
                    </Typography>
                  </Box>
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    color={portfolioSummary.totalReturns >= 0 ? 'success.main' : 'error.main'}
                  >
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
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <ShowChart color="info" />
                    <Typography variant="h6" color="text.secondary">
                      Day Change
                    </Typography>
                  </Box>
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    color={portfolioSummary.dayChange >= 0 ? 'success.main' : 'error.main'}
                  >
                    {portfolioSummary.dayChange >= 0 ? '+' : ''}
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
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccountBalance color="warning" />
                    <Typography variant="h6" color="text.secondary">
                      Holdings
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={600}>
                    15
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active positions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Portfolio Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ fill: '#1976d2' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Market Indices
                </Typography>
                <Tooltip title="Refresh">
                  <IconButton size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" flexDirection="column" gap={2}>
                {marketData.slice(0, 4).map((index) => (
                  <Box
                    key={index.symbol}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={1}
                    borderRadius={1}
                    sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {index.name}
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatCurrency(index.price, 'USD')}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Box display="flex" alignItems="center" gap={1}>
                        {index.change >= 0 ? (
                          <TrendingUp color="success" fontSize="small" />
                        ) : (
                          <TrendingDown color="error" fontSize="small" />
                        )}
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={index.change >= 0 ? 'success.main' : 'error.main'}
                        >
                          {index.change >= 0 ? '+' : ''}
                          {index.changePercent.toFixed(2)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Upcoming IPOs
                </Typography>
                <IconButton onClick={() => navigate('/ipo')} color="primary">
                  <Rocket />
                </IconButton>
              </Box>
              <Box display="flex" flexDirection="column" gap={2}>
                {upcomingIPOs.slice(0, 3).map((ipo) => (
                  <Box
                    key={ipo.symbol}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={2}
                    borderRadius={1}
                    sx={{ backgroundColor: 'grey.50' }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {ipo.companyName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ipo.symbol}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Chip
                        label={ipo.status}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Typography variant="body2" mt={1}>
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Quick Actions
                </Typography>
                <Tooltip title="Add new">
                  <IconButton color="primary">
                    <Add />
                  </IconButton>
                </Tooltip>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'primary.light', color: 'white' },
                    }}
                    onClick={() => navigate('/stocks')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <TrendingUp fontSize="large" />
                      <Typography variant="body2" mt={1}>
                        Browse Stocks
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'primary.light', color: 'white' },
                    }}
                    onClick={() => navigate('/portfolio')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <AccountBalance fontSize="large" />
                      <Typography variant="body2" mt={1}>
                        Portfolio
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'primary.light', color: 'white' },
                    }}
                    onClick={() => navigate('/mutual-funds')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <ShowChart fontSize="large" />
                      <Typography variant="body2" mt={1}>
                        Mutual Funds
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'primary.light', color: 'white' },
                    }}
                    onClick={() => navigate('/trading')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Rocket fontSize="large" />
                      <Typography variant="body2" mt={1}>
                        Trading
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
