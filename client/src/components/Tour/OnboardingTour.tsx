import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Box, Button, IconButton, Portal, Typography } from '@mui/material';
import { Close, ArrowBack, ArrowForward } from '@mui/icons-material';

/*
 * Lightweight spotlight tour. Steps point at elements tagged with
 * data-tour="<id>". If a target isn't on screen (e.g. the sidebar on mobile),
 * the step is shown as a centred card instead, so the tour works everywhere.
 */

export interface TourStep {
  target?: string; // data-tour id; omit for a centred step
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to FinanceHub 👋',
    body: 'Take a quick 1-minute tour to see where everything lives. You can skip it now and replay it any time from your profile menu.',
  },
  {
    target: 'nav-main',
    title: 'Your daily overview',
    body: 'The Dashboard shows your portfolio, market indices and upcoming IPOs. EOD Summary wraps up your day — portfolio, spending and markets in one view.',
  },
  {
    target: 'nav-invest',
    title: 'Investments',
    body: 'Track holdings in Portfolio, import all your mutual funds and stocks at once with a CAS statement, research Stocks, Mutual Funds and IPOs, and place orders from Trading.',
  },
  {
    target: 'nav-finance',
    title: 'Personal finance',
    body: 'Log day-to-day spending in Expenses and keep an eye on bills, limits and due dates in Credit Cards.',
  },
  {
    target: 'market-ticker',
    title: 'Live markets',
    body: 'Nifty, Sensex, Bank Nifty, gold, crude and USD/INR update here automatically while you work.',
  },
  {
    target: 'ai-assistant',
    title: 'AI assistant',
    body: 'Ask questions about your portfolio, spending or the markets and get answers in plain language.',
  },
  {
    target: 'profile-menu',
    title: "You're all set",
    body: 'Your profile and settings live here — and so does "Take the tour" if you want to see this again. Start by importing your CAS or adding a portfolio.',
  },
];

const TOOLTIP_WIDTH = 340;
const GAP = 14;
const PAD = 6; // spotlight padding around the target

interface Rect { top: number; left: number; width: number; height: number; }

function findTarget(id?: string): HTMLElement | null {
  if (!id) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Hidden (display:none, collapsed drawer, off-screen) → treat as missing.
  if (r.width === 0 || r.height === 0 || r.right <= 0 || r.left >= window.innerWidth) return null;
  return el;
}

function placeTooltip(rect: Rect, tipHeight: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(TOOLTIP_WIDTH, vw - 32);
  const clampLeft = (l: number) => Math.max(16, Math.min(l, vw - width - 16));
  const clampTop  = (t: number) => Math.max(16, Math.min(t, vh - tipHeight - 16));

  // Prefer the right side (sidebar targets), then below, then above, then left.
  if (rect.left + rect.width + GAP + width <= vw - 16) {
    return { top: clampTop(rect.top), left: rect.left + rect.width + GAP, width };
  }
  if (rect.top + rect.height + GAP + tipHeight <= vh - 16) {
    return { top: rect.top + rect.height + GAP, left: clampLeft(rect.left + rect.width - width), width };
  }
  if (rect.top - GAP - tipHeight >= 16) {
    return { top: rect.top - GAP - tipHeight, left: clampLeft(rect.left + rect.width - width), width };
  }
  return { top: clampTop(rect.top), left: clampLeft(rect.left - GAP - width), width };
}

interface OnboardingTourProps {
  open: boolean;
  onClose: (completed: boolean) => void;
  steps?: TourStep[];
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ open, onClose, steps = TOUR_STEPS }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tipEl, setTipEl] = useState<HTMLDivElement | null>(null);
  const [tipHeight, setTipHeight] = useState(200);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const measure = useCallback(() => {
    const el = findTarget(step?.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  useEffect(() => { if (open) setIndex(0); }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = findTarget(step?.target);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    measure();
    // Re-measure after smooth scroll / layout settles.
    const t = setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step, measure]);

  useLayoutEffect(() => {
    if (tipEl) setTipHeight(tipEl.offsetHeight);
  }, [tipEl, index, rect]);

  const next = useCallback(() => (isLast ? onClose(true) : setIndex(i => i + 1)), [isLast, onClose]);
  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, back, onClose]);

  if (!open || !step) return null;

  const pos = rect ? placeTooltip(rect, tipHeight) : null;

  return (
    <Portal>
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        sx={{ position: 'fixed', inset: 0, zIndex: (t) => t.zIndex.modal + 10 }}
      >
        {/* Backdrop: a spotlight cut-out when there's a target, plain dim otherwise. */}
        {rect ? (
          <Box sx={{
            position: 'fixed',
            top: rect.top, left: rect.left, width: rect.width, height: rect.height,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.78)',
            outline: '2px solid rgba(99, 102, 241, 0.9)',
            transition: 'all 0.3s ease',
            pointerEvents: 'none',
          }} />
        ) : (
          <Box sx={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.78)' }} />
        )}

        {/* Block clicks on the app underneath while touring. */}
        <Box sx={{ position: 'fixed', inset: 0 }} onClick={(e) => e.stopPropagation()} />

        <Box
          ref={setTipEl}
          sx={{
            position: 'fixed',
            ...(pos
              ? { top: pos.top, left: pos.left, width: pos.width }
              : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `min(${TOOLTIP_WIDTH + 60}px, calc(100vw - 32px))` }),
            background: 'linear-gradient(160deg, rgba(17, 24, 51, 0.98), rgba(10, 15, 35, 0.98))',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '16px',
            boxShadow: '0 24px 64px var(--fh-shadow)',
            p: 2.5,
            transition: 'top 0.3s ease, left 0.3s ease',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <Typography id="tour-title" sx={{ flex: 1, fontWeight: 700, fontSize: '1rem', color: 'var(--fh-text)' }}>
              {step.title}
            </Typography>
            <IconButton size="small" aria-label="Skip tour" onClick={() => onClose(false)} sx={{ color: 'var(--fh-muted)', mt: -0.5, mr: -0.5 }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>

          <Typography sx={{ color: 'var(--fh-text-3)', fontSize: '0.85rem', lineHeight: 1.65, mb: 2.5 }}>
            {step.body}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.6, flex: 1 }}>
              {steps.map((_, i) => (
                <Box key={i} sx={{
                  width: i === index ? 18 : 6, height: 6, borderRadius: 3,
                  background: i === index ? '#6366f1' : 'rgba(148, 163, 184, 0.25)',
                  transition: 'all 0.25s ease',
                }} />
              ))}
            </Box>

            {index === 0 ? (
              <Button size="small" onClick={() => onClose(false)} sx={{ color: 'var(--fh-muted)' }}>Skip</Button>
            ) : (
              <IconButton size="small" aria-label="Previous step" onClick={back} sx={{ color: 'var(--fh-text-3)' }}>
                <ArrowBack fontSize="small" />
              </IconButton>
            )}
            <Button
              size="small"
              variant="contained"
              onClick={next}
              endIcon={!isLast ? <ArrowForward sx={{ fontSize: '1rem !important' }} /> : undefined}
              sx={{ px: 2 }}
            >
              {index === 0 ? 'Start tour' : isLast ? 'Get started' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Portal>
  );
};

export default OnboardingTour;
