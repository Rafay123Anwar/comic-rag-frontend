import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Recover cleanly from stale chunk hashes across deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const hasReloaded = sessionStorage.getItem('chunk_reload_retry');
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_reload_retry', 'true');
      window.location.reload();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
