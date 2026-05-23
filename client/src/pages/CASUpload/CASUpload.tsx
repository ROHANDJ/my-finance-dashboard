import React, { useState, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  CircularProgress, Alert, Chip, Divider, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Accordion, AccordionSummary, AccordionDetails, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  CloudUpload, ExpandMore, AccountBalance, ShowChart,
  CheckCircle, Lock, SaveAlt,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';

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
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={600} mb={1}>
        Import CAS Portfolio
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Upload your CDSL/CAMS Consolidated Account Statement to import all your holdings — stocks and mutual funds across all brokers and platforms.
      </Typography>

      {/* How to get CAS */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>How to get your CAS PDF:</strong> Visit{' '}
        <strong>camsonline.com → Investors → CAS</strong> and enter your PAN + registered email.
        You'll receive a PDF by email (password = PAN in uppercase + date of birth DDMMYYYY).
      </Alert>

      {/* Upload area */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: file ? 'success.main' : 'primary.main',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: file ? 'success.50' : 'action.hover',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            {file ? (
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <CheckCircle color="success" />
                <Typography fontWeight={600}>{file.name}</Typography>
                <Chip label={`${(file.size / 1024).toFixed(0)} KB`} size="small" />
              </Box>
            ) : (
              <>
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6">Drop your CAS PDF here</Typography>
                <Typography variant="body2" color="text.secondary">or click to browse</Typography>
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
            sx={{ mt: 2 }}
            helperText="Try: PAN uppercase + DOB as DDMMYYYY (e.g. ABCDE1234F01011990) · or just PAN uppercase for some CDSL PDFs"
            InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Box display="flex" gap={2} mt={2}>
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
          {loading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Investor info */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={1}>Investor Details</Typography>
              <Box display="flex" gap={3} flexWrap="wrap">
                {result.investor.name && <Box><Typography variant="caption" color="text.secondary">Name</Typography><Typography fontWeight={600}>{result.investor.name}</Typography></Box>}
                {result.investor.pan && <Box><Typography variant="caption" color="text.secondary">PAN</Typography><Typography fontWeight={600}>{result.investor.pan}</Typography></Box>}
                {result.investor.email && <Box><Typography variant="caption" color="text.secondary">Email</Typography><Typography fontWeight={600}>{result.investor.email}</Typography></Box>}
                {result.dateRange.from && <Box><Typography variant="caption" color="text.secondary">Period</Typography><Typography fontWeight={600}>{result.dateRange.from} to {result.dateRange.to}</Typography></Box>}
              </Box>
            </CardContent>
          </Card>

          {/* Summary cards */}
          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
            {[
              { label: 'Total Value', value: formatCurrency(result.summary.totalValue), color: 'primary.main' },
              { label: 'Total Holdings', value: result.summary.totalHoldings, color: 'text.primary' },
              { label: 'Mutual Funds', value: result.summary.mutualFundCount, color: 'info.main' },
              { label: 'Equities', value: result.summary.equityCount, color: 'success.main' },
            ].map(stat => (
              <Card key={stat.label} sx={{ flex: '1 1 150px' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  <Typography variant="h5" fontWeight={700} color={stat.color}>{stat.value}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Mutual Funds table */}
          {result.mutualFunds.length > 0 && (
            <Accordion defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccountBalance color="info" />
                  <Typography fontWeight={600}>Mutual Funds ({result.mutualFunds.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Scheme</TableCell>
                        <TableCell>ISIN</TableCell>
                        <TableCell align="right">Units</TableCell>
                        <TableCell align="right">NAV</TableCell>
                        <TableCell align="right">Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.mutualFunds.map((mf, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" noWrap title={mf.name}>{mf.name}</Typography>
                          </TableCell>
                          <TableCell><Typography variant="caption" color="text.secondary">{mf.isin || '—'}</Typography></TableCell>
                          <TableCell align="right">{mf.units.toFixed(3)}</TableCell>
                          <TableCell align="right">₹{mf.nav.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(mf.value)}</TableCell>
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
            <Accordion defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ShowChart color="success" />
                  <Typography fontWeight={600}>Equities ({result.equities.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Company</TableCell>
                        <TableCell>ISIN</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Market Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.equities.map((eq, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{eq.name}</TableCell>
                          <TableCell><Typography variant="caption" color="text.secondary">{eq.isin}</Typography></TableCell>
                          <TableCell align="right">{eq.quantity.toLocaleString('en-IN')}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(eq.value)}</TableCell>
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
            <Card sx={{ mb: 2, border: '1px solid', borderColor: 'primary.main' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Save to Portfolio</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Import {result.summary.totalHoldings} holdings ({formatCurrency(result.summary.totalValue)}) into your portfolio
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveAlt />}
                  onClick={handleOpenSave}
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
      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} maxWidth="sm" fullWidth>
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
