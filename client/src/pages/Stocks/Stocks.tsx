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
  Pagination,
  Skeleton,
} from '@mui/material';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Refresh,
  Star,
  StarBorder,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ListSkeleton } from '../../components/Skeletons/Skeletons';

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

const headCellSx = {
  background: 'var(--fh-table-head)',
  color: 'var(--fh-text-2)',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
} as const;

/** Low-value columns hidden on phones. */
const hideOnXs = { display: { xs: 'none', sm: 'table-cell' } } as const;

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
  const gainers = displayStocks.filter(stock => stock.change > 0).slice(0, 3);
  const losers = displayStocks.filter(stock => stock.change < 0).slice(0, 3);

  const renderMovers = (title: string, list: Stock[], positive: boolean) => (
    isLoading ? (
      <ListSkeleton rows={3} />
    ) : (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            {positive ? <TrendingUp sx={{ color: 'var(--fh-up)' }} /> : <TrendingDown sx={{ color: 'var(--fh-down)' }} />}
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--fh-text)' }}>{title}</Typography>
          </Box>
          {list.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'var(--fh-muted)', py: 1 }}>No data</Typography>
          ) : list.map((stock) => (
            <Box
              key={stock.symbol}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
              sx={{ py: 1, borderBottom: '1px solid rgba(148,163,184,0.08)', '&:last-of-type': { borderBottom: 'none' } }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--fh-text)' }}>{stock.symbol}</Typography>
                <Typography variant="caption" noWrap component="div" sx={{ color: 'var(--fh-muted)' }}>{stock.name}</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: positive ? 'var(--fh-up)' : 'var(--fh-down)', flexShrink: 0 }}>
                {positive ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    )
  );

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
            Stocks
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)', mt: 0.5 }}>
            Search stocks, track movers and build your watchlist
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          <Chip
            label={market === 'indian' ? 'Indian Market' : 'US Market'}
            color={market === 'indian' ? 'warning' : 'primary'}
            onClick={() => setMarket(market === 'indian' ? 'us' : 'indian')}
            clickable
          />
          <IconButton onClick={fetchStocks} color="primary" disabled={isLoading} aria-label="Refresh">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" gap={{ xs: 1.5, sm: 2 }} mb={3} flexDirection={{ xs: 'column', sm: 'row' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search stocks..."
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
                <Table size="small" sx={{ minWidth: { xs: 420, sm: 680 } }}>
                  <TableHead>
                    <TableRow sx={{ '&:hover': { background: 'transparent' } }}>
                      <TableCell sx={headCellSx}>Symbol</TableCell>
                      <TableCell sx={headCellSx}>Name</TableCell>
                      <TableCell sx={headCellSx} align="right">Price</TableCell>
                      <TableCell sx={headCellSx} align="right">Change</TableCell>
                      <TableCell sx={{ ...headCellSx, ...hideOnXs }} align="right">Market Cap</TableCell>
                      <TableCell sx={{ ...headCellSx, ...hideOnXs }} align="right">Volume</TableCell>
                      <TableCell sx={headCellSx} align="center">Watchlist</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, r) => (
                        <TableRow key={r}>
                          {Array.from({ length: 7 }).map((__, c) => (
                            <TableCell key={c} sx={c === 4 || c === 5 ? hideOnXs : undefined}>
                              <Skeleton variant="text" sx={{ fontSize: '0.9rem', width: c === 1 ? '80%' : '60%', ml: c >= 2 && c <= 5 ? 'auto' : 0 }} />
                              {c < 2 && <Skeleton variant="text" sx={{ fontSize: '0.7rem', width: '40%' }} />}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : displayStocks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'var(--fh-text-3)' }}>
                          No stocks found
                        </TableCell>
                      </TableRow>
                    ) : displayStocks.map((stock) => (
                      <TableRow key={stock.symbol} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--fh-text)' }}>
                            {stock.symbol}
                          </Typography>
                          <Chip
                            label={stock.country === 'IN' ? 'IN' : 'US'}
                            size="small"
                            color={stock.country === 'IN' ? 'warning' : 'primary'}
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" noWrap sx={{ color: 'var(--fh-text-2)' }} title={stock.name}>
                            {stock.name}
                          </Typography>
                          {stock.sector && (
                            <Typography variant="caption" noWrap component="div" sx={{ color: 'var(--fh-muted)' }}>
                              {stock.sector}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--fh-text)' }}>
                            {formatCurrency(stock.currentPrice, stock.country === 'IN' ? 'INR' : 'USD')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                            {stock.change >= 0 ? (
                              <TrendingUp sx={{ color: 'var(--fh-up)' }} fontSize="small" />
                            ) : (
                              <TrendingDown sx={{ color: 'var(--fh-down)' }} fontSize="small" />
                            )}
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: stock.change >= 0 ? 'var(--fh-up)' : 'var(--fh-down)', whiteSpace: 'nowrap' }}
                            >
                              {stock.change >= 0 ? '+' : ''}
                              {stock.changePercent.toFixed(2)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={hideOnXs}>
                          <Typography variant="body2" sx={{ color: 'var(--fh-text-2)' }}>
                            {formatMarketCap(stock.marketCap)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={hideOnXs}>
                          <Typography variant="body2" sx={{ color: 'var(--fh-text-2)' }}>
                            {formatMarketCap(stock.volume)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            onClick={() => toggleWatchlist(stock.symbol)}
                            size="small"
                            sx={{ color: watchlist.includes(stock.symbol) ? 'var(--fh-warn)' : 'var(--fh-muted)' }}
                            aria-label="Toggle watchlist"
                          >
                            {watchlist.includes(stock.symbol) ? (
                              <Star fontSize="small" />
                            ) : (
                              <StarBorder fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {renderMovers('Top Gainers', gainers, true)}
        </Grid>

        <Grid item xs={12} md={6}>
          {renderMovers('Top Losers', losers, false)}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Stocks;
