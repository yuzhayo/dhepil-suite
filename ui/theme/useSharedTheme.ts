import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'dhepil-theme';
const THEME_EVENT = 'dhepil-theme-change';

export type ThemeMode = 'light' | 'dark';

function readTheme(value: string | null): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

function readStoredTheme(): ThemeMode {
  try {
    return readTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return 'dark';
  }
}

export function useSharedTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStoredTheme);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        setMode(readTheme(e.newValue));
      }
    };

    // Storage events sync other same-origin contexts; this event syncs hooks in this window.
    const handleCustom = () => {
      setMode(readStoredTheme());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(THEME_EVENT, handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(THEME_EVENT, handleCustom);
    };
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(THEME_KEY, next);
      window.dispatchEvent(new Event(THEME_EVENT));
    } catch {
      // Ignore
    }
    setMode(next);
  }, []);

  return { mode, setTheme };
}
