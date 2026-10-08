import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'gallery_theme'; // 'light' | 'dark' | 'system'

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(pref) {
  return pref === 'system' ? getSystemTheme() : pref;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    } catch {
      return 'system';
    }
  });
  const [theme, setTheme] = useState(() => resolveTheme(preference));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }

    const apply = () => {
      const next = resolveTheme(preference);
      setTheme(next);
      const root = document.documentElement;
      if (next === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      root.style.colorScheme = next;
    };
    apply();

    // Follow OS changes while in "system" mode.
    if (preference === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      theme,
      setTheme: setPreference,
    }),
    [preference, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
