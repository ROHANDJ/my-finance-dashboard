import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import axios from 'axios';

export interface ChartableIndex {
  symbol: string;
  name: string;
}

interface ChartData {
  symbol: string;
  range: string;
  currency: string | null;
  timezone: string | null;
  price: number | null;
  base: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  points: { t: number; p: number }[];
}

const RANGES = [
  { value: '1d',  label: '1D' },
  { value: '5d',  label: '5D' },
  { value: '1mo', label: '1M' },
  { value: '6mo', label: '6M' },
  { value: '1y',  label: '1Y' },
  { value: '5y',  label: '5Y' },
];

const UP = 'var(--fh-up)';
const DOWN = 'var(--fh-down)';
const INK = { primary: 'var(--fh-text)', secondary: 'var(--fh-text-3)', muted: 'var(--fh-muted)', grid: 'rgba(148, 163, 184, 0.08)' };

const fmtNum = (n: number, digits = 2) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Axis/tooltip time labels in the exchange's timezone, granularity by range. */
function timeFormatter(range: string, timeZone: string | null, forTooltip: boolean) {
  const tz = timeZone || 'Asia/Kolkata';
  const opts: Intl.DateTimeFormatOptions =
    range === '1d'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : range === '5d'
        ? (forTooltip ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false } : { day: 'numeric', month: 'short' })
        : range === '5y'
          ? (forTooltip ? { day: 'numeric', month: 'short', year: 'numeric' } : { month: 'short', year: '2-digit' })
          : (forTooltip ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
  const f = new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: tz });
  return (t: number) => f.format(new Date(t));
}

interface IndexChartDialogProps {
  open: boolean;
  onClose: () => void;
  index: ChartableIndex | null;
  /** Optional list to switch between indices inside the dialog. */
  indices?: ChartableIndex[];
}

const IndexChartDialog: React.FC<IndexChartDialogProps> = ({ open, onClose, index, indices }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isPhone = fullScreen;

  const [current, setCurrent] = useState<ChartableIndex | null>(index);
  const [range, setRange] = useState('1d');
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) setCurrent(index); }, [open, index]);

  const load = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/market/chart/${encodeURIComponent(current.symbol)}`, { params: { range } });
      setData(res.data);
    } catch (err: any) {
      setData(null);
      setError(err?.response?.data?.message || 'Could not load chart data');
    } finally {
      setLoading(false);
    }
  }, [current, range]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const up = (data?.change ?? 0) >= 0;
  const color = up ? UP : DOWN;
  const axisTime = data ? timeFormatter(range, data.timezone, false) : () => '';
  const tipTime = data ? timeFormatter(range, data.timezone, true) : () => '';
  const rangeLabel = RANGES.find(r => r.value === range)?.label;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: { background: 'var(--fh-dialog)', border: '1px solid rgba(99,102,241,0.2)' } }}
    >
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header: name, price, change for the selected range */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: INK.secondary, fontSize: '0.85rem', fontWeight: 600 }} noWrap>
              {current?.name}
            </Typography>
            {loading && !data ? (
              <Skeleton variant="text" sx={{ fontSize: '2rem', width: 220 }} />
            ) : data?.price != null ? (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography sx={{ color: INK.primary, fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' }, lineHeight: 1.2 }}>
                  {fmtNum(data.price)}
                </Typography>
                {data.change != null && data.changePercent != null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color, fontWeight: 700 }}>
                    {up ? <ArrowUpward sx={{ fontSize: '1rem' }} /> : <ArrowDownward sx={{ fontSize: '1rem' }} />}
                    {up ? '+' : ''}{fmtNum(data.change)} ({up ? '+' : ''}{data.changePercent.toFixed(2)}%)
                    <Typography component="span" sx={{ color: INK.muted, fontSize: '0.8rem', fontWeight: 500, ml: 0.5 }}>
                      {range === '1d' ? 'today' : rangeLabel}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : null}
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: INK.secondary }} aria-label="Close chart">
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {indices && indices.length > 1 && (
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1.5, '&::-webkit-scrollbar': { display: 'none' } }}>
            {indices.map(ix => {
              const active = ix.symbol === current?.symbol;
              return (
                <Chip
                  key={ix.symbol}
                  label={ix.name}
                  size="small"
                  onClick={() => setCurrent(ix)}
                  sx={{
                    flexShrink: 0,
                    color: active ? '#fff' : INK.secondary,
                    background: active ? '#6366f1' : 'rgba(148,163,184,0.12)',
                    border: `1px solid ${active ? '#6366f1' : 'transparent'}`,
                    '&:hover': { background: active ? '#4f46e5' : 'rgba(99,102,241,0.12)' },
                  }}
                />
              );
            })}
          </Box>
        )}

        {/* Range selector — one row above the chart */}
        <ToggleButtonGroup
          value={range}
          exclusive
          size="small"
          onChange={(_, v) => v && setRange(v)}
          aria-label="Time range"
          sx={{
            mb: 2,
            '& .MuiToggleButton-root': {
              color: INK.secondary, border: '1px solid rgba(148,163,184,0.15)', px: { xs: 1.25, sm: 2 }, py: 0.4,
              fontWeight: 700, fontSize: '0.75rem',
              '&.Mui-selected, &.Mui-selected:hover': { color: '#fff', background: '#6366f1', borderColor: '#6366f1' },
            },
          }}
        >
          {RANGES.map(r => <ToggleButton key={r.value} value={r.value}>{r.label}</ToggleButton>)}
        </ToggleButtonGroup>

        <Box sx={{ height: { xs: 260, sm: 340 }, position: 'relative' }}>
          {error ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
              <Typography sx={{ color: INK.secondary, fontSize: '0.9rem' }}>{error}</Typography>
              <Button size="small" variant="outlined" onClick={load}>Retry</Button>
            </Box>
          ) : !data || (loading && data.symbol !== current?.symbol) ? (
            <Skeleton variant="rounded" sx={{ height: '100%' }} />
          ) : data.points.length < 2 ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: INK.secondary, fontSize: '0.9rem' }}>No trading data for this range yet.</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} style={{ opacity: loading ? 0.5 : 1 }}>
                <defs>
                  <linearGradient id="indexFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={INK.grid} vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  scale="time"
                  tickFormatter={axisTime}
                  tick={{ fill: INK.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={isPhone ? 40 : 60}
                  interval="preserveStart"
                />
                <YAxis
                  // On 1D, always keep the previous close in view so the reference line shows.
                  domain={range === '1d' && data.base != null
                    ? [(min: number) => Math.min(min, data.base!) * 0.9995, (max: number) => Math.max(max, data.base!) * 1.0005]
                    : ['auto', 'auto']}
                  tickFormatter={(v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: v < 1000 ? 2 : 0 })}
                  tick={{ fill: INK.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={isPhone ? 52 : 64}
                  orientation="right"
                />
                {range === '1d' && data.base != null && (
                  <ReferenceLine
                    y={data.base}
                    stroke={INK.muted}
                    strokeDasharray="4 4"
                    label={{ value: 'Prev close', position: 'insideTopLeft', fill: INK.muted, fontSize: 10 }}
                  />
                )}
                <Tooltip
                  cursor={{ stroke: INK.secondary, strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{
                    background: 'var(--fh-dialog)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: INK.secondary, marginBottom: 2 }}
                  itemStyle={{ color: INK.primary, fontWeight: 700 }}
                  labelFormatter={(t: number) => tipTime(t)}
                  formatter={(v: number) => [fmtNum(v), current?.name || 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="p"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#indexFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: color, stroke: 'var(--fh-paper-solid)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Box>

        {data && data.high != null && data.low != null && !error && (
          <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
            {[
              { label: `${rangeLabel} high`, value: data.high },
              { label: `${rangeLabel} low`, value: data.low },
              ...(data.base != null ? [{ label: range === '1d' ? 'Prev close' : `${rangeLabel} open`, value: data.base }] : []),
            ].map(s => (
              <Box key={s.label}>
                <Typography sx={{ color: INK.muted, fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {s.label}
                </Typography>
                <Typography sx={{ color: INK.primary, fontWeight: 700, fontSize: '0.95rem' }}>{fmtNum(s.value)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IndexChartDialog;
