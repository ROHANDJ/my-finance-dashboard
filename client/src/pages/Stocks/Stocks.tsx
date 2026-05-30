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
  Pagination,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Add,
  Refresh,
  Star,
  StarBorder,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  sector?: string;
  country: string;
}

const Stocks: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [market, setMarket] = useState<'us' | 'indian'>('indian');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchStocks();
  }, [market, page]);

  const fetchStocks = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/stocks/movers', {
        params: { market, type: 'gainers' }
      });
      setStocks(response.data.movers || []);
    } catch (error) {
      toast.error('Failed to fetch stocks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await axios.get('/api/stocks/search', {
        params: { q: searchQuery, market }
      });
      setStocks(response.data.results || []);
    } catch (error) {
      toast.error('Failed to search stocks');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWatchlist = async (symbol: string) => {
    try {
      if (watchlist.includes(symbol)) {
        await axios.delete(`/api/stocks/watchlist/${symbol}`, {
          params: { market }
        });
        setWatchlist(watchlist.filter(s => s !== symbol));
        toast.success('Removed from watchlist');
      } else {
        await axios.post('/api/stocks/watchlist', { symbol, market });
        setWatchlist([...watchlist, symbol]);
        toast.success('Added to watchlist');
      }
    } catch (error) {
      toast.error('Failed to update watchlist');
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

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return (value / 1e12).toFixed(1) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toString();
  };

  const displayStocks = stocks;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Stocks
        </Typography>
        <Box display="flex" gap={2}>
          <Chip
            label={market === 'indian' ? 'Indian Market' : 'US Market'}
            color={market === 'indian' ? 'warning' : 'primary'}
            onClick={() => setMarket(market === 'indian' ? 'us' : 'indian')}
            clickable
          />
          <IconButton onClick={fetchStocks} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" gap={2} mb={3}>
                <TextField
                  fullWidth
                  placeholder="Search stocks..."
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
                        <TableCell>Symbol</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Change</TableCell>
                        <TableCell align="right">Market Cap</TableCell>
                        <TableCell align="right">Volume</TableCell>
                        <TableCell align="center">Watchlist</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayStocks.map((stock) => (
                        <TableRow key={stock.symbol} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {stock.symbol}
                            </Typography>
                            <Chip
                              label={stock.country === 'IN' ? 'IN' : 'US'}
                              size="small"
                              color={stock.country === 'IN' ? 'warning' : 'primary'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {stock.name}
                            </Typography>
                            {stock.sector && (
                              <Typography variant="caption" color="text.secondary">
                                {stock.sector}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {formatCurrency(stock.currentPrice, stock.country === 'IN' ? 'INR' : 'USD')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                              {stock.change >= 0 ? (
                                <TrendingUp color="success" fontSize="small" />
                              ) : (
                                <TrendingDown color="error" fontSize="small" />
                              )}
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={stock.change >= 0 ? 'success.main' : 'error.main'}
                              >
                                {stock.change >= 0 ? '+' : ''}
                                {stock.changePercent.toFixed(2)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatMarketCap(stock.marketCap)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatMarketCap(stock.volume)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              onClick={() => toggleWatchlist(stock.symbol)}
                              color="primary"
                              size="small"
                            >
                              {watchlist.includes(stock.symbol) ? (
                                <Star />
                              ) : (
                                <StarBorder />
                              )}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Top Gainers
              </Typography>
              {displayStocks
                .filter(stock => stock.change > 0)
                .slice(0, 3)
                .map((stock) => (
                  <Box key={stock.symbol} display="flex" justifyContent="space-between" p={1}>
                    <Typography variant="body2">{stock.symbol}</Typography>
                    <Typography variant="body2" color="success.main">
                      +{stock.changePercent.toFixed(2)}%
                    </Typography>
                  </Box>
                ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Top Losers
              </Typography>
              {displayStocks
                .filter(stock => stock.change < 0)
                .slice(0, 3)
                .map((stock) => (
                  <Box key={stock.symbol} display="flex" justifyContent="space-between" p={1}>
                    <Typography variant="body2">{stock.symbol}</Typography>
                    <Typography variant="body2" color="error.main">
                      {stock.changePercent.toFixed(2)}%
                    </Typography>
                  </Box>
                ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Stocks;
