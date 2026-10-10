import React, { useEffect, useState } from 'react';
import {
  Box, Button, Typography, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell,
  Alert, IconButton, Tooltip, TextField, Link, Skeleton, TableContainer,
  useMediaQuery, useTheme,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SyncIcon from '@mui/icons-material/Sync';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  dayChange: number;
  dayChangePercent: number;
  exchange: string;
  value: number;
}

interface Props {
  onSynced?: (portfolioId: string) => void;
}

const DhanConnect: React.FC<Props> = ({ onSynced }) => {
  const [status, setStatus]         = useState<{ configured: boolean; connected: boolean } | null>(null);
  const [holdings, setHoldings]     = useState<Holding[]>([]);
  const [summary, setSummary]       = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [showHoldings, setShowHoldings] = useState(false);
  const [showConnect, setShowConnect]   = useState(false);
  const [accessToken, setAccessToken]   = useState('');
  const [clientId, setClientId]         = useState('');
  const [error, setError]           = useState('');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/dhan/status');
      setStatus(res.data);
    } catch { setStatus({ configured: false, connected: false }); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleConnect = async () => {
    if (!accessToken.trim() || !clientId.trim()) {
      setError('Both access token and client ID are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/dhan/connect', {
        accessToken: accessToken.trim(),
        clientId: clientId.trim(),
      });
      toast.success('Dhan connected successfully!');
      setShowConnect(false);
      setAccessToken('');
      setClientId('');
      await fetchStatus();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to connect to Dhan');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post('/api/dhan/disconnect');
      setStatus(s => s ? { ...s, connected: false } : s);
      setHoldings([]);
      setSummary(null);
      toast.success('Disconnected from Dhan');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to disconnect from Dhan');
    }
  };

  const handleFetchHoldings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/dhan/holdings');
      setHoldings(res.data.holdings || []);
      setSummary(res.data.summary);
      setShowHoldings(true);
    } catch (err: any) {
      if (err?.response?.data?.needsAuth) {
        setStatus(s => s ? { ...s, connected: false } : s);
        setError('Session expired. Please reconnect to Dhan.');
      } else {
        setError(err?.response?.data?.message || 'Failed to fetch holdings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post('/api/dhan/sync-portfolio');
      toast.success(`Synced ${res.data.holdingsCount} holdings to portfolio!`);
      setShowHoldings(false);
      onSynced?.(res.data.portfolioId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (!status) {
    return (
      <Box
        sx={{
          p: 2.5, borderRadius: '14px', background: 'var(--fh-surface-2)',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="rounded" width={40} height={40} />
          <Box>
            <Skeleton variant="text" width={48} sx={{ fontSize: '0.9rem' }} />
            <Skeleton variant="rounded" width={84} height={18} />
          </Box>
        </Box>
        <Skeleton variant="rounded" width={130} height={32} sx={{ ml: 'auto' }} />
      </Box>
    );
  }

  const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0';
  const fmtCr = (n: number) => {
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
    if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
    return `₹${fmt(n)}`;
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          p: 2.5,
          borderRadius: '14px',
          background: 'var(--fh-surface-2)',
          border: status.connected
            ? '1px solid rgba(16,185,129,0.3)'
            : '1px solid rgba(99,102,241,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        {/* Logo area */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            background: status.connected
              ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: status.connected ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AccountBalanceIcon sx={{ color: status.connected ? 'var(--fh-up)' : '#6366f1', fontSize: '1.1rem' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--fh-text)' }}>Dhan</Typography>
            <Chip
              size="small"
              label={status.connected ? 'Connected' : 'Not connected'}
              sx={{
                height: 18, fontSize: '0.65rem', fontWeight: 700,
                background: status.connected ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.1)',
                color: status.connected ? 'var(--fh-up)' : 'var(--fh-text-3)',
                border: status.connected ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(99,102,241,0.2)',
              }}
            />
          </Box>
        </Box>

        {/* Summary chips when connected */}
        {status.connected && summary && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', flex: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'var(--fh-muted)', fontWeight: 600 }}>PORTFOLIO VALUE</Typography>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--fh-text)' }}>{fmtCr(summary.totalValue)}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'var(--fh-muted)', fontWeight: 600 }}>TOTAL P&L</Typography>
              <Typography sx={{
                fontSize: '0.88rem', fontWeight: 700,
                color: summary.totalPnl >= 0 ? 'var(--fh-up)' : 'var(--fh-down)',
              }}>
                {summary.totalPnl >= 0 ? '+' : ''}{fmtCr(summary.totalPnl)} ({summary.pnlPercent >= 0 ? '+' : ''}{summary.pnlPercent?.toFixed(2)}%)
              </Typography>
            </Box>
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
          {status.connected ? (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={loading ? <CircularProgress size={12} /> : <TrendingUpIcon />}
                onClick={handleFetchHoldings}
                disabled={loading}
                sx={{ fontSize: '0.75rem', borderColor: 'rgba(6,182,212,0.4)', color: 'var(--fh-info)', '&:hover': { borderColor: 'var(--fh-info)', background: 'rgba(6,182,212,0.08)' } }}
              >
                View Holdings
              </Button>
              <Tooltip title="Sync to portfolio">
                <Button
                  size="small"
                  variant="contained"
                  startIcon={syncing ? <CircularProgress size={12} color="inherit" /> : <SyncIcon />}
                  onClick={handleSync}
                  disabled={syncing}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Sync
                </Button>
              </Tooltip>
              <Tooltip title="Disconnect Dhan">
                <IconButton size="small" onClick={handleDisconnect} sx={{ color: 'var(--fh-down)' }}>
                  <LinkOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Button
              size="small"
              variant="contained"
              startIcon={<LinkIcon />}
              onClick={() => { setError(''); setShowConnect(true); }}
              sx={{ fontSize: '0.75rem' }}
            >
              Connect Dhan
            </Button>
          )}
        </Box>
      </Box>

      {/* Connect dialog — paste access token + client id */}
      <Dialog
        open={showConnect}
        onClose={() => setShowConnect(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{
          sx: {
            background: 'var(--fh-dialog)',
            border: '1px solid rgba(99,102,241,0.2)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(99,102,241,0.1)', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon sx={{ color: '#6366f1' }} />
            <Typography fontWeight={700}>Connect Dhan</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Alert
            severity="info"
            sx={{ mb: 2.5, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: 'var(--fh-text)' }}
          >
            Generate an access token from{' '}
            <Link href="https://web.dhan.co/" target="_blank" rel="noopener" sx={{ color: 'var(--fh-info)' }}>
              Dhan Web
            </Link>{' '}
            → My Profile → DhanHQ Trading APIs, then paste it below with your Client ID.
          </Alert>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <TextField
            fullWidth
            label="Dhan Client ID"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="e.g. 1100123456"
          />
          <TextField
            fullWidth
            label="Access Token"
            value={accessToken}
            onChange={e => setAccessToken(e.target.value)}
            multiline
            minRows={3}
            placeholder="Paste your Dhan access token (JWT)"
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(99,102,241,0.1)', px: { xs: 2, sm: 3 }, py: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setShowConnect(false)} sx={{ color: 'var(--fh-muted)' }}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
            onClick={handleConnect}
            disabled={loading}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Holdings dialog */}
      <Dialog
        open={showHoldings}
        onClose={() => setShowHoldings(false)}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{
          sx: {
            background: 'var(--fh-dialog)',
            border: '1px solid rgba(99,102,241,0.2)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(99,102,241,0.1)', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon sx={{ color: '#6366f1' }} />
            <Typography fontWeight={700}>Dhan Holdings ({holdings.length})</Typography>
          </Box>
          {summary && (
            <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 3 }, mt: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '0.8rem', color: 'var(--fh-text-3)' }}>
                Value: <strong style={{ color: 'var(--fh-text)' }}>{fmtCr(summary.totalValue)}</strong>
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'var(--fh-text-3)' }}>
                P&L: <strong style={{ color: summary.totalPnl >= 0 ? 'var(--fh-up)' : 'var(--fh-down)' }}>
                  {summary.totalPnl >= 0 ? '+' : ''}{fmtCr(summary.totalPnl)}
                </strong>
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'var(--fh-text-3)' }}>
                Invested: <strong style={{ color: 'var(--fh-text)' }}>{fmtCr(summary.invested)}</strong>
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                {['Symbol', 'Qty', 'Avg Price', 'LTP', 'P&L', 'Day Chg', 'Value'].map(h => (
                  <TableCell key={h} sx={{ whiteSpace: 'nowrap', color: 'var(--fh-text-3)', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {holdings.map(h => (
                <TableRow key={h.symbol}>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--fh-text)' }}>{h.symbol}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: 'var(--fh-muted)' }}>{h.exchange}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'var(--fh-text)' }}>{h.quantity}</TableCell>
                  <TableCell sx={{ color: 'var(--fh-text-3)' }}>₹{fmt(h.averagePrice)}</TableCell>
                  <TableCell sx={{ color: 'var(--fh-text)', fontWeight: 600 }}>₹{fmt(h.currentPrice)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: h.pnl >= 0 ? 'var(--fh-up)' : 'var(--fh-down)' }}>
                      {h.pnl >= 0 ? <TrendingUpIcon sx={{ fontSize: '0.8rem' }} /> : <TrendingDownIcon sx={{ fontSize: '0.8rem' }} />}
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                        {h.pnl >= 0 ? '+' : ''}₹{fmt(h.pnl)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: h.dayChange >= 0 ? 'var(--fh-up)' : 'var(--fh-down)', fontSize: '0.78rem', fontWeight: 600 }}>
                    {h.dayChangePercent >= 0 ? '+' : ''}{h.dayChangePercent?.toFixed(2)}%
                  </TableCell>
                  <TableCell sx={{ color: 'var(--fh-text)', fontWeight: 600 }}>₹{fmt(h.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(99,102,241,0.1)', px: { xs: 2, sm: 3 }, py: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setShowHoldings(false)} sx={{ color: 'var(--fh-muted)' }}>Close</Button>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            Sync to Portfolio
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DhanConnect;
