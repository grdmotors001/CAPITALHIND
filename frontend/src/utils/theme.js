const STORAGE_KEY = 'chfpl_theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export function getPreferredTheme() {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    /* ignore storage errors (private mode etc.) */
  }
}

export function initTheme() {
  applyTheme(getPreferredTheme());
}

const COLLAPSE_KEY = 'chfpl_sidebar_collapsed';

export function getStoredSidebarCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

export function applySidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', !!collapsed);
}

export function setSidebarCollapsed(collapsed) {
  applySidebarCollapsed(collapsed);
  try {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  } catch (e) {
    /* ignore storage errors (private mode etc.) */
  }
}

export function initSidebarCollapsed() {
  applySidebarCollapsed(getStoredSidebarCollapsed());
}
