import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = (env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const port = Number(env.VITE_PORT) || 5173;

  /**
   * Returns true when the request is a browser page navigation (HTML document request).
   * Browser reloads send Accept: text/html or sec-fetch-dest: document.
   * We also check that it does NOT look like an API fetch (no application/json accept).
   */
  const isBrowserNavigation = (req: { headers: Record<string, string | string[] | undefined> }) => {
    const accept = (req.headers.accept as string) || '';
    const secFetchDest = (req.headers['sec-fetch-dest'] as string) || '';
    const secFetchMode = (req.headers['sec-fetch-mode'] as string) || '';

    // Explicit API/XHR fetch — must NOT bypass
    if (secFetchMode === 'cors' || secFetchMode === 'same-origin') return false;
    if (accept.includes('application/json')) return false;

    // Explicit HTML/document navigation — bypass to serve index.html
    if (secFetchDest === 'document') return true;
    if (accept.includes('text/html')) return true;

    return false;
  };

  const spaBypass = (req: { headers: Record<string, string | string[] | undefined> }) => {
    if (isBrowserNavigation(req)) {
      return '/index.html';
    }
    // Return undefined to let proxy handle it normally
    return undefined;
  };

  return {
    plugins: [react()],
    server: {
      port,
      proxy: {
        // API routes — always proxy, never bypass
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        // SPA routes that share a prefix with backend routes:
        // bypass browser navigation to index.html, but proxy API fetches
        '/comics': {
          target: apiTarget,
          changeOrigin: true,
          bypass: spaBypass,
        },
        '/conversations': {
          target: apiTarget,
          changeOrigin: true,
          bypass: spaBypass,
        },
        '/auth': {
          target: apiTarget,
          changeOrigin: true,
          bypass: spaBypass,
        },
      },
    },
  };
});
