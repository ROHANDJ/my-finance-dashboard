import React, { useState, useEffect, useCallback } from 'react';
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
  Tabs,
  Tab,
  Button,
  IconButton,
} from '@mui/material';
import {
  Rocket,
  TrendingUp,
  Refresh,
  Event,
  Visibility,
  OpenInNew,
  WarningAmber,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { StatCardSkeleton, TableSkeleton, CardGridSkeleton } from '../../components/Skeletons/Skeletons';
import {
  IPO, NSE_IPO_URL, formatDate, formatDateRange, inr, formatPrice, minInvestment,
  StatusChip, SmeChip, GainText, DetailRow,
} from './ipoShared';
import IPODetailsDialog from './IPODetailsDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`}>
    {value === index && <Box>{children}</Box>}
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <Card>
    <CardContent sx={{ textAlign: 'center', py: 6 }}>
      <Rocket sx={{ fontSize: 40, color: 'var(--fh-faint)', mb: 1 }} />
      <Typography sx={{ color: 'var(--fh-text-3)' }}>{text}</Typography>
    </CardContent>
  </Card>
);

const IPOPage: React.FC = () => {
  const [ipos, setIpos] = useState<IPO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedIPO, setSelectedIPO] = useState<IPO | null>(null);

  const fetchIPOs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/ipo');
      setIpos(response.data.ipos || []);
      setNotice(response.data.source === 'unavailable' ? response.data.message : '');
    } catch (error) {
      toast.error('Failed to fetch IPOs');
      setNotice('Could not load IPOs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchIPOs(); }, [fetchIPOs]);

  const upcoming = ipos
    .filter(i => i.status === 'upcoming')
    .sort((a, b) => new Date(a.timeline.openDate || 0).getTime() - new Date(b.timeline.openDate || 0).getTime());
  const open = ipos.filter(i => i.status === 'open');
  const recent = ipos.filter(i => i.status === 'listed' || i.status === 'closed'); // already newest first

  // Calendar table: what's actionable first, then the most recent.
  const calendar = [...open, ...upcoming, ...recent].slice(0, 12);

  const headCellSx = {
    background: 'var(--fh-table-head)',
    color: 'var(--fh-text-2)',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
  } as const;

  const statCards = [
    { label: 'Upcoming IPOs', value: upcoming.length, hint: 'Opening for bids soon', icon: <Event sx={{ color: 'var(--fh-info)' }} />, color: 'var(--fh-info)' },
    { label: 'Open IPOs', value: open.length, hint: 'Accepting bids now', icon: <Rocket sx={{ color: 'var(--fh-up)' }} />, color: 'var(--fh-up)' },
    { label: 'Recent Issues', value: recent.length, hint: 'Closed or listed in the last 60 days', icon: <TrendingUp sx={{ color: 'var(--fh-indigo)' }} />, color: 'var(--fh-indigo)' },
  ];

  const nameCell = (ipo: IPO) => (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: 'var(--fh-text)' }} title={ipo.companyName}>
          {ipo.companyName}
        </Typography>
        {ipo.isSme && <SmeChip />}
      </Box>
      <Typography variant="caption" sx={{ color: 'var(--fh-muted)' }}>{ipo.symbol} • {ipo.exchange}</Typography>
    </Box>
  );

  const cardHeader = (ipo: IPO) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" noWrap sx={{ fontWeight: 600, color: 'var(--fh-text)', fontSize: '1rem' }} title={ipo.companyName}>
          {ipo.companyName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)' }}>{ipo.symbol} • {ipo.exchange}</Typography>
          {ipo.isSme && <SmeChip />}
        </Box>
      </Box>
      <StatusChip status={ipo.status} />
    </Box>
  );

  const nseButton = (label = 'View on NSE') => (
    <Button
      variant="outlined"
      size="small"
      href={NSE_IPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      endIcon={<OpenInNew sx={{ fontSize: '0.9rem !important' }} />}
    >
      {label}
    </Button>
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
            IPO
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)', mt: 0.5 }}>
            Mainboard and SME public issues on NSE
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          {!notice && !isLoading && (
            <Chip
              size="small"
              label="Live · NSE"
              icon={<Box className="pulse-dot" sx={{ width: 6, height: 6, ml: '8px !important' }} />}
              sx={{ color: 'var(--fh-up)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
            />
          )}
          <IconButton onClick={fetchIPOs} color="primary" disabled={isLoading} aria-label="Refresh">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {notice && !isLoading && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mb: { xs: 2, md: 3 }, borderRadius: 3,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
        }}>
          <WarningAmber sx={{ color: 'var(--fh-warn)' }} />
          <Typography variant="body2" sx={{ color: 'var(--fh-amber-text)', flex: 1 }}>{notice}</Typography>
          <Button size="small" onClick={fetchIPOs} sx={{ color: 'var(--fh-warn)' }}>Retry</Button>
        </Box>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 2, md: 3 } }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Calendar" />
          <Tab label={`Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}`} />
          <Tab label={`Open Now${open.length ? ` (${open.length})` : ''}`} />
          <Tab label="Recent" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {isLoading ? (
          <>
            <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
              {[0, 1, 2].map(i => (
                <Grid item xs={12} sm={6} md={4} key={i}><StatCardSkeleton /></Grid>
              ))}
            </Grid>
            <TableSkeleton rows={6} columns={7} />
          </>
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {statCards.map(card => (
              <Grid item xs={12} sm={6} md={4} key={card.label}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                      {card.icon}
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--fh-text)', fontSize: '1rem' }}>{card.label}</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: card.color }}>{card.value}</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--fh-muted)' }}>{card.hint}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'var(--fh-text)' }}>
                    IPO Calendar
                  </Typography>
                  {calendar.length === 0 ? (
                    <Typography sx={{ color: 'var(--fh-text-3)', textAlign: 'center', py: 4 }}>No IPOs found</Typography>
                  ) : (
                    <TableContainer sx={{ overflowX: 'auto', borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.12)' }}>
                      <Table size="small" sx={{ minWidth: 760 }}>
                        <TableHead>
                          <TableRow sx={{ '&:hover': { background: 'transparent' } }}>
                            <TableCell sx={headCellSx}>Company</TableCell>
                            <TableCell sx={headCellSx}>Status</TableCell>
                            <TableCell sx={headCellSx}>Price Band</TableCell>
                            <TableCell sx={headCellSx}>Bidding Dates</TableCell>
                            <TableCell sx={headCellSx}>Lot Size</TableCell>
                            <TableCell sx={headCellSx}>Listing Gain</TableCell>
                            <TableCell sx={headCellSx} align="center">Details</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {calendar.map((ipo) => (
                            <TableRow key={ipo.symbol} hover>
                              <TableCell sx={{ maxWidth: 280 }}>{nameCell(ipo)}</TableCell>
                              <TableCell><StatusChip status={ipo.status} /></TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap', color: 'var(--fh-text)' }}>{formatPrice(ipo)}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap', color: 'var(--fh-text-2)' }}>{formatDateRange(ipo)}</TableCell>
                              <TableCell sx={{ color: 'var(--fh-text-2)' }}>{ipo.offering.lotSize ?? '-'}</TableCell>
                              <TableCell><GainText value={ipo.listing?.gainPercent} /></TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => setSelectedIPO(ipo)}
                                  sx={{ color: 'var(--fh-text-3)', '&:hover': { color: '#6366f1' } }}
                                  aria-label={`View details for ${ipo.companyName}`}
                                >
                                  <Visibility fontSize="small" />
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
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {isLoading ? (
          <CardGridSkeleton count={6} height={190} />
        ) : upcoming.length === 0 ? (
          <EmptyState text="No upcoming IPOs announced on NSE right now" />
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {upcoming.map((ipo) => (
              <Grid item xs={12} sm={6} lg={4} key={ipo.symbol}>
                <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => setSelectedIPO(ipo)}>
                  <CardContent>
                    {cardHeader(ipo)}
                    <Box display="flex" flexDirection="column" gap={0.75}>
                      <DetailRow label="Price band">{formatPrice(ipo)}</DetailRow>
                      <DetailRow label="Bidding">{formatDateRange(ipo)}</DetailRow>
                      {ipo.offering.lotSize && <DetailRow label="Lot size">{ipo.offering.lotSize} shares</DetailRow>}
                      {minInvestment(ipo) && <DetailRow label="Min. investment">{inr(minInvestment(ipo)!)}</DetailRow>}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {isLoading ? (
          <CardGridSkeleton count={4} height={220} />
        ) : open.length === 0 ? (
          <EmptyState text="No IPOs are open for bidding right now" />
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {open.map((ipo) => (
              <Grid item xs={12} md={6} key={ipo.symbol}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    {cardHeader(ipo)}
                    <Box display="flex" flexDirection="column" gap={0.75} mb={2}>
                      <DetailRow label="Price band">{formatPrice(ipo)}</DetailRow>
                      <DetailRow label="Closes">{formatDate(ipo.timeline.closeDate)}</DetailRow>
                      {ipo.offering.lotSize && <DetailRow label="Lot size">{ipo.offering.lotSize} shares</DetailRow>}
                      {minInvestment(ipo) && <DetailRow label="Min. investment">{inr(minInvestment(ipo)!)}</DetailRow>}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', color: 'var(--fh-muted)', mb: 1.5 }}>
                      Apply through your broker's IPO section or your bank's ASBA / UPI.
                    </Typography>
                    {nseButton('Issue details on NSE')}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {isLoading ? (
          <CardGridSkeleton count={4} height={150} />
        ) : recent.length === 0 ? (
          <EmptyState text="No IPOs closed or listed in the last 60 days" />
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {recent.map((ipo) => (
              <Grid item xs={12} sm={6} lg={4} key={ipo.symbol}>
                <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => setSelectedIPO(ipo)}>
                  <CardContent>
                    {cardHeader(ipo)}
                    <Box display="flex" flexDirection="column" gap={0.75}>
                      <DetailRow label="Issue price">{formatPrice(ipo)}</DetailRow>
                      {ipo.status === 'listed'
                        ? <DetailRow label="Listed on">{formatDate(ipo.timeline.listingDate)}</DetailRow>
                        : <DetailRow label="Bidding closed">{formatDate(ipo.timeline.closeDate)}</DetailRow>}
                      {ipo.listing && (
                        <>
                          <DetailRow label="Current price">{inr(ipo.listing.currentPrice)}</DetailRow>
                          <DetailRow label="Gain vs issue"><GainText value={ipo.listing.gainPercent} /></DetailRow>
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <IPODetailsDialog ipo={selectedIPO} onClose={() => setSelectedIPO(null)} />
    </Box>
  );
};

export default IPOPage;
