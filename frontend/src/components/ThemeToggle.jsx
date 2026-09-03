import { useEffect, useState } from 'react';
import { getPreferredTheme, setTheme } from '../utils/theme';

export default function ThemeToggle({ inline = false }) {
  const [theme, setThemeState] = useState(getPreferredTheme());

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const isDark = theme === 'dark';
  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  if (inline) {
    return (
      <button
        type="button"
        className="sidebar-theme-switch"
        onClick={toggle}
        aria-pressed={isDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="sidebar-theme-switch-label">
          <span>{isDark ? '☾' : '☀'}</span>
          <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </span>
        <span className={`switch-track${isDark ? ' on' : ''}`}>
          <span className="switch-thumb" />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
