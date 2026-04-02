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
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  SwapHoriz,
  Refresh,
  Add,
  Remove,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Timeline,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Order {
  orderId: string;
  symbol: string;
  exchange: string;
  transactionType: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'SL';
  quantity: number;
  price: number;
      status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  orderTimestamp: string;
}

interface Position {
  symbol: string;
  exchange: string;
      product: 'CNC' | 'NRML' | 'MIS';
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
}

interface Holding {
  symbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
}

interface Margin {
  equity: {
    used: number;
    available: number;
    net: number;
  };
  commodity: {
    used: number;
    available: number;
    net: number;
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

const Trading: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [margins, setMargins] = useState<Margin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  
  // Order form state
  const [orderForm, setOrderForm] = useState({
    symbol: '',
    exchange: 'NSE',
    transactionType: 'BUY' as 'BUY' | 'SELL',
    orderType: 'LIMIT' as 'MARKET' | 'LIMIT' | 'SL',
    quantity: '',
    price: '',
    product: 'CNC' as 'CNC' | 'NRML' | 'MIS',
  });

  useEffect(() => {
    fetchTradingData();
  }, []);

  const fetchTradingData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, positionsRes, holdingsRes, marginsRes] = await Promise.all([
        axios.get('/api/trading/orders'),
        axios.get('/api/trading/positions'),
        axios.get('/api/trading/holdings'),
        axios.get('/api/trading/margins'),
      ]);

      setOrders(ordersRes.data.orders || []);
      setPositions(positionsRes.data.positions || []);
      setHoldings(holdingsRes.data.holdings || []);
      setMargins(marginsRes.data.margins || null);
      setIsConnected(true);
    } catch (error) {
      console.error('Trading data fetch error:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const connectTrading = async () => {
    try {
      await axios.post('/api/trading/connect', {
        apiKey: 'demo_key',
        accessToken: 'demo_token'
      });
      setIsConnected(true);
      toast.success('Trading account connected successfully');
      fetchTradingData();
    } catch (error) {
      toast.error('Failed to connect trading account');
    }
  };

  const placeOrder = async () => {
    if (!orderForm.symbol || !orderForm.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post('/api/trading/order', {
        ...orderForm,
        quantity: parseInt(orderForm.quantity),
        price: orderForm.orderType === 'MARKET' ? 0 : parseFloat(orderForm.price),
      });

      toast.success('Order placed successfully');
      setOpenOrderDialog(false);
      setOrderForm({
        symbol: '',
        exchange: 'NSE',
        transactionType: 'BUY',
        orderType: 'LIMIT',
        quantity: '',
        price: '',
        product: 'CNC',
      });
      fetchTradingData();
    } catch (error) {
      toast.error('Failed to place order');
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await axios.delete(`/api/trading/order/${orderId}`);
      toast.success('Order cancelled successfully');
      fetchTradingData();
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const mockOrders: Order[] = [
    {
      orderId: 'ORD001',
      symbol: 'RELIANCE',
      exchange: 'NSE',
      transactionType: 'BUY',
      orderType: 'LIMIT',
      quantity: 10,
      price: 2850,
      status: 'COMPLETED',
      orderTimestamp: '2024-01-08T10:30:00Z',
    },
    {
      orderId: 'ORD002',
      symbol: 'TCS',
      exchange: 'NSE',
      transactionType: 'BUY',
      orderType: 'MARKET',
      quantity: 5,
      price: 3450,
      status: 'PENDING',
      orderTimestamp: '2024-01-08T11:15:00Z',
    },
  ];

  const mockPositions: Position[] = [
    {
      symbol: 'RELIANCE',
      exchange: 'NSE',
      product: 'CNC',
      quantity: 10,
      averagePrice: 2850,
      lastPrice: 2875,
      pnl: 250,
    },
    {
      symbol: 'TCS',
      exchange: 'NSE',
      product: 'NRML',
      quantity: 5,
      averagePrice: 3450,
      lastPrice: 3435,
      pnl: -75,
    },
  ];

  const mockHoldings: Holding[] = [
    {
      symbol: 'HDFCBANK',
      exchange: 'NSE',
      quantity: 20,
      averagePrice: 1650,
      lastPrice: 1670,
      pnl: 400,
    },
    {
      symbol: 'INFY',
      exchange: 'NSE',
      quantity: 15,
      averagePrice: 1450,
      lastPrice: 1460,
      pnl: 150,
    },
  ];

  const mockMargins: Margin = {
    equity: {
      used: 50000,
      available: 150000,
      net: 200000,
    },
    commodity: {
      used: 0,
      available: 50000,
      net: 50000,
    },
  };

  const displayOrders = orders.length > 0 ? orders : mockOrders;
  const displayPositions = positions.length > 0 ? positions : mockPositions;
  const displayHoldings = holdings.length > 0 ? holdings : mockHoldings;
  const displayMargins = margins || mockMargins;

  const mockChartData = [
    { time: '09:15', price: 2850 },
    { time: '10:00', price: 2860 },
    { time: '10:30', price: 2855 },
    { time: '11:00', price: 2870 },
    { time: '11:30', price: 2875 },
    { time: '12:00', price: 2872 },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Trading
        </Typography>
        <Box display="flex" gap={2}>
          <Chip
            label={isConnected ? 'Connected' : 'Not Connected'}
            color={isConnected ? 'success' : 'error'}
            variant="outlined"
          />
          <Button
            variant="contained"
            startIcon={<SwapHoriz />}
            onClick={connectTrading}
            disabled={isConnected}
          >
            {isConnected ? 'Connected' : 'Connect Account'}
          </Button>
          <IconButton onClick={fetchTradingData} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please connect your trading account to start live trading. This is a demo mode.
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Dashboard" />
          <Tab label="Orders" />
          <Tab label="Positions" />
          <Tab label="Holdings" />
          <Tab label="Margins" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Available Margin
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {formatCurrency(displayMargins.equity.available)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Used Margin
                </Typography>
                <Typography variant="h5" fontWeight={600} color="warning.main">
                  {formatCurrency(displayMargins.equity.used)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total P&L
                </Typography>
                <Typography variant="h5" fontWeight={600} color="success.main">
                  +{formatCurrency(displayPositions.reduce((sum, pos) => sum + pos.pnl, 0))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Active Positions
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {displayPositions.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Quick Order
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Symbol"
                      value={orderForm.symbol}
                      onChange={(e) => setOrderForm({...orderForm, symbol: e.target.value.toUpperCase()})}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Exchange</InputLabel>
                      <Select
                        value={orderForm.exchange}
                        onChange={(e) => setOrderForm({...orderForm, exchange: e.target.value})}
                      >
                        <MenuItem value="NSE">NSE</MenuItem>
                        <MenuItem value="BSE">BSE</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Price"
                      type="number"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
                      disabled={orderForm.orderType === 'MARKET'}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Order Type</InputLabel>
                      <Select
                        value={orderForm.orderType}
                        onChange={(e) => setOrderForm({...orderForm, orderType: e.target.value as any})}
                      >
                        <MenuItem value="MARKET">Market</MenuItem>
                        <MenuItem value="LIMIT">Limit</MenuItem>
                        <MenuItem value="SL">Stop Loss</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Product</InputLabel>
                      <Select
                        value={orderForm.product}
                        onChange={(e) => setOrderForm({...orderForm, product: e.target.value as any})}
                      >
                        <MenuItem value="CNC">CNC</MenuItem>
                        <MenuItem value="NRML">NRML</MenuItem>
                        <MenuItem value="MIS">MIS</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" gap={2}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<Add />}
                        fullWidth
                        onClick={() => {
                          setOrderForm({...orderForm, transactionType: 'BUY'});
                          placeOrder();
                        }}
                        disabled={!isConnected}
                      >
                        BUY
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<Remove />}
                        fullWidth
                        onClick={() => {
                          setOrderForm({...orderForm, transactionType: 'SELL'});
                          placeOrder();
                        }}
                        disabled={!isConnected}
                      >
                        SELL
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Recent Activity
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={mockChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="price" stroke="#1976d2" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Orders
            </Typography>
            {isLoading ? (
              <LinearProgress />
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayOrders.map((order) => (
                      <TableRow key={order.orderId} hover>
                        <TableCell>{order.orderId}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {order.symbol}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {order.exchange}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.transactionType}
                            size="small"
                            color={order.transactionType === 'BUY' ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{formatCurrency(order.price)}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            size="small"
                            color={
                              order.status === 'COMPLETED' ? 'success' :
                              order.status === 'PENDING' ? 'warning' : 'error'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {order.status === 'PENDING' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => cancelOrder(order.orderId)}
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Positions
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Avg Price</TableCell>
                    <TableCell>Last Price</TableCell>
                    <TableCell>P&L</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayPositions.map((position, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {position.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={position.product} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{position.quantity}</TableCell>
                      <TableCell>{formatCurrency(position.averagePrice)}</TableCell>
                      <TableCell>{formatCurrency(position.lastPrice)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={position.pnl >= 0 ? 'success.main' : 'error.main'}
                        >
                          {position.pnl >= 0 ? '+' : ''}
                          {formatCurrency(Math.abs(position.pnl))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Holdings
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Avg Price</TableCell>
                    <TableCell>Last Price</TableCell>
                    <TableCell>P&L</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayHoldings.map((holding, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {holding.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>{holding.quantity}</TableCell>
                      <TableCell>{formatCurrency(holding.averagePrice)}</TableCell>
                      <TableCell>{formatCurrency(holding.lastPrice)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={holding.pnl >= 0 ? 'success.main' : 'error.main'}
                        >
                          {holding.pnl >= 0 ? '+' : ''}
                          {formatCurrency(Math.abs(holding.pnl))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Equity Margins
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Available:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(displayMargins.equity.available)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Used:</Typography>
                    <Typography variant="body2" fontWeight={600} color="warning.main">
                      {formatCurrency(displayMargins.equity.used)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Net:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(displayMargins.equity.net)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Commodity Margins
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Available:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(displayMargins.commodity.available)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Used:</Typography>
                    <Typography variant="body2" fontWeight={600} color="warning.main">
                      {formatCurrency(displayMargins.commodity.used)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Net:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(displayMargins.commodity.net)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default Trading;
