import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import axios from 'axios';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface IndexData {
  symbol: string;
  name: string;
  short: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
}

const REFRESH_MS = 30_000;

const MarketTicker: React.FC = () => {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchIndices = async () => {
    try {
      const res = await axios.get('/api/market/indices');
      setIndices(res.data.indices || []);
    } catch {
      // silently fail — ticker is informational
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    const id = setInterval(fetchIndices, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll the ticker
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || indices.length === 0) return;
    let pos = 0;
    const speed = 0.6;
    let frame: number;
    const tick = () => {
      pos += speed;
      if (pos >= el.scrollWidth / 2) pos = 0;
      el.scrollLeft = pos;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [indices]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', height: 32 }}>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} width={100} height={20} sx={{ bgcolor: 'rgba(99,102,241,0.1)' }} />)}
      </Box>
    );
  }

  const doubled = [...indices, ...indices]; // duplicate for seamless loop

  return (
    <Box
      sx={{
        overflow: 'hidden',
        flex: 1,
        mx: 2,
        mask: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
        WebkitMask: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          gap: 0,
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          userSelect: 'none',
        }}
      >
        {doubled.map((idx, i) => {
          const up = idx.change >= 0;
          const color = up ? '#10b981' : '#f43f5e';
          return (
            <Box
              key={`${idx.symbol}_${i}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 0.5,
                borderRight: '1px solid rgba(99,102,241,0.08)',
                flexShrink: 0,
                minWidth: 160,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.04em', lineHeight: 1 }}>
                  {idx.short}
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>
                  {idx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                {up
                  ? <TrendingUpIcon sx={{ fontSize: '0.75rem', color }} />
                  : <TrendingDownIcon sx={{ fontSize: '0.75rem', color }} />}
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color }}>
                  {up ? '+' : ''}{idx.changePercent.toFixed(2)}%
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default MarketTicker;
