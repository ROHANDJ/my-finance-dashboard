import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close, Description, OpenInNew, Newspaper, Search, Calculate } from '@mui/icons-material';
import axios from 'axios';
import {
  IPO, formatDate, formatDateRange, formatPrice, inr, minInvestment,
  StatusChip, SmeChip, GainText,
} from './ipoShared';

interface SubscriptionRow {
  label: string;
  sharesOffered: number | null;
  sharesBid: number | null;
  times: number;
}

interface IPODetails {
  industry: string | null;
  isin: string | null;
  info: Partial<Record<
    'issueType' | 'issueSize' | 'priceRange' | 'faceValue' | 'bidLot' | 'minOrderQty' | 'maxRetail' |
    'discount' | 'leadManagers' | 'sponsorBank' | 'registrar' | 'registrarContact' | 'upiCutoff', string>>;
  documents: Partial<Record<'rhp' | 'basisOfPrice' | 'applicationForms', string>>;
  subscription: SubscriptionRow[];
  subscriptionUpdated: string | null;
}

interface DetailsResponse {
  details: IPODetails | null;
  links: { nse: string; news: string; web: string };
}

const INK = { primary: 'var(--fh-text)', body: 'var(--fh-text-2)', label: 'var(--fh-muted)', muted: 'var(--fh-muted-2)' };

const SectionTitle: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
    <Typography sx={{ color: INK.primary, fontWeight: 700, fontSize: '0.95rem' }}>{children}</Typography>
    {aside}
  </Box>
);

/** Two-column label/value grid that collapses to one column on phones. */
const InfoGrid: React.FC<{ rows: [string, React.ReactNode | undefined | null][] }> = ({ rows }) => {
  const visible = rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (visible.length === 0) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, rowGap: 1.5 }}>
      {visible.map(([label, value]) => (
        <Box key={label} sx={{ minWidth: 0 }}>
          <Typography sx={{ color: INK.label, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </Typography>
          <Typography sx={{ color: INK.body, fontSize: '0.85rem', wordBreak: 'break-word' }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Horizontal bars of "times subscribed" per category. One measure, one scale,
 * a single hue; the 1× mark shows where a category is fully subscribed.
 */
const SubscriptionBars: React.FC<{ rows: SubscriptionRow[] }> = ({ rows }) => {
  const max = Math.max(1, ...rows.map(r => r.times));
  const oneX = (1 / max) * 100;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
      {rows.map(r => {
        const isTotal = r.label === 'Total';
        return (
          <Box
            key={r.label}
            sx={{ display: 'grid', gridTemplateColumns: '84px 1fr 56px', alignItems: 'center', gap: 1.5 }}
            title={r.sharesOffered && r.sharesBid
              ? `${r.label}: ${r.sharesBid.toLocaleString('en-IN')} shares bid for ${r.sharesOffered.toLocaleString('en-IN')} offered`
              : `${r.label}: ${r.times}× subscribed`}
          >
            <Typography sx={{ color: isTotal ? INK.primary : INK.body, fontSize: '0.8rem', fontWeight: isTotal ? 700 : 500 }}>
              {r.label}
            </Typography>
            <Box sx={{ position: 'relative', height: 10, borderRadius: 5, background: 'rgba(148,163,184,0.1)' }}>
              <Box sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${Math.max(2, (r.times / max) * 100)}%`,
                borderRadius: 5,
                background: isTotal ? 'var(--fh-indigo)' : '#6366f1',
              }} />
              {max > 1 && (
                <Box sx={{ position: 'absolute', left: `${oneX}%`, top: -3, bottom: -3, width: '1px', background: 'var(--fh-text-3)', opacity: 0.6 }} />
              )}
            </Box>
            <Typography sx={{ color: INK.primary, fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>
              {r.times.toFixed(2)}×
            </Typography>
          </Box>
        );
      })}
      {max > 1 && (
        <Typography sx={{ color: INK.muted, fontSize: '0.7rem', mt: 0.25 }}>
          Vertical mark = fully subscribed (1×). Hover a row for share counts.
        </Typography>
      )}
    </Box>
  );
};

const LinkButton: React.FC<{ href: string; icon: React.ReactNode; children: React.ReactNode; primary?: boolean }> = ({ href, icon, children, primary }) => (
  <Button
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    variant={primary ? 'contained' : 'outlined'}
    size="small"
    startIcon={icon}
    endIcon={<OpenInNew sx={{ fontSize: '0.85rem !important' }} />}
    sx={{ justifyContent: 'flex-start' }}
  >
    {children}
  </Button>
);

interface IPODetailsDialogProps {
  ipo: IPO | null;
  onClose: () => void;
}

const IPODetailsDialog: React.FC<IPODetailsDialogProps> = ({ ipo, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [data, setData] = useState<DetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ipo) return;
    let cancelled = false;
    setData(null);
    setFailed(false);
    setLoading(true);
    axios.get(`/api/ipo/${encodeURIComponent(ipo.symbol)}/details`)
      .then(res => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ipo]);

  const d = data?.details;
  const info = d?.info || {};
  // The NSE list omits lot size for mainboard issues; the detail page has it ("55 Equity Shares").
  const lotFromDetails = parseInt(String(info.minOrderQty || info.bidLot || '').replace(/,/g, ''), 10) || null;
  const lot = ipo?.offering.lotSize || lotFromDetails;
  const upperPrice = ipo?.offering.finalPrice || ipo?.offering.priceRange?.max || null;
  const min = ipo ? (minInvestment(ipo) ?? (lot && upperPrice ? lot * upperPrice : null)) : null;

  return (
    <Dialog
      open={!!ipo}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: { background: 'var(--fh-dialog)', border: '1px solid rgba(99,102,241,0.2)' } }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700, color: INK.primary, fontSize: '1.15rem' }} title={ipo?.companyName}>
            {ipo?.companyName}
          </Typography>
          {ipo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <StatusChip status={ipo.status} />
              {ipo.isSme && <SmeChip />}
              <Typography sx={{ color: INK.label, fontSize: '0.8rem' }}>
                {ipo.symbol} • NSE {ipo.isSme ? 'Emerge' : 'Mainboard'}{d?.industry ? ` • ${d.industry}` : ''}
              </Typography>
            </Box>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--fh-text-3)' }} aria-label="Close">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {ipo && (
          <>
            {/* Headline numbers — always available from the list */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
              {[
                ['Price', formatPrice(ipo)],
                ['Bidding', formatDateRange(ipo)],
                ipo.listing
                  ? ['Gain vs issue', <GainText key="g" value={ipo.listing.gainPercent} />]
                  : ['Min. investment', min ? inr(min) : loading ? <Skeleton key="m" variant="text" sx={{ width: 80 }} /> : '-'],
                ipo.listing
                  ? ['Current price', inr(ipo.listing.currentPrice)]
                  : ['Listing', formatDate(ipo.timeline.listingDate) === '-' ? 'TBA' : formatDate(ipo.timeline.listingDate)],
              ].map(([label, value]) => (
                <Box key={String(label)} sx={{ p: 1.5, borderRadius: 2, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <Typography sx={{ color: INK.label, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                  </Typography>
                  <Typography sx={{ color: INK.primary, fontWeight: 700, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{value}</Typography>
                </Box>
              ))}
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Skeleton variant="text" sx={{ fontSize: '1rem', width: 160 }} />
                {[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={14} sx={{ width: `${90 - i * 12}%` }} />)}
                <Skeleton variant="text" sx={{ fontSize: '1rem', width: 140, mt: 2 }} />
                <Skeleton variant="rounded" height={90} />
              </Box>
            ) : (
              <>
                {failed || !d ? (
                  <Typography sx={{ color: INK.label, fontSize: '0.85rem' }}>
                    Full issue details couldn't be loaded from NSE right now — use the links below for the official pages.
                  </Typography>
                ) : (
                  <>
                    <Box>
                      <SectionTitle aside={d.subscriptionUpdated && (
                        <Typography sx={{ color: INK.muted, fontSize: '0.72rem' }}>as of {d.subscriptionUpdated}</Typography>
                      )}>
                        Subscription
                      </SectionTitle>
                      {d.subscription.length > 0 ? (
                        <SubscriptionBars rows={d.subscription} />
                      ) : (
                        <Typography sx={{ color: INK.label, fontSize: '0.85rem' }}>
                          {ipo.status === 'upcoming'
                            ? `Subscription figures appear once bidding opens on ${formatDate(ipo.timeline.openDate)}.`
                            : 'No subscription data published.'}
                        </Typography>
                      )}
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)' }} />

                    <Box>
                      <SectionTitle>Issue details</SectionTitle>
                      <InfoGrid rows={[
                        ['Issue type', info.issueType],
                        ['Face value', info.faceValue],
                        ['Bid lot', info.bidLot || (ipo.offering.lotSize ? `${ipo.offering.lotSize} shares` : null)],
                        ['Max. retail application', info.maxRetail],
                        ['UPI mandate cut-off', info.upiCutoff],
                        ['ISIN', d.isin],
                      ]} />
                      {info.issueSize && (
                        <Typography sx={{ color: INK.body, fontSize: '0.82rem', mt: 1.5 }}>
                          <Box component="span" sx={{ color: INK.label, fontWeight: 700 }}>Offer: </Box>{info.issueSize}
                        </Typography>
                      )}
                      {info.discount && (
                        <Typography sx={{ color: INK.body, fontSize: '0.82rem', mt: 0.75 }}>
                          <Box component="span" sx={{ color: INK.label, fontWeight: 700 }}>Employee discount: </Box>{info.discount}
                        </Typography>
                      )}
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)' }} />

                    <Box>
                      <SectionTitle>Who's involved</SectionTitle>
                      <InfoGrid rows={[
                        ['Lead managers', info.leadManagers],
                        ['Registrar', info.registrar],
                        ['Registrar contact', info.registrarContact],
                        ['Sponsor bank', info.sponsorBank],
                      ]} />
                    </Box>
                  </>
                )}

                <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)' }} />

                {/* Redirects for anything we don't show */}
                <Box>
                  <SectionTitle>More information</SectionTitle>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                    {d?.documents.rhp && (
                      <LinkButton primary href={d.documents.rhp} icon={<Description />}>Prospectus (RHP)</LinkButton>
                    )}
                    {d?.documents.basisOfPrice && (
                      <LinkButton href={d.documents.basisOfPrice} icon={<Calculate />}>Basis of issue price</LinkButton>
                    )}
                    {data?.links && (
                      <>
                        <LinkButton href={data.links.nse} icon={<OpenInNew />}>
                          {ipo.status === 'listed' ? 'Stock page on NSE' : 'Issue page on NSE'}
                        </LinkButton>
                        <LinkButton href={data.links.news} icon={<Newspaper />}>Latest news</LinkButton>
                        <LinkButton href={data.links.web} icon={<Search />}>Reviews & analysis</LinkButton>
                      </>
                    )}
                  </Box>
                  {d?.documents.rhp && (
                    <Typography sx={{ color: INK.muted, fontSize: '0.72rem', mt: 1 }}>
                      NSE documents download as .zip files containing the PDF.
                    </Typography>
                  )}
                </Box>
              </>
            )}

            <Typography sx={{ color: INK.muted, fontSize: '0.72rem' }}>
              Source: NSE. Not investment advice — read the offer document before applying.
            </Typography>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IPODetailsDialog;
