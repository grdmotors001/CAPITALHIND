import { useEffect, useState } from 'react';
import { getPreferredTheme, setTheme } from '../utils/theme';

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getPreferredTheme());

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
