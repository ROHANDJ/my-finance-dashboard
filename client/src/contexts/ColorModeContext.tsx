import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ColorModePreference = 'light' | 'dark' | 'system';
export type ColorMode = 'light' | 'dark';

interface ColorModeContextType {
  /** What the user chose (may be "system"). */
  preference: ColorModePreference;
  /** What's actually applied. */
  mode: ColorMode;
  setPreference: (p: ColorModePreference) => void;
  /** Flip between light and dark (sets an explicit preference). */
  toggle: () => void;
}

const STORAGE_KEY = 'fh-color-mode';

const ColorModeContext = createContext<ColorModeContextType | undefined>(undefined);

export const useColorMode = () => {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider');
  return ctx;
};

function readStored(): ColorModePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'dark'; // the app was designed dark-first
}

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const ColorModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ColorModePreference>(readStored);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  // Follow OS changes while on "system".
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const mode: ColorMode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  // CSS tokens in index.css key off this attribute.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const setPreference = useCallback((p: ColorModePreference) => {
    setPreferenceState(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch {}
  }, []);

  const toggle = useCallback(() => setPreference(mode === 'dark' ? 'light' : 'dark'), [mode, setPreference]);

  const value = useMemo(() => ({ preference, mode, setPreference, toggle }), [preference, mode, setPreference, toggle]);

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
};
