import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRoutes from './routes/AppRoutes';
import ThemeToggle from './components/ThemeToggle';
import { initTheme, initSidebarCollapsed } from './utils/theme';
import './styles.css';

initTheme();
initSidebarCollapsed();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRoutes />
    <ThemeToggle />
  </React.StrictMode>
);
