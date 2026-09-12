/**
 * Centralized Axios HTTP client.
 * Base URL and timeouts are set from environment variables.
 * Automatically injects JWT Bearer token on requests and handles 401 errors.
 */
import axios from 'axios';
import { clearStoredToken, getStoredToken } from '../utils/token';

/**
 * Centralized Base URL for backend API requests.
 * Sourced from VITE_API_BASE_URL, trimmed of trailing slashes.
 */
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

function resolveApiBaseUrl(): string {
  // If the app is served over HTTPS (e.g. Vercel) but the backend URL is insecure HTTP,
  // browsers block calls due to Mixed Content. Use relative path so vercel.json rewrites can proxy.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && rawBaseUrl?.startsWith('http://')) {
    return '';
  }
  return (rawBaseUrl ?? (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000')).replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Checks whether an image URL is an external public CDN URL (e.g. Supabase, S3, Cloudinary)
 * or an internal protected API route (/api/, /comics/, or matching API_BASE_URL).
 */
export function isDirectImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // Relative internal API routes
  if (url.startsWith('/api/') || url.startsWith('/comics/')) return false;
  // If it points to our configured backend base URL, it is an internal protected route
  if (API_BASE_URL && url.startsWith(API_BASE_URL)) return false;
  // Common local dev addresses
  if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) return false;
  // Public CDN or pre-created blob / data URLs
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:');
}

/** Timeout for normal API requests (chat, metadata, GET calls, etc.). */
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 60_000;

/**
 * Timeout specifically for POST /comics/upload.
 * Comic ingestion is long-running: every page is analyzed by an AI service
 * and rate-limit retries can occur (26 pages ≈ 1–3 min).
 * Configurable via VITE_UPLOAD_TIMEOUT; defaults to 5 minutes.
 */
export const UPLOAD_TIMEOUT = Number(import.meta.env.VITE_UPLOAD_TIMEOUT) || 300_000;

/**
 * Set this flag to true BEFORE making an auth-check request (e.g. GET /auth/me during initializeAuth).
 * The 401 interceptor checks this flag and skips the global logout+redirect so that authStore
 * can handle the 401 itself without being overridden by the interceptor.
 */
export let skipAuthRedirectOnce = false;
export function setSkipAuthRedirect(val: boolean) {
  skipAuthRedirectOnce = val;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer Token to outgoing requests
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && config.headers) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as Record<string, unknown>)['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If initializeAuth explicitly requested skipping redirect during initial boot verification
      if (skipAuthRedirectOnce) {
        skipAuthRedirectOnce = false;
        return Promise.reject(error);
      }

      const isLoginOrSignup =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/signup');

      if (!isLoginOrSignup) {
        clearStoredToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth:unauthorized'));
        }

        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
