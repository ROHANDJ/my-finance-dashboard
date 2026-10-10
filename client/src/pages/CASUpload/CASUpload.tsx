import React, { useState, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  CircularProgress, Alert, Chip, Divider, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Grid,
  Accordion, AccordionSummary, AccordionDetails,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  CloudUpload, ExpandMore, AccountBalance, ShowChart,
  CheckCircle, Lock, SaveAlt, InfoOutlined,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { StatCardsSkeleton, TableSkeleton } from '../../components/Skeletons/Skeletons';

const headCellSx = {
  color: 'var(--fh-text-3)',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  whiteSpace: 'nowrap',
  borderBottomColor: 'rgba(148,163,184,0.12)',
} as const;

const bodyCellSx = { borderBottomColor: 'rgba(148,163,184,0.08)' } as const;

const accordionSx = {
  mb: 2,
  borderRadius: '16px !important',
  backgroundColor: 'var(--fh-surface-2)',
  border: '1px solid rgba(148,163,184,0.1)',
  backgroundImage: 'none',
  overflow: 'hidden',
  '&:before': { display: 'none' },
} as const;

interface MFHolding {
  type: string;
  name: string;
  isin: string;
  units: number;
  nav: number;
  value: number;
  currency: string;
}

interface EquityHolding {
  type: string;
  name: string;
  isin: string;
  quantity: number;
  value: number;
  currency: string;
}

interface CASResult {
  success: boolean;
  investor: { name: string; pan: string; email: string; mobile: string };
  dateRange: { from?: string; to?: string };
  summary: {
    totalHoldings: number;
    mutualFundCount: number;
    equityCount: number;
    totalValue: number;
  };
  mutualFunds: MFHolding[];
  equities: EquityHolding[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

interface PortfolioOption {
  id: string;
  name: string;
}

const CASUpload: React.FC = () => {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CASResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to portfolio state
  const [saveOpen, setSaveOpen] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('__new__');
  const [newPortfolioName, setNewPortfolioName] = useState('CAS Import');
  const [saving, setSaving] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') setFile(dropped);
    else toast.error('Please drop a PDF file');
  };

  const handleOpenSave = async () => {
    try {
      const { data } = await axios.get<{ portfolios: PortfolioOption[] }>('/api/portfolio');
      // Exclude the auto-generated demo portfolio so CAS data never mixes with dummy holdings
      const real = (data.portfolios || []).filter(p => !p.id.startsWith('demo_port_'));
      setPortfolios(real);
    } catch {
      setPortfolios([]);
    }
    setSelectedPortfolioId('__new__');
    setSaveOpen(true);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const allHoldings = [...result.mutualFunds, ...result.equities];
      const body: any = { holdings: allHoldings };
      if (selectedPortfolioId === '__new__') {
        body.portfolioName = newPortfolioName || 'CAS Import';
      } else {
        body.portfolioId = selectedPortfolioId;
      }
      await axios.post('/api/portfolio/import-cas', body);
      toast.success('Holdings saved to portfolio!');
      setSaveOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save holdings');
    } finally {
      setSaving(false);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('cas', file);
    if (password) formData.append('password', password);

    try {
      const { data } = await axios.post<CASResult>('/api/cas/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      toast.success(`Parsed ${data.summary.totalHoldings} holdings successfully`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to parse PDF';
      const passwordRequired = err.response?.data?.passwordRequired;
      if (passwordRequired) setNeedsPassword(true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
          Import CAS Portfolio
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--fh-muted)', maxWidth: 820 }}>
          Upload your CDSL/CAMS Consolidated Account Statement to import all your holdings — stocks and mutual funds across all brokers and platforms.
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
      {/* Upload area */}
      <Grid item xs={12} lg={7} xl={8}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box
            role="button"
            tabIndex={0}
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            sx={{
              border: '2px dashed',
              borderColor: file ? 'rgba(16,185,129,0.6)' : 'rgba(99,102,241,0.5)',
              borderRadius: 3,
              p: { xs: 3, sm: 5 },
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: file ? 'rgba(16,185,129,0.06)' : 'rgba(99,102,241,0.05)',
              transition: 'all 0.2s',
              '&:hover, &:focus-visible': {
                bgcolor: file ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                borderColor: file ? 'success.main' : 'primary.main',
                outline: 'none',
              },
            }}
          >
            {file ? (
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} flexWrap="wrap" sx={{ minWidth: 0 }}>
                <CheckCircle color="success" />
                <Typography fontWeight={600} noWrap sx={{ color: 'var(--fh-text)', minWidth: 0, maxWidth: '100%' }}>
                  {file.name}
                </Typography>
                <Chip label={`${(file.size / 1024).toFixed(0)} KB`} size="small" />
              </Box>
            ) : (
              <>
                <CloudUpload sx={{ fontSize: 48, color: 'var(--fh-indigo)', mb: 1 }} />
                <Typography variant="h6" sx={{ color: 'var(--fh-text)' }}>Drop your CAS PDF here</Typography>
                <Typography variant="body2" sx={{ color: 'var(--fh-text-3)' }}>or click to browse</Typography>
              </>
            )}
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
          />

          <TextField
            fullWidth
            label="PDF Password (if protected)"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={needsPassword && !password}
            sx={{ mt: 2 }}
            helperText="Try: PAN uppercase + DOB as DDMMYYYY (e.g. ABCDE1234F01011990) · or just PAN uppercase for some CDSL PDFs"
            InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Box display="flex" gap={1.5} mt={2} flexWrap="wrap">
            <Button
              variant="contained"
              size="large"
              onClick={handleParse}
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CloudUpload />}
            >
              {loading ? 'Parsing...' : 'Parse CAS'}
            </Button>
            {file && (
              <Button variant="outlined" onClick={() => { setFile(null); setResult(null); setError(''); setNeedsPassword(false); }}>
                Clear
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
      </Grid>

      {/* How to get CAS */}
      <Grid item xs={12} lg={5} xl={4}>
        <Card
          sx={{
            height: '100%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(6,182,212,0.06) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <InfoOutlined sx={{ color: 'var(--fh-info)' }} />
              <Typography variant="h6" fontWeight={600}>How to get your CAS PDF</Typography>
            </Box>
            {[
              <>Visit <strong>camsonline.com → Investors → CAS</strong>.</>,
              <>Enter your PAN and registered email address.</>,
              <>You'll receive a password-protected PDF by email.</>,
              <>Password is usually <strong>PAN in uppercase + date of birth (DDMMYYYY)</strong>.</>,
              <>Upload it here, review the parsed holdings, then save them to a portfolio.</>,
            ].map((step, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--fh-indigo-soft)',
                    backgroundColor: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(99,102,241,0.35)',
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="body2" sx={{ color: 'var(--fh-text-2)', '& strong': { color: 'var(--fh-text)' } }}>
                  {step}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      </Grid>

      {/* Parsing placeholder */}
      {loading && (
        <Box>
          <StatCardsSkeleton count={4} />
          <TableSkeleton rows={5} columns={5} />
        </Box>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Investor info */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={1.5}>Investor Details</Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Name', value: result.investor.name },
                  { label: 'PAN', value: result.investor.pan },
                  { label: 'Email', value: result.investor.email },
                  { label: 'Period', value: result.dateRange.from ? `${result.dateRange.from} to ${result.dateRange.to}` : '' },
                ].filter(f => f.value).map(f => (
                  <Grid item xs={12} sm={6} lg={3} key={f.label} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: 'var(--fh-muted)' }}>{f.label}</Typography>
                    <Typography fontWeight={600} noWrap title={f.value} sx={{ color: 'var(--fh-text)' }}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Summary cards */}
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 2 }}>
            {[
              { label: 'Total Value', value: formatCurrency(result.summary.totalValue), color: 'var(--fh-indigo-soft)' },
              { label: 'Total Holdings', value: result.summary.totalHoldings, color: 'var(--fh-text)' },
              { label: 'Mutual Funds', value: result.summary.mutualFundCount, color: 'var(--fh-info)' },
              { label: 'Equities', value: result.summary.equityCount, color: 'var(--fh-up)' },
            ].map(stat => (
              <Grid item xs={6} lg={3} key={stat.label}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" sx={{ color: 'var(--fh-text-3)' }}>{stat.label}</Typography>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      sx={{ color: stat.color, fontSize: { xs: '1.15rem', sm: '1.5rem' }, wordBreak: 'break-word' }}
                    >
                      {stat.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Mutual Funds table */}
          {result.mutualFunds.length > 0 && (
            <Accordion defaultExpanded sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccountBalance sx={{ color: 'var(--fh-info)' }} />
                  <Typography fontWeight={600}>Mutual Funds ({result.mutualFunds.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headCellSx}>Scheme</TableCell>
                        <TableCell sx={{ ...headCellSx, display: { xs: 'none', md: 'table-cell' } }}>ISIN</TableCell>
                        <TableCell sx={{ ...headCellSx, display: { xs: 'none', sm: 'table-cell' } }} align="right">Units</TableCell>
                        <TableCell sx={{ ...headCellSx, display: { xs: 'none', sm: 'table-cell' } }} align="right">NAV</TableCell>
                        <TableCell sx={headCellSx} align="right">Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.mutualFunds.map((mf, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ ...bodyCellSx, maxWidth: { xs: 200, sm: 360, lg: 520 } }}>
                            <Typography variant="body2" noWrap title={mf.name} sx={{ color: 'var(--fh-text)' }}>{mf.name}</Typography>
                          </TableCell>
                          <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="caption" sx={{ color: 'var(--fh-muted)' }}>{mf.isin || '—'}</Typography>
                          </TableCell>
                          <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }} align="right">{mf.units.toFixed(3)}</TableCell>
                          <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }} align="right">₹{mf.nav.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ ...bodyCellSx, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(mf.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Equities table */}
          {result.equities.length > 0 && (
            <Accordion defaultExpanded sx={accordionSx}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ShowChart sx={{ color: 'var(--fh-up)' }} />
                  <Typography fontWeight={600}>Equities ({result.equities.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headCellSx}>Company</TableCell>
                        <TableCell sx={{ ...headCellSx, display: { xs: 'none', md: 'table-cell' } }}>ISIN</TableCell>
                        <TableCell sx={headCellSx} align="right">Qty</TableCell>
                        <TableCell sx={headCellSx} align="right">Market Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.equities.map((eq, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ ...bodyCellSx, maxWidth: { xs: 160, sm: 360, lg: 520 } }}>
                            <Typography variant="body2" noWrap title={eq.name} sx={{ color: 'var(--fh-text)' }}>{eq.name}</Typography>
                          </TableCell>
                          <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="caption" sx={{ color: 'var(--fh-muted)' }}>{eq.isin}</Typography>
                          </TableCell>
                          <TableCell sx={{ ...bodyCellSx, whiteSpace: 'nowrap' }} align="right">{eq.quantity.toLocaleString('en-IN')}</TableCell>
                          <TableCell align="right" sx={{ ...bodyCellSx, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(eq.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}

          {result.summary.totalHoldings === 0 && (
            <Alert severity="warning">
              No holdings were detected. The PDF format may differ from expected. Try the CAMS CAS from camsonline.com, or make sure you're uploading the correct file.
            </Alert>
          )}

          {/* Save to portfolio */}
          {result.summary.totalHoldings > 0 && (
            <Card
              sx={{
                mb: 2,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.08) 100%)',
                border: '1px solid rgba(99,102,241,0.35)',
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={600}>Save to Portfolio</Typography>
                  <Typography variant="body2" sx={{ color: 'var(--fh-text-3)' }}>
                    Import {result.summary.totalHoldings} holdings ({formatCurrency(result.summary.totalValue)}) into your portfolio
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveAlt />}
                  onClick={handleOpenSave}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Save to Portfolio
                </Button>
              </CardContent>
            </Card>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">
            This data is parsed locally. Use "Save to Portfolio" to persist it.
          </Typography>
        </>
      )}

      {/* Save dialog */}
      <Dialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreenDialog}
      >
        <DialogTitle>Save to Portfolio</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Portfolio</InputLabel>
            <Select
              value={selectedPortfolioId}
              label="Portfolio"
              onChange={e => setSelectedPortfolioId(e.target.value)}
            >
              {portfolios.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
              <MenuItem value="__new__">+ Create new portfolio</MenuItem>
            </Select>
          </FormControl>

          {selectedPortfolioId === '__new__' && (
            <TextField
              fullWidth
              label="New portfolio name"
              value={newPortfolioName}
              onChange={e => setNewPortfolioName(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          <Alert severity="info">
            {result?.summary.mutualFundCount ?? 0} mutual funds and {result?.summary.equityCount ?? 0} equities
            totalling {formatCurrency(result?.summary.totalValue ?? 0)} will be added.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSaveOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || (selectedPortfolioId === '__new__' && !newPortfolioName.trim())}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveAlt />}
          >
            {saving ? 'Saving…' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CASUpload;
