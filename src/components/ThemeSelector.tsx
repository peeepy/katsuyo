import { useTheme, THEME_META, THEME_IDS } from '../theme/ThemeContext';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="field-group">
      <label className="label">Theme</label>
      <div className="theme-selector" role="radiogroup" aria-label="Choose visual theme">
        {THEME_IDS.map(id => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={theme === id}
            className={theme === id ? 'theme-swatch theme-swatch-active' : 'theme-swatch'}
            data-swatch={id}
            onClick={() => setTheme(id)}
          >
            <span className="theme-swatch-preview" data-swatch={id} aria-hidden="true">
              <span className="theme-swatch-dot theme-swatch-dot-1" />
              <span className="theme-swatch-dot theme-swatch-dot-2" />
            </span>
            <span className="theme-swatch-label">{THEME_META[id].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}