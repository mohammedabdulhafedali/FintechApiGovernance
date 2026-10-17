import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './i18n';
import './styles/theme.css';

// One-time sovereign purge of legacy mock data caches
try {
  const PURGE_FLAG_KEY = 'gov_fintech_v3_clean_purge_done';
  if (!localStorage.getItem(PURGE_FLAG_KEY)) {
    localStorage.removeItem('gov_fintech_systems_cache');
    localStorage.removeItem('gov_fintech_sectors_cache');
    localStorage.removeItem('gov_fintech_doc_containers_v2');
    localStorage.removeItem('gov_fintech_change_requests');
    localStorage.removeItem('gov_fintech_workbench_active_sys');
    localStorage.removeItem('gov_fintech_workbench_active_int');
    localStorage.setItem(PURGE_FLAG_KEY, 'true');
  }
} catch {}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </React.StrictMode>
  );
}
