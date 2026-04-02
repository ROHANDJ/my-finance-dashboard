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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Refresh,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Portfolio {
  _id: string;
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

const Portfolio: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
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
      setOpenDialog(false);
      setNewPortfolioName('');
      toast.success('Portfolio created successfully');
    } catch (error) {
      toast.error('Failed to create portfolio');
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

  const mockAllocationData = [
    { name: 'Technology', value: 35, color: '#1976d2' },
    { name: 'Healthcare', value: 25, color: '#388e3c' },
    { name: 'Finance', value: 20, color: '#f57c00' },
    { name: 'Energy', value: 15, color: '#d32f2f' },
    { name: 'Others', value: 5, color: '#7b1fa2' },
  ];

  const mockPerformanceData = [
    { date: 'Jan', value: 45000 },
    { date: 'Feb', value: 48000 },
    { date: 'Mar', value: 46500 },
    { date: 'Apr', value: 52000 },
    { date: 'May', value: 58000 },
    { date: 'Jun', value: 62000 },
  ];

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Portfolio
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Portfolio
        </Typography>
        <Box display="flex" gap={2}>
          <IconButton onClick={fetchPortfolios} color="primary">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            New Portfolio
          </Button>
        </Box>
      </Box>

      {selectedPortfolio ? (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Value
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {formatCurrency(selectedPortfolio.performance.currentValue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Returns
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={600}
                  color={selectedPortfolio.performance.totalReturns >= 0 ? 'success.main' : 'error.main'}
                >
                  {selectedPortfolio.performance.totalReturns >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(selectedPortfolio.performance.totalReturns))}
                </Typography>
                <Typography
                  variant="body2"
                  color={selectedPortfolio.performance.totalReturnsPercentage >= 0 ? 'success.main' : 'error.main'}
                >
                  {selectedPortfolio.performance.totalReturnsPercentage >= 0 ? '+' : ''}
                  {selectedPortfolio.performance.totalReturnsPercentage.toFixed(2)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Day Change
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={600}
                  color={selectedPortfolio.performance.dayChange >= 0 ? 'success.main' : 'error.main'}
                >
                  {selectedPortfolio.performance.dayChange >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(selectedPortfolio.performance.dayChange))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Holdings
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {selectedPortfolio.holdings.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Performance
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#1976d2"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Allocation
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockAllocationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                  {mockAllocationData.map((item) => (
                    <Chip
                      key={item.name}
                      label={`${item.name}: ${item.value}%`}
                      size="small"
                      sx={{ backgroundColor: item.color, color: 'white' }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Holdings
                </Typography>
                {selectedPortfolio.holdings.slice(0, 5).map((holding, index) => (
                  <Box
                    key={index}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={2}
                    borderRadius={1}
                    sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        {holding.symbol}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {holding.quantity} shares @ {formatCurrency(holding.averagePrice)}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(holding.quantity * holding.currentPrice)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(holding.currentPrice)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <AccountBalance sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Portfolio Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Create your first portfolio to start tracking your investments
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
            >
              Create Portfolio
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
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
            sx={{ mt: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={createPortfolio} variant="contained">Create</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Portfolio;
