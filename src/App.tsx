import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Spinner } from './components/common/Spinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { useAuthStore } from './stores/authStore';

import type { ComponentType } from 'react';

/**
 * Handles stale dynamic import chunk errors across deployments.
 * If a user has an older tab open and navigates to a newly hashed route,
 * auto-reloads once to fetch the fresh bundle.
 */
function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const hasReloaded = typeof window !== 'undefined' ? sessionStorage.getItem('chunk_reload_retry') : null;

    try {
      const component = await factory();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('chunk_reload_retry');
      }
      return component;
    } catch (error: unknown) {
      const errStr = (error instanceof Error ? error.message : String(error)).toLowerCase();
      const isChunkError =
        errStr.includes('dynamically imported module') ||
        errStr.includes('module script') ||
        errStr.includes('mime type') ||
        errStr.includes('text/html');

      if (isChunkError && !hasReloaded && typeof window !== 'undefined') {
        sessionStorage.setItem('chunk_reload_retry', 'true');
        window.location.reload();
        return { default: (() => null) as unknown as T };
      }
      throw error;
    }
  });
}

const HomePage = lazyWithRetry(() => import('./pages/HomePage'));
const LibraryPage = lazyWithRetry(() => import('./pages/LibraryPage'));
const ReaderPage = lazyWithRetry(() => import('./pages/ReaderPage'));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const SignupPage = lazyWithRetry(() => import('./pages/SignupPage'));

function PageFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#08080a]">
      <Spinner size="lg" />
    </div>
  );
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <AppLayout>
        <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="An unexpected error occurred in the application.">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public Authentication Routes */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <SignupPage />
                  </PublicOnlyRoute>
                }
              />

              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <LibraryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/comics/:comicId"
                element={
                  <ProtectedRoute>
                    <ReaderPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Fallback */}
              <Route
                path="*"
                element={
                  <div className="h-screen flex flex-col items-center justify-center bg-[#08080a] gap-4">
                    <h1 className="text-4xl font-comic text-[#f3f3f6]">404</h1>
                    <p className="text-text-secondary font-mono text-xs">PAGE NOT FOUND</p>
                    <a href="/" className="text-xs font-mono uppercase text-[#ffd23f] hover:underline transition-colors">
                      ← Return Home
                    </a>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
    </BrowserRouter>
  );
}
