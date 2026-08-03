import { useEffect, useRef, useState } from 'react';
import { useTheme, THEME_META, THEME_IDS } from '../theme/ThemeContext';

export function ThemeQuickSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  return (
    <div className="theme-quickswitch-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        🎨
      </button>
      {open && (
        <div className="theme-popover" role="menu">
          {THEME_IDS.map(id => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === id}
              className={theme === id ? 'theme-swatch theme-swatch-active' : 'theme-swatch'}
              onClick={() => { setTheme(id); setOpen(false); }}
            >
              <span className="theme-swatch-preview" data-swatch={id} aria-hidden="true">
                <span className="theme-swatch-dot theme-swatch-dot-1" />
                <span className="theme-swatch-dot theme-swatch-dot-2" />
              </span>
              <span className="theme-swatch-label">{THEME_META[id].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}