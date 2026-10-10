import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { format, isValid } from 'date-fns';

// Shape returned by /api/ipo — live data from NSE.
export interface IPO {
  symbol: string;
  companyName: string;
  exchange: string;
  status: 'upcoming' | 'open' | 'closed' | 'listed';
  isSme?: boolean;
  timeline: {
    openDate?: string | null;
    closeDate?: string | null;
    listingDate?: string | null;
  };
  offering: {
    priceRange?: { min: number; max: number } | null;
    finalPrice?: number | null;
    totalShares?: number | null;
    lotSize?: number | null;
  };
  listing?: {
    currentPrice: number;
    issuePrice: number | null;
    gainPercent: number | null;
  };
}

export const NSE_IPO_URL = 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo';

/** ISO date -> "18 Oct 2026" */
export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  return isValid(d) ? format(d, 'd MMM yyyy') : value;
};

export const formatDateRange = (ipo: IPO) => {
  const { openDate, closeDate } = ipo.timeline;
  if (!openDate && !closeDate) return '-';
  const o = openDate ? new Date(openDate) : null;
  const c = closeDate ? new Date(closeDate) : null;
  // "13 – 15 Oct 2026" when both fall in the same month
  if (o && c && isValid(o) && isValid(c) && format(o, 'MMM yyyy') === format(c, 'MMM yyyy')) {
    return `${format(o, 'd')} – ${format(c, 'd MMM yyyy')}`;
  }
  return `${formatDate(openDate)} – ${formatDate(closeDate)}`;
};

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const formatPrice = (ipo: IPO) => {
  const range = ipo.offering?.priceRange;
  if (ipo.offering?.finalPrice) return inr(ipo.offering.finalPrice);
  if (range && (range.min || range.max)) {
    return range.min === range.max ? inr(range.max) : `${inr(range.min)} – ${inr(range.max)}`;
  }
  return '-';
};

/** Lot size × upper price band = minimum application amount. */
export const minInvestment = (ipo: IPO) => {
  const lot = ipo.offering?.lotSize;
  const price = ipo.offering?.finalPrice || ipo.offering?.priceRange?.max;
  return lot && price ? lot * price : null;
};

export const STATUS_STYLE: Record<IPO['status'], { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: 'var(--fh-info)' },
  open:     { label: 'Open',     color: 'var(--fh-up)' },
  closed:   { label: 'Closed',   color: 'var(--fh-warn)' },
  listed:   { label: 'Listed',   color: 'var(--fh-indigo)' },
};

export const StatusChip: React.FC<{ status: IPO['status'] }> = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.closed;
  return (
    <Chip
      label={s.label}
      size="small"
      variant="outlined"
      sx={{ color: s.color, borderColor: `color-mix(in srgb, ${s.color} 40%, transparent)`, background: `color-mix(in srgb, ${s.color} 8%, transparent)` }}
    />
  );
};

export const SmeChip: React.FC = () => (
  <Tooltip title="SME issue — listed on NSE Emerge; typically larger lot sizes and lower liquidity">
    <Chip label="SME" size="small" sx={{ height: 20, fontSize: '0.65rem', color: 'var(--fh-warn)', background: 'rgba(245,158,11,0.12)' }} />
  </Tooltip>
);

export const GainText: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value === null || value === undefined) return <>-</>;
  return (
    <Box component="span" sx={{ color: value >= 0 ? 'var(--fh-up)' : 'var(--fh-down)', fontWeight: 700 }}>
      {value >= 0 ? '+' : ''}{value.toFixed(2)}%
    </Box>
  );
};

export const detailLabelSx = { color: 'var(--fh-muted)', fontWeight: 600, mr: 0.75 } as const;

export const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Typography variant="body2" sx={{ color: 'var(--fh-text-2)' }}>
    <Box component="span" sx={detailLabelSx}>{label}:</Box>{children}
  </Typography>
);

