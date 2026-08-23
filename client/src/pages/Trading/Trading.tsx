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
  LinearProgress,
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
  LinkOff,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Order {
  orderId: string;
  symbol: string;
  exchange: string;
  transactionType: 'BUY' | 'SELL';
  orderType: string;
  quantity: number;
  price: number;
  filledQty?: number;
  averagePrice?: number;
  status: string;
  statusMessage?: string;
  placedAt: string;
}

interface Position {
  symbol: string;
  exchange: string;
  product: string;
  quantity: number;
  buyPrice: number;
  ltp: number;
  pnl: number;
  value: number;
}

interface Holding {
  symbol: string;
  name: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  dayChange: number;
  dayChangePercent: number;
  value: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box>{children}</Box>}
  </div>
);

const Trading: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [holdings, setHoldings]   = useState<Holding[]>([]);
  const [funds, setFunds]         = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabValue, setTabValue]   = useState(0);
  const [needsDhan, setNeedsDhan] = useState(false);

  const [orderForm, setOrderForm] = useState({
    symbol: '',
    exchange: 'NSE_EQ',
    transactionType: 'BUY' as 'BUY' | 'SELL',
    orderType: 'LIMIT' as string,
    quantity: '',
    price: '',
    triggerPrice: '',
    product: 'CNC' as string,
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    setNeedsDhan(false);
    try {
      const [ordersRes, positionsRes, holdingsRes, fundsRes] = await Promise.allSettled([
        axios.get('/api/trading/orders'),
        axios.get('/api/trading/positions'),
        axios.get('/api/trading/holdings'),
        axios.get('/api/trading/margins'),
      ]);

      // Check if any returned needsAuth
      const anyNeedsAuth = [ordersRes, positionsRes, holdingsRes, fundsRes].some(r =>
        r.status === 'rejected' && (r.reason?.response?.data?.needsAuth || r.reason?.response?.status === 401)
      );
      if (anyNeedsAuth) { setNeedsDhan(true); return; }

      if (ordersRes.status === 'fulfilled')    setOrders(ordersRes.value.data.orders || []);
      if (positionsRes.status === 'fulfilled') setPositions(positionsRes.value.data.positions || []);
      if (holdingsRes.status === 'fulfilled')  setHoldings(holdingsRes.value.data.holdings || []);
      if (fundsRes.status === 'fulfilled')     setFunds(fundsRes.value.data);
    } catch {
      setNeedsDhan(true);
    } finally {
      setIsLoading(false);
    }
  };

  const placeOrder = async (side: 'BUY' | 'SELL') => {
    if (!orderForm.symbol || !orderForm.quantity) {
      toast.error('Symbol and quantity are required');
      return;
    }
    try {
      await axios.post('/api/trading/order', {
        ...orderForm,
        transactionType: side,
        quantity: parseInt(orderForm.quantity),
        price: parseFloat(orderForm.price) || 0,
        triggerPrice: parseFloat(orderForm.triggerPrice) || 0,
      });
      toast.success('Order placed successfully');
      setOrderForm(f => ({ ...f, symbol: '', quantity: '', price: '', triggerPrice: '' }));
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await axios.delete(`/api/trading/order/${orderId}`);
      toast.success('Order cancelled');
      fetchAll();
    } catch {
      toast.error('Failed to cancel order');
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n || 0);

  const totalPnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);

  // ── Not connected banner ────────────────────────────────────────────────
  if (!isLoading && needsDhan) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} mb={3}>Trading</Typography>
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <LinkOff sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>Dhan Not Connected</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Connect your Dhan account to view live orders, positions, holdings and place trades.
            </Typography>
            <Button
              variant="contained"
              startIcon={<SwapHoriz />}
              onClick={() => navigate('/portfolio')}
            >
              Connect Dhan on Portfolio Page
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} mb={3}>Trading</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>Trading</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Chip label="Dhan Connected" color="success" variant="outlined" size="small" />
          <IconButton onClick={fetchAll} color="primary"><Refresh /></IconButton>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Dashboard" />
          <Tab label={`Orders (${orders.length})`} />
          <Tab label={`Positions (${positions.length})`} />
          <Tab label={`Holdings (${holdings.length})`} />
          <Tab label="Funds" />
        </Tabs>
      </Box>

      {/* ── Dashboard ──────────────────────────────────────────────────── */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {funds && (
            <>
              <Grid item xs={12} sm={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Available Funds</Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {fmt(funds.equity?.available_margin ?? funds.available_margin ?? 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Used Margin</Typography>
                    <Typography variant="h5" fontWeight={700} color="warning.main">
                      {fmt(funds.equity?.used_margin ?? funds.used_margin ?? 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Day P&amp;L</Typography>
                <Typography
                  variant="h5" fontWeight={700}
                  color={totalPnl >= 0 ? 'success.main' : 'error.main'}
                >
                  {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Open Positions</Typography>
                <Typography variant="h5" fontWeight={700}>{positions.length}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick order form */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Quick Order</Typography>
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField
                      fullWidth size="small" label="Symbol"
                      value={orderForm.symbol}
                      onChange={e => setOrderForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Exchange</InputLabel>
                      <Select value={orderForm.exchange} label="Exchange"
                        onChange={e => setOrderForm(f => ({ ...f, exchange: e.target.value }))}>
                        <MenuItem value="NSE_EQ">NSE</MenuItem>
                        <MenuItem value="BSE_EQ">BSE</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3} md={1}>
                    <TextField
                      fullWidth size="small" label="Qty" type="number"
                      value={orderForm.quantity}
                      onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Order Type</InputLabel>
                      <Select value={orderForm.orderType} label="Order Type"
                        onChange={e => setOrderForm(f => ({ ...f, orderType: e.target.value }))}>
                        <MenuItem value="MARKET">Market</MenuItem>
                        <MenuItem value="LIMIT">Limit</MenuItem>
                        <MenuItem value="SL">Stop Loss</MenuItem>
                        <MenuItem value="SL-M">SL-Market</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  {orderForm.orderType !== 'MARKET' && orderForm.orderType !== 'SL-M' && (
                    <Grid item xs={6} sm={3} md={2}>
                      <TextField
                        fullWidth size="small" label="Price" type="number"
                        value={orderForm.price}
                        onChange={e => setOrderForm(f => ({ ...f, price: e.target.value }))}
                      />
                    </Grid>
                  )}
                  {(orderForm.orderType === 'SL' || orderForm.orderType === 'SL-M') && (
                    <Grid item xs={6} sm={3} md={2}>
                      <TextField
                        fullWidth size="small" label="Trigger Price" type="number"
                        value={orderForm.triggerPrice}
                        onChange={e => setOrderForm(f => ({ ...f, triggerPrice: e.target.value }))}
                      />
                    </Grid>
                  )}
                  <Grid item xs={6} sm={3} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Product</InputLabel>
                      <Select value={orderForm.product} label="Product"
                        onChange={e => setOrderForm(f => ({ ...f, product: e.target.value }))}>
                        <MenuItem value="CNC">CNC (Delivery)</MenuItem>
                        <MenuItem value="INTRADAY">Intraday</MenuItem>
                        <MenuItem value="CO">Cover Order</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box display="flex" gap={1}>
                      <Button
                        variant="contained" color="success" fullWidth
                        startIcon={<Add />}
                        onClick={() => placeOrder('BUY')}
                      >
                        BUY
                      </Button>
                      <Button
                        variant="contained" color="error" fullWidth
                        startIcon={<Remove />}
                        onClick={() => placeOrder('SELL')}
                      >
                        SELL
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Orders ─────────────────────────────────────────────────────── */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Today's Orders</Typography>
            {orders.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>No orders today</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Order ID', 'Symbol', 'Side', 'Type', 'Qty', 'Price', 'Filled', 'Status', 'Action'].map(h => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map(o => (
                      <TableRow key={o.orderId} hover>
                        <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>{o.orderId?.slice(-8)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>{o.symbol}</Typography>
                          <Typography sx={{ fontSize: '0.68rem', color: '#64748b' }}>{o.exchange}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={o.transactionType} size="small"
                            sx={{
                              background: o.transactionType === 'BUY' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                              color: o.transactionType === 'BUY' ? '#10b981' : '#f43f5e',
                              fontWeight: 700, fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{o.orderType}</TableCell>
                        <TableCell>{o.quantity}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{o.price > 0 ? fmt(o.price) : 'MKT'}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{o.filledQty ?? '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={o.status} size="small"
                            sx={{
                              fontSize: '0.65rem', fontWeight: 700,
                              background:
                                o.status === 'complete' ? 'rgba(16,185,129,0.15)' :
                                o.status === 'open' || o.status === 'trigger pending' ? 'rgba(245,158,11,0.15)' :
                                'rgba(148,163,184,0.1)',
                              color:
                                o.status === 'complete' ? '#10b981' :
                                o.status === 'open' || o.status === 'trigger pending' ? '#f59e0b' :
                                '#94a3b8',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {(o.status === 'open' || o.status === 'trigger pending') && (
                            <Button size="small" color="error" variant="outlined"
                              onClick={() => cancelOrder(o.orderId)}
                              sx={{ fontSize: '0.7rem', py: 0 }}
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

      {/* ── Positions ──────────────────────────────────────────────────── */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>Intraday Positions</Typography>
              <Typography variant="body2" color={totalPnl >= 0 ? 'success.main' : 'error.main'} fontWeight={700}>
                Day P&amp;L: {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
              </Typography>
            </Box>
            {positions.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>No open positions</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Symbol', 'Product', 'Qty', 'Buy Avg', 'LTP', 'P&L', 'Value'].map(h => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {positions.map((p, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>{p.symbol}</Typography>
                          <Typography sx={{ fontSize: '0.68rem', color: '#64748b' }}>{p.exchange}</Typography>
                        </TableCell>
                        <TableCell><Chip label={p.product} size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} /></TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{fmt(p.buyPrice)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 700 }}>{fmt(p.ltp)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: p.pnl >= 0 ? '#10b981' : '#f43f5e' }}>
                            {p.pnl >= 0 ? <TrendingUp sx={{ fontSize: '0.9rem' }} /> : <TrendingDown sx={{ fontSize: '0.9rem' }} />}
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                              {p.pnl >= 0 ? '+' : ''}{fmt(p.pnl)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{fmt(p.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── Holdings ───────────────────────────────────────────────────── */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Long-term Holdings</Typography>
            {holdings.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>No holdings</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Symbol', 'Qty', 'Avg Price', 'LTP', 'P&L', 'Day Chg', 'Value'].map(h => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {holdings.map((h, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>{h.symbol}</Typography>
                          <Typography sx={{ fontSize: '0.68rem', color: '#64748b' }}>{h.exchange}</Typography>
                        </TableCell>
                        <TableCell>{h.quantity}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>₹{h.averagePrice?.toFixed(2)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 700 }}>₹{h.currentPrice?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: h.pnl >= 0 ? '#10b981' : '#f43f5e' }}>
                            {h.pnl >= 0 ? '+' : ''}{fmt(h.pnl)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: h.dayChange >= 0 ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                          {h.dayChangePercent >= 0 ? '+' : ''}{h.dayChangePercent?.toFixed(2)}%
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{fmt(h.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── Funds ──────────────────────────────────────────────────────── */}
      <TabPanel value={tabValue} index={4}>
        {funds ? (
          <Grid container spacing={3}>
            {Object.entries(funds).map(([segment, data]: [string, any]) => {
              if (typeof data !== 'object' || data === null) return null;
              return (
                <Grid item xs={12} md={6} key={segment}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ textTransform: 'capitalize' }}>
                        {segment} Segment
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1.5}>
                        {Object.entries(data).map(([k, v]) => (
                          <Box key={k} display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {k.replace(/_/g, ' ')}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {typeof v === 'number' ? fmt(v as number) : String(v)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography color="text.secondary" textAlign="center" py={4}>No funds data</Typography>
        )}
      </TabPanel>
    </Box>
  );
};

export default Trading;
