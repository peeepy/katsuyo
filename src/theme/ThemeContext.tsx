import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeId = 'a' | 'b' | 'c' | 'd';

// Central registry of themes. Add a new one here + a matching `[data-theme="x"]`
// block in themes.css (and, if it needs a genuinely different layout rather than
// just different colors/type, a dedicated view component like FlashcardQuiz).
export const THEME_META: Record<ThemeId, { label: string; description: string }> = {
  a: { label: 'Washi',     description: 'Ink & paper, hanko stamp' },
  b: { label: 'Dark',      description: 'Low-light, easy on the eyes' },
  c: { label: 'Flashcard', description: 'Full-bleed, swipe-driven, dark quiz view' },
  d: { label: 'Arcade',    description: 'Bright, gamified, streak-driven' },
};

export const THEME_IDS = Object.keys(THEME_META) as ThemeId[];

// Which "shell" wraps the settings panel for each theme. A theme with a busy,
// full-bleed main view (c) or a full-screen settings page (b, d) both make more
// sense than stacking another modal on top of an already-minimal screen.
export const SETTINGS_SHELL: Record<ThemeId, 'sheet' | 'fullpage'> = {
  a: 'sheet',
  b: 'fullpage',
  c: 'sheet',
  d: 'fullpage',
};

const STORAGE_KEY = 'katsuyo-theme';

function readStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'a';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && (THEME_IDS as string[]).includes(stored) ? (stored as ThemeId) : 'a';
  } catch {
    // localStorage can throw in private-browsing/lockdown modes — fall back quietly.
    return 'a';
  }
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore — not critical if the preference doesn't persist
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a <ThemeProvider>');
  return ctx;
}